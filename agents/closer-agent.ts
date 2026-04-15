/**
 * Closer Agent — backend-only. Never speaks directly to customers.
 *
 * Responsibilities:
 * - Generate a structured handoff brief when a customer is ready for a human
 * - Assign the right salesperson (fewest open assignments = load balance)
 * - Create the Assignment record with full context
 * - Produce a pricing recommendation for the salesperson (opening markup, talking points)
 *
 * Merged from: handoff-agent.ts + pricing-agent.ts
 */

import { anthropic, MODELS, buildCachedSystemBlock } from "@/lib/anthropic";
import prisma from "@/lib/prisma";
import type { HandoffPayload, PricingRecommendation } from "@/types/agent";

// ─── Handoff Summary ──────────────────────────────────────────────

const HANDOFF_PROMPT = `You are an expert automotive sales analyst. Analyze a customer chat conversation and produce a concise, actionable handoff brief for a human salesperson.

Respond with ONLY valid JSON matching this exact structure:
{
  "summary": "3 paragraphs: (1) who the customer is and what brought them in, (2) vehicles they're interested in and why, (3) recommended next steps for the salesperson",
  "vehiclesOfInterest": [
    { "vin": "...", "make": "...", "model": "...", "year": 0, "msrp": 0, "sentimentScore": 0.8 }
  ],
  "financingMentioned": true,
  "tradeInMentioned": false,
  "urgencySignals": ["mentioned 'this weekend'", "asked about availability twice"],
  "recommendedNextStep": "Schedule a test drive for the 2024 Honda CR-V they asked about twice"
}

sentimentScore is 0–1 (1 = very excited). Keep urgencySignals as brief quoted phrases from the conversation.`;

export async function generateHandoffSummary(sessionId: string): Promise<HandoffPayload> {
  const session = await prisma.chatSession.findUnique({
    where:   { id: sessionId },
    include: {
      customer:       { select: { id: true, name: true, email: true } },
      messages:       { orderBy: { createdAt: "asc" }, select: { role: true, content: true, createdAt: true } },
      vehicleMentions:{ include: { vehicle: true } },
    },
  });

  if (!session) throw new Error(`Session ${sessionId} not found`);

  const transcript = session.messages
    .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const userMessage = `Analyze this conversation and produce a JSON handoff summary.

Customer: ${session.customer.name || session.customer.email}
Session started: ${session.createdAt.toISOString()}
Intent score: ${session.intentScore.toFixed(2)}
Active agent at handoff: ${session.currentAgent}
Message count: ${session.messages.length}

CONVERSATION:
${transcript}

Vehicles in DB: ${JSON.stringify(
    session.vehicleMentions.map((vm) => ({
      vin:   vm.vehicle.vin,
      make:  vm.vehicle.make,
      model: vm.vehicle.model,
      year:  vm.vehicle.year,
      msrp:  vm.vehicle.msrp,
    }))
  )}`;

  const response = await anthropic.messages.create({
    model:      MODELS.SMART,
    max_tokens: 1024,
    system:     [buildCachedSystemBlock(HANDOFF_PROMPT)],
    messages:   [{ role: "user", content: userMessage }],
  });

  const rawText = response.content[0].type === "text" ? response.content[0].text : "{}";

  let parsed: {
    summary:             string;
    vehiclesOfInterest:  HandoffPayload["vehiclesOfInterest"];
    financingMentioned:  boolean;
    tradeInMentioned:    boolean;
    urgencySignals:      string[];
    recommendedNextStep: string;
  };

  try {
    const match = rawText.match(/```json\n?([\s\S]*?)\n?```/) || rawText.match(/(\{[\s\S]*\})/);
    parsed = JSON.parse(match ? match[1] : rawText);
  } catch {
    parsed = {
      summary:             rawText,
      vehiclesOfInterest:  [],
      financingMentioned:  false,
      tradeInMentioned:    false,
      urgencySignals:      [],
      recommendedNextStep: "Follow up with customer",
    };
  }

  const sessionDurationMinutes = Math.round(
    (Date.now() - new Date(session.createdAt).getTime()) / 60000
  );

  const payload: HandoffPayload = {
    sessionId,
    customerId:          session.customer.id,
    summary:             parsed.summary,
    intentScore:         session.intentScore,
    vehiclesOfInterest:  parsed.vehiclesOfInterest || [],
    financingMentioned:  parsed.financingMentioned  || false,
    tradeInMentioned:    parsed.tradeInMentioned    || false,
    urgencySignals:      parsed.urgencySignals      || [],
    messageCount:        session.messages.length,
    sessionDurationMinutes,
  };

  await prisma.chatSession.update({
    where: { id: sessionId },
    data:  { summary: parsed.summary },
  });

  return payload;
}

// ─── Salesperson Assignment ───────────────────────────────────────

