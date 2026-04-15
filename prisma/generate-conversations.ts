/**
 * generate-conversations.ts
 *
 * Claude-powered synthetic conversation generator for Smith Motors.
 * For each persona scenario it asks Claude to write a realistic customer/agent
 * chat, then inserts the result into the database as ChatSession + Message records,
 * with correct intentDelta values computed from the real intent-detector logic.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/generate-conversations.ts
 *
 * Options (env vars):
 *   CONVO_COUNT=20   Number of conversations to generate (default: 20)
 *   DRY_RUN=true     Print conversations to stdout without writing to DB
 */

import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma  = new PrismaClient();
const client  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL   = "claude-sonnet-4-6";

const CONVO_COUNT = parseInt(process.env.CONVO_COUNT ?? "20", 10);
const DRY_RUN     = process.env.DRY_RUN === "true";

// ─── Intent scoring (mirrors lib/intent-detector.ts) ─────────────

const INTENT_SIGNALS = [
  { pattern: /\b(buy|purchase|get|take|want)\b.{0,20}\b(car|vehicle|this|it)\b/i, weight: 0.15 },
  { pattern: /\bhow much.{0,30}(finance|monthly|payment|down|deposit)/i,           weight: 0.12 },
  { pattern: /\b(trade.?in|trade\s+my|sell\s+my)\b/i,                              weight: 0.10 },
  { pattern: /\b(test\s*drive|come\s+in|visit|appointment|schedule)\b/i,           weight: 0.12 },
  { pattern: /\b(this\s+week|today|tomorrow|weekend|asap|soon|right\s+away)\b/i,   weight: 0.10 },
  { pattern: /\bavailability|is\s+it\s+available|still\s+available|in\s+stock\b/i, weight: 0.08 },
  { pattern: /\b(color|trim|feature|option|package|upgrade)\b/i,                   weight: 0.05 },
  { pattern: /\bcompare|vs\.|versus|difference\s+between\b/i,                      weight: 0.04 },
  { pattern: /\b(vin|vehicle\s+identification)\b/i,                                weight: 0.06 },
  { pattern: /\bwarranty|guarantee|coverage\b/i,                                   weight: 0.04 },
  { pattern: /\bprice|cost|how\s+much|msrp\b/i,                                    weight: 0.03 },
  { pattern: /\bmileage|mpg|fuel|gas\b/i,                                          weight: 0.02 },
];

function scoreMessage(content: string): number {
  let score = 0;
  for (const s of INTENT_SIGNALS) {
    if (s.pattern.test(content)) score += s.weight;
  }
  return Math.min(score, 0.3);
}

function computeSessionIntent(deltas: number[]): number {
  if (deltas.length === 0) return 0;
  return Math.min(
    deltas.reduce((acc, d, i) => acc + d * Math.pow(0.85, i), 0),
    1.0,
  );
}

const HANDOFF_THRESHOLD = 0.72;

// ─── Scenario definitions ──────────────────────────────────────────

interface Scenario {
  label: string;
  targetOutcome: "ACTIVE" | "HANDED_OFF" | "CLOSED";
  systemHint: string; // guidance injected into the generation prompt
}

