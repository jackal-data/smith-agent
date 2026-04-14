import { anthropic, MODELS, buildCachedSystemBlock } from "@/lib/anthropic";
import prisma from "@/lib/prisma";
import type { PricingRecommendation } from "@/types/agent";

const PRICING_SYSTEM_PROMPT = `You are an expert automotive pricing strategist for Smith Motors. Your job is to recommend how much over (or under) MSRP a salesperson should open negotiations based on customer interest signals and market conditions.

Respond with ONLY valid JSON matching this exact structure:
{
  "openingMarkupPercent": 3.5,
  "rationale": "2-3 sentence explanation of your reasoning",
  "confidenceLevel": "high",
  "negotiationFloor": 28500,
  "talkingPoints": [
    "Bullet point 1 for the salesperson to use",
    "Bullet point 2",
    "Bullet point 3"
  ]
}

Guidelines:
- High intent + urgency signals → open 4-6% over MSRP
- Medium intent, no urgency → open 2-4% over MSRP
- Low intent or price-sensitive signals → open at or near MSRP
- High days-on-lot (>60 days) → reduce markup by 1-2%
- Multiple competing inventory units → reduce markup by 1%
- Trade-in mentioned → factor as leverage (customer may be flexible on price)
- Negotiation floor should never be below invoice (assume invoice is ~95% of MSRP)`;

export async function getPricingRecommendation(
  sessionId: string
): Promise<PricingRecommendation> {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: {
      assignment: true,
      vehicleMentions: {
        include: { vehicle: true },
        orderBy: { mentionedAt: "desc" },
        take: 3,
      },
    },
  });

  if (!session) throw new Error("Session not found");

  const topVehicle = session.vehicleMentions[0]?.vehicle;

  // Count competing units in inventory
  const competingUnits = topVehicle
    ? await prisma.vehicle.count({
        where: {
          make: topVehicle.make,
          model: topVehicle.model,
          year: topVehicle.year,
          status: "AVAILABLE",
        },
      })
    : 0;

  const handoffData = session.assignment?.handoffPayload
    ? JSON.parse(session.assignment.handoffPayload)
    : {};

  const contextMessage = `
Customer intent score: ${session.intentScore.toFixed(2)} (0=no interest, 1=definitely buying)
Urgency signals: ${JSON.stringify(handoffData.urgencySignals || [])}
Financing mentioned: ${handoffData.financingMentioned ?? false}
Trade-in mentioned: ${handoffData.tradeInMentioned ?? false}
Message count: ${handoffData.messageCount ?? "unknown"}

Primary vehicle of interest: ${
    topVehicle
      ? `${topVehicle.year} ${topVehicle.make} ${topVehicle.model} ${topVehicle.trim || ""}
   MSRP: $${topVehicle.msrp.toLocaleString()}
   Days on lot: ${topVehicle.daysOnLot}
   Competing units in inventory: ${competingUnits}`
      : "No specific vehicle identified"
  }

Provide a pricing recommendation for this customer.`;

  const response = await anthropic.messages.create({
    model: MODELS.FAST,
    max_tokens: 512,
    system: [buildCachedSystemBlock(PRICING_SYSTEM_PROMPT)],
    messages: [{ role: "user", content: contextMessage }],
  });

  const rawText = response.content[0].type === "text" ? response.content[0].text : "{}";

  try {
    const jsonMatch = rawText.match(/```json\n?([\s\S]*?)\n?```/) || rawText.match(/(\{[\s\S]*\})/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[1] : rawText);

    // Update assignment with recommended markup
    if (session.assignment) {
      await prisma.assignment.update({
        where: { id: session.assignment.id },
        data: { recommendedMarkup: parsed.openingMarkupPercent },
      });
    }

    return parsed as PricingRecommendation;
  } catch {
    return {
      openingMarkupPercent: 2.5,
      rationale: "Default recommendation due to limited data.",
      confidenceLevel: "low",
      negotiationFloor: topVehicle ? topVehicle.msrp * 0.95 : 0,
      talkingPoints: ["Highlight vehicle features", "Ask about timeline", "Discuss financing options"],
    };
  }
}