/** Load-balance: pick the salesperson with fewest open assignments */
export async function assignSalesperson(payload: HandoffPayload): Promise<string> {
  const salespersons = await prisma.user.findMany({
    where:   { role: "SALESPERSON" },
    include: {
      managedBy: {
        where: { status: { in: ["PENDING", "ACKNOWLEDGED", "IN_PROGRESS"] } },
      },
    },
  });

  if (salespersons.length === 0) throw new Error("No salespersons available");

  salespersons.sort((a, b) => a.managedBy.length - b.managedBy.length);
  return salespersons[0].id;
}

export async function createAssignment(
  payload: HandoffPayload,
  salespersonId: string
): Promise<string> {
  const assignment = await prisma.assignment.create({
    data: {
      sessionId:      payload.sessionId,
      customerId:     payload.customerId,
      salespersonId,
      summary:        payload.summary,
      intentScore:    payload.intentScore,
      handoffPayload: JSON.stringify(payload),
      status:         "PENDING",
    },
  });

  await prisma.conversionEvent.create({
    data: {
      sessionId:  payload.sessionId,
      customerId: payload.customerId,
      eventType:  "handoff",
      metadata:   JSON.stringify({ salespersonId, intentScore: payload.intentScore }),
    },
  });

  return assignment.id;
}

// ─── Pricing Recommendation ───────────────────────────────────────

const PRICING_PROMPT = `You are an expert automotive pricing strategist for Smith Motors. Recommend how much over (or under) MSRP a salesperson should open negotiations.

Respond with ONLY valid JSON:
{
  "openingMarkupPercent": 3.5,
  "rationale": "2-3 sentence explanation",
  "confidenceLevel": "high",
  "negotiationFloor": 28500,
  "talkingPoints": ["Point 1", "Point 2", "Point 3"]
}

Guidelines:
- High intent + urgency signals → 4–6% over MSRP
- Medium intent, no urgency    → 2–4% over MSRP
- Low intent or price-sensitive → at or near MSRP
- daysOnLot > 60               → reduce markup 1–2%
- Multiple competing units     → reduce markup 1%
- Trade-in mentioned           → customer may be flexible (leverage)
- Negotiation floor ≥ 95% of MSRP (assume invoice ≈ 95% MSRP)`;

export async function getPricingRecommendation(sessionId: string): Promise<PricingRecommendation> {
  const session = await prisma.chatSession.findUnique({
    where:   { id: sessionId },
    include: {
      assignment:      true,
      vehicleMentions: {
        include:  { vehicle: true },
        orderBy:  { mentionedAt: "desc" },
        take:     3,
      },
    },
  });

  if (!session) throw new Error("Session not found");

  const topVehicle = session.vehicleMentions[0]?.vehicle;
  const competingUnits = topVehicle
    ? await prisma.vehicle.count({
        where: { make: topVehicle.make, model: topVehicle.model, year: topVehicle.year, status: "AVAILABLE" },
      })
    : 0;

  const handoffData = session.assignment?.handoffPayload
    ? JSON.parse(session.assignment.handoffPayload)
    : {};

  const contextMessage = `
Customer intent score: ${session.intentScore.toFixed(2)}
Urgency signals: ${JSON.stringify(handoffData.urgencySignals || [])}
Financing mentioned: ${handoffData.financingMentioned ?? false}
Trade-in mentioned: ${handoffData.tradeInMentioned ?? false}
Messages exchanged: ${handoffData.messageCount ?? "unknown"}
Agent path: ${session.currentAgent}

Primary vehicle of interest: ${
    topVehicle
      ? `${topVehicle.year} ${topVehicle.make} ${topVehicle.model} ${topVehicle.trim ?? ""}
   MSRP: $${topVehicle.msrp.toLocaleString()}
   Days on lot: ${topVehicle.daysOnLot}
   Competing units in inventory: ${competingUnits}`
      : "No specific vehicle identified"
  }`;

  const response = await anthropic.messages.create({
    model:      MODELS.FAST,
    max_tokens: 512,
    system:     [buildCachedSystemBlock(PRICING_PROMPT)],
    messages:   [{ role: "user", content: contextMessage }],
  });

  const rawText = response.content[0].type === "text" ? response.content[0].text : "{}";

  try {
    const match = rawText.match(/```json\n?([\s\S]*?)\n?```/) || rawText.match(/(\{[\s\S]*\})/);
    const parsed = JSON.parse(match ? match[1] : rawText);

    if (session.assignment) {
      await prisma.assignment.update({
        where: { id: session.assignment.id },
        data:  { recommendedMarkup: parsed.openingMarkupPercent },
      });
    }

    return parsed as PricingRecommendation;
  } catch {
    return {
      openingMarkupPercent: 2.5,
      rationale:            "Default recommendation due to limited data.",
      confidenceLevel:      "low",
      negotiationFloor:     topVehicle ? topVehicle.msrp * 0.95 : 0,
      talkingPoints:        ["Highlight key features", "Ask about timeline", "Explore financing options"],
    };
  }
}