const SCENARIOS: Scenario[] = [
  {
    label: "high_intent_urgent",
    targetOutcome: "HANDED_OFF",
    systemHint:
      "The customer mentions they need a car before the end of the month, asks about financing, and eventually asks to speak with a salesperson. 10–14 turns. Intent should clearly cross the handoff threshold.",
  },
  {
    label: "family_suv_shopper",
    targetOutcome: "HANDED_OFF",
    systemHint:
      "A parent of three looking for a 3-row SUV with good safety ratings. Asks about specific features, compares two models, then books a test drive. 10–12 turns.",
  },
  {
    label: "ev_curious_researcher",
    targetOutcome: "ACTIVE",
    systemHint:
      "Curious about electric vehicles but not ready to buy. Asks range questions, charging, and financing. No urgency. Ends without requesting a handoff. 6–8 turns.",
  },
  {
    label: "truck_tow_package",
    targetOutcome: "HANDED_OFF",
    systemHint:
      "A contractor who needs a truck with a heavy-duty tow package. Very specific about payload capacity and bed size. Asks about availability and wants to come in this weekend. 8–12 turns.",
  },
  {
    label: "first_time_buyer",
    targetOutcome: "HANDED_OFF",
    systemHint:
      "A 23-year-old buying their first car. Nervous about financing and budget. Asks lots of basic questions. Eventually gets comfortable and wants to schedule a visit. 12–16 turns.",
  },
  {
    label: "luxury_upgrade",
    targetOutcome: "HANDED_OFF",
    systemHint:
      "An executive trading in a 3-year-old BMW for a newer model. Very specific about features (massage seats, night vision). Asks about trade-in value. 8–10 turns.",
  },
  {
    label: "budget_browser",
    targetOutcome: "ACTIVE",
    systemHint:
      "Someone on a tight budget browsing under $20k. Asks about reliability and fuel economy. Isn't ready to commit. 6–8 turns.",
  },
  {
    label: "fleet_purchase",
    targetOutcome: "HANDED_OFF",
    systemHint:
      "A small business owner looking to buy 3 trucks for their landscaping crew. Asks about fleet pricing, fleet maintenance, and corporate financing. Wants to speak with a fleet manager. 8–12 turns.",
  },
  {
    label: "trade_in_focused",
    targetOutcome: "HANDED_OFF",
    systemHint:
      "Customer is primarily focused on getting the best trade-in value for their current vehicle. Asks multiple questions about valuation process, then decides to come in. 8–10 turns.",
  },
  {
    label: "financing_deep_dive",
    targetOutcome: "HANDED_OFF",
    systemHint:
      "Customer has fair credit and is worried about APR. Asks detailed financing questions for multiple term lengths, mentions a co-signer, and eventually wants to speak with the finance team. 10–14 turns.",
  },
];

// ─── Vehicle row type ─────────────────────────────────────────────

interface VehicleRow {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  trim: string | null;
  color: string | null;
  msrp: number;
  features: string;
  daysOnLot: number;
}

// ─── Generation prompt ────────────────────────────────────────────

function buildGenerationPrompt(scenario: Scenario, vehicle: VehicleRow): string {
  return `You are generating a realistic synthetic customer service conversation for a car dealership AI system called Smith Motors.

The conversation is between:
- CUSTOMER: A real person shopping for a car
- AGENT: Alex, the AI sales assistant for Smith Motors (friendly, knowledgeable, never pushy)

Scenario: ${scenario.label}
Guidance: ${scenario.systemHint}

The customer is primarily interested in this vehicle from our inventory:
  ${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim ?? ""}
  Color: ${vehicle.color}
  MSRP: $${vehicle.msrp.toLocaleString()}
  Features: ${JSON.parse(vehicle.features).join(", ")}
  Days on lot: ${vehicle.daysOnLot}

Rules:
- Write ONLY the conversation, no commentary or metadata
- Alternate turns starting with CUSTOMER
- Each turn is on its own line prefixed with "CUSTOMER:" or "AGENT:"
- Use natural language — contractions, occasional typos, real concerns
- The AGENT should reference specific vehicle details (price, features) naturally
- Do NOT include any JSON, tool calls, or system messages
- End the conversation naturally (customer says thanks/bye, or explicitly escalates)

Write the conversation now:`;
}

// ─── DB helpers ───────────────────────────────────────────────────

async function getRandomVehicle(): Promise<VehicleRow> {
  const count = await prisma.vehicle.count({ where: { status: "AVAILABLE" } });
  const skip  = Math.floor(Math.random() * count);
  const v = await prisma.vehicle.findFirst({ where: { status: "AVAILABLE" }, skip });
  if (!v) throw new Error("No available vehicles in inventory — run seed first");
  return v;
}

async function getOrCreateCustomer(index: number): Promise<string> {
  const email = `synth-customer-${String(index).padStart(3, "0")}@example.com`;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing.id;

  const firstNames = ["Jamie","Taylor","Morgan","Casey","Jordan","Riley","Avery","Quinn","Skyler","Alex","Sam","Drew","Cameron","Blake","Reese"];
  const lastNames  = ["Nguyen","Patel","Rivera","Thompson","Anderson","Martinez","Wilson","Moore","Jackson","Lee","White","Harris","Martin","Clark","Lewis"];
  const name = `${firstNames[index % firstNames.length]} ${lastNames[Math.floor(index / firstNames.length) % lastNames.length]}`;

  const pw = await bcrypt.hash("customer123", 10);
  const user = await prisma.user.create({
    data: { email, name, password: pw, role: "CUSTOMER" },
  });
  return user.id;
}

async function getAnySalespersonId(): Promise<string> {
  const sp = await prisma.user.findFirst({ where: { role: "SALESPERSON" } });
  if (!sp) throw new Error("No salespersons found — run seed first");
  return sp.id;
}

