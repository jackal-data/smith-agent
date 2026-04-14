import { anthropic, MODELS, buildCachedSystemBlock } from "@/lib/anthropic";
import prisma from "@/lib/prisma";
import type { HandoffPayload } from "@/types/agent";

const HANDOFF_SYSTEM_PROMPT = `You are an expert automotive sales analyst. Your job is to analyze a customer chat conversation and produce a concise, actionable handoff summary for a human salesperson.

You must respond with ONLY valid JSON matching this exact structure:
{
  "summary": "3 paragraphs: (1) who the customer is and what brought them in, (2) what vehicles they're interested in and why, (3) recommended next steps for the salesperson",
  "vehiclesOfInterest": [
    { "vin": "...", "make": "...", "model": "...", "year": 0, "msrp": 0, "sentimentScore": 0.8 }
  ],
  "financingMentioned": true,
  "tradeInMentioned": false,
  "urgencySignals": ["mentioned 'this weekend'", "asked about availability twice"],
  "recommendedNextStep": "Schedule a test drive for the 2024 Honda CR-V they asked about twice"
}

SentimentScore is 0–1 (1 = very positive/excited about that vehicle).
Keep urgencySignals as brief quoted phrases from the conversation.`;

export async function generateHandoffSummary(
  sessionId: string
): Promise<HandoffPayload> {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: { role: true, content: true, createdAt: true },
      },
      vehicleMentions: {
        include: { vehicle: true },
      },
    },
  });

  if (!session) throw new Error(`Session ${sessionId} not found`);

  const conversationText = session.messages
    .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const userMessage = `Analyze this customer conversation and produce a JSON handoff summary.

Customer: ${session.customer.name || session.customer.email}
Session started: ${session.createdAt.toISOString()}
Intent score: ${session.intentScore.toFixed(2)}
Message count: ${session.messages.length}

CONVERSATION:
${conversationText}

Vehicles mentioned in DB: ${JSON.stringify(
    session.vehicleMentions.map((vm) => ({
      vin: vm.vehicle.vin,
      make: vm.vehicle.make,
      model: vm.vehicle.model,
      year: vm.vehicle.year,
      msrp: vm.vehicle.msrp,
    }))
  )}`;

  const response = await anthropic.messages.create({
    model: MODELS.SMART,
    max_tokens: 1024,
    system: [buildCachedSystemBlock(HANDOFF_SYSTEM_PROMPT)],
    messages: [{ role: "user", content: userMessage }],
  });

  const rawText = response.content[0].type === "text" ? response.content[0].text : "{}";

  let parsed: {
    summary: string;
    vehiclesOfInterest: HandoffPayload["vehiclesOfInterest"];
    financingMentioned: boolean;
    tradeInMentioned: boolean;
    urgencySignals: string[];
    recommendedNextStep: string;
  };

  try {
    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = rawText.match(/```json\n?([\s\S]*?)\n?```/) || rawText.match(/(\{[\s\S]*\})/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[1] : rawText);
  } catch {
    parsed = {
      summary: rawText,
      vehiclesOfInterest: [],
      financingMentioned: false,
      tradeInMentioned: false,
      urgencySignals: [],
      recommendedNextStep: "Follow up with customer",
    };
  }

  const sessionDurationMinutes = Math.round(
    (Date.now() - new Date(session.createdAt).getTime()) / 60000
  );

  const payload: HandoffPayload = {
    sessionId,
    customerId: session.customer.id,
    summary: parsed.summary,
    intentScore: session.intentScore,
    vehiclesOfInterest: parsed.vehiclesOfInterest || [],
    financingMentioned: parsed.financingMentioned || false,
    tradeInMentioned: parsed.tradeInMentioned || false,
    urgencySignals: parsed.urgencySignals || [],
    messageCount: session.messages.length,
    sessionDurationMinutes,
  };

  // Update session with summary
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { summary: parsed.summary },
  });

  return payload;
}

// Assign the salesperson with the fewest open assignments
export async function assignSalesperson(payload: HandoffPayload): Promise<string> {
  const salespersons = await prisma.user.findMany({
    where: { role: "SALESPERSON" },
    include: {
      managedBy: {
        where: { status: { in: ["PENDING", "ACKNOWLEDGED", "IN_PROGRESS"] } },
      },
    },
  });

  if (salespersons.length === 0) {
    throw new Error("No salespersons available");
  }

  // Load-balance: pick the one with fewest active assignments
  salespersons.sort((a, b) => a.managedBy.length - b.managedBy.length);
  return salespersons[0].id;
}

export async function createAssignment(
  payload: HandoffPayload,
  salespersonId: string
): Promise<string> {
  const assignment = await prisma.assignment.create({
    data: {
      sessionId: payload.sessionId,
      customerId: payload.customerId,
      salespersonId,
      summary: payload.summary,
      intentScore: payload.intentScore,
      handoffPayload: JSON.stringify(payload),
      status: "PENDING",
    },
  });

  // Track conversion event
  await prisma.conversionEvent.create({
    data: {
      sessionId: payload.sessionId,
      customerId: payload.customerId,
      eventType: "handoff",
      metadata: JSON.stringify({ salespersonId, intentScore: payload.intentScore }),
    },
  });

  return assignment.id;
}