// ─── Parse Claude's response into turn array ──────────────────────

interface Turn { role: "USER" | "ASSISTANT"; content: string }

function parseConversation(raw: string): Turn[] {
  const turns: Turn[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("CUSTOMER:")) {
      turns.push({ role: "USER",      content: trimmed.slice("CUSTOMER:".length).trim() });
    } else if (trimmed.startsWith("AGENT:")) {
      turns.push({ role: "ASSISTANT", content: trimmed.slice("AGENT:".length).trim() });
    }
    // ignore blank lines / commentary
  }
  return turns.filter((t) => t.content.length > 0);
}

// ─── Detect whether conversation ended in handoff ─────────────────

const HANDOFF_PHRASES = [
  /speak (with|to) (a |an )?(human|person|salesperson|someone|agent)/i,
  /connect me with/i,
  /talk to (a |an )?(real|human|actual)/i,
  /transfer (me|this)/i,
  /get (a |an )?(salesperson|advisor|rep)/i,
  /come in (this|for a)/i,
  /book (a |an )?(appointment|test drive)/i,
  /schedule (a |an )?(test drive|appointment|visit)/i,
];

function detectHandoff(turns: Turn[]): boolean {
  return turns.some(
    (t) => t.role === "USER" && HANDOFF_PHRASES.some((p) => p.test(t.content)),
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

function extractUrgencySignals(turns: Turn[]): string[] {
  const signals: string[] = [];
  const patterns = [
    /this\s+(week|weekend)/i,
    /by\s+(end\s+of\s+(the\s+)?month|friday|saturday|sunday)/i,
    /need(s)?\s+(it\s+)?(asap|soon|quickly|right away)/i,
    /today|tomorrow/i,
    /before\s+(the\s+)?(holidays|weekend|end\s+of\s+month)/i,
  ];
  for (const t of turns) {
    if (t.role !== "USER") continue;
    for (const p of patterns) {
      const m = t.content.match(p);
      if (m) signals.push(`"${m[0]}"`);
    }
  }
  return [...new Set(signals)].slice(0, 3);
}

function randomFloat(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 10) / 10;
}

function turnOffset(): number {
  return 60000 + Math.floor(Math.random() * 120000); // 1–3 min between turns
}

// ─── Core: generate one conversation and write to DB ──────────────

async function generateOne(scenarioIndex: number, globalIndex: number): Promise<void> {
  const scenario = SCENARIOS[scenarioIndex % SCENARIOS.length];
  const vehicle  = await getRandomVehicle();

  console.log(`  [${globalIndex + 1}/${CONVO_COUNT}] Generating "${scenario.label}" about ${vehicle.year} ${vehicle.make} ${vehicle.model}...`);

  const prompt = buildGenerationPrompt(scenario, vehicle);

  const response = await client.messages.create({
    model:      MODEL,
    max_tokens: 2048,
    system: [{
      type: "text",
      text: "You are a dataset generator for an automotive AI system. Generate realistic, natural-sounding conversations exactly as instructed. Output ONLY the conversation lines.",
      cache_control: { type: "ephemeral" },
    }],
    messages: [{ role: "user", content: prompt }],
  });

  const rawText = response.content[0].type === "text" ? response.content[0].text : "";
  const turns   = parseConversation(rawText);

  if (turns.length < 4) {
    console.warn(`    ⚠ Only ${turns.length} turns parsed — skipping`);
    return;
  }

  if (DRY_RUN) {
    console.log("\n--- DRY RUN OUTPUT ---");
    for (const t of turns) console.log(`${t.role}: ${t.content}`);
    console.log("----------------------\n");
    return;
  }

  // ── Compute intent ────────────────────────────────────────────
  const userTurns    = turns.filter((t) => t.role === "USER");
  const intentDeltas = userTurns.map((t) => scoreMessage(t.content));
  const finalIntent  = computeSessionIntent(intentDeltas);
  const wasHandedOff = detectHandoff(turns) || finalIntent >= HANDOFF_THRESHOLD;

  const status = wasHandedOff
    ? "HANDED_OFF"
    : scenario.targetOutcome === "ACTIVE" ? "ACTIVE" : "CLOSED";

  const sessionStart = new Date(Date.now() - Math.random() * 60 * 86400000);
  const customerId   = await getOrCreateCustomer(globalIndex);

  // ── ChatSession ───────────────────────────────────────────────
  const session = await prisma.chatSession.create({
    data: {
      customerId,
      status,
      intentScore:      finalIntent,
      handoffTriggered: wasHandedOff,
      handoffAt:        wasHandedOff ? new Date(sessionStart.getTime() + turns.length * 90000) : undefined,
      createdAt:        sessionStart,
      updatedAt:        new Date(sessionStart.getTime() + turns.length * 90000),
      summary: wasHandedOff
        ? `Customer discussed the ${vehicle.year} ${vehicle.make} ${vehicle.model}. Intent score: ${finalIntent.toFixed(2)}. Generated conversation — see messages for full context.`
        : undefined,
    },
  });

  // ── Messages ──────────────────────────────────────────────────
  let userTurnIdx = 0;
  for (let i = 0; i < turns.length; i++) {
    const turn      = turns[i];
    const createdAt = new Date(sessionStart.getTime() + i * turnOffset());
    const delta     = turn.role === "USER" ? intentDeltas[userTurnIdx++] : undefined;

    await prisma.message.create({
      data: { sessionId: session.id, role: turn.role, content: turn.content, intentDelta: delta, createdAt },
    });
  }

  // ── Vehicle mention ───────────────────────────────────────────
  await prisma.chatVehicleMention.create({
    data: { sessionId: session.id, vehicleId: vehicle.id, mentionedAt: sessionStart, sentiment: Math.min(0.3 + finalIntent, 1.0) },
  });

  // ── ConversionEvent: chat_started ────────────────────────────
  await prisma.conversionEvent.create({
    data: { sessionId: session.id, customerId, eventType: "chat_started", metadata: JSON.stringify({ make: vehicle.make, model: vehicle.model, scenario: scenario.label }), occurredAt: sessionStart },
  });

  // ── Assignment (if handed off) ────────────────────────────────
  if (wasHandedOff) {
    const salespersonId = await getAnySalespersonId();
    const handoffAt     = new Date(sessionStart.getTime() + turns.length * 90000);

    const handoffPayload = {
      sessionId:     session.id,
      customerId,
      summary:       session.summary ?? "",
      intentScore:   finalIntent,
      vehiclesOfInterest: [{
        vin:            vehicle.vin,
        make:           vehicle.make,
        model:          vehicle.model,
        year:           vehicle.year,
        msrp:           vehicle.msrp,
        sentimentScore: Math.min(0.3 + finalIntent, 1.0),
      }],
      financingMentioned: turns.some((t) => /financ|monthly|payment|down payment/i.test(t.content)),
      tradeInMentioned:   turns.some((t) => /trade.?in|sell\s+my/i.test(t.content)),
      urgencySignals:     extractUrgencySignals(turns),
      recommendedNextStep: `Schedule a test drive for the ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      messageCount:       turns.length,
      sessionDurationMinutes: Math.round(turns.length * 1.5),
    };

    await prisma.assignment.create({
      data: {
        sessionId:      session.id,
        customerId,
        salespersonId,
        summary:        session.summary ?? "",
        intentScore:    finalIntent,
        recommendedMarkup: finalIntent > 0.85 ? randomFloat(4.0, 6.0)
                         : finalIntent > 0.72 ? randomFloat(2.0, 4.0)
                         : randomFloat(0.0, 2.0),
        status:         "PENDING",
        handoffPayload: JSON.stringify(handoffPayload),
        createdAt:      handoffAt,
        updatedAt:      handoffAt,
      },
    });

    await prisma.conversionEvent.create({
      data: { sessionId: session.id, customerId, eventType: "handoff", metadata: JSON.stringify({ salespersonId, intentScore: finalIntent, scenario: scenario.label }), occurredAt: handoffAt },
    });
  }

  console.log(`    ✓ ${turns.length} turns, intentScore=${finalIntent.toFixed(2)}, status=${status}`);
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY is not set in environment.");
    process.exit(1);
  }

  console.log(`\nGenerating ${CONVO_COUNT} synthetic conversations (DRY_RUN=${DRY_RUN})...\n`);

  for (let i = 0; i < CONVO_COUNT; i++) {
    try {
      await generateOne(i, i);
    } catch (err) {
      console.error(`  ✗ Failed on conversation ${i + 1}:`, err);
    }
    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 500));
  }

  const sessionCount = await prisma.chatSession.count();
  const messageCount = await prisma.message.count();
  console.log(`\nDone! Database now has ${sessionCount} sessions and ${messageCount} messages.`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
