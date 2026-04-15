/**
 * Agent Orchestrator — routes each customer message to the right agent.
 *
 * Routing is pre-message and deterministic:
 *   SCOUT     → default for the first few low-intent messages
 *   CONCIERGE → inventory/vehicle intent detected, or intent score rises
 *   FINANCE   → financing/payment keywords detected (from any state)
 *
 * Once in CONCIERGE the session stays there unless a finance query arrives.
 * FINANCE routes back to CONCIERGE when the message has no finance keywords.
 *
 * The Closer Agent is backend-only — it never participates in the customer loop.
 */

import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/prisma";
import { runScoutAgent }     from "./scout-agent";
import { runConciergeAgent } from "./concierge-agent";
import { runFinanceAgent }   from "./finance-agent";
import type { AgentStreamEvent, AgentType } from "@/types/agent";

// ─── Keyword matchers ──────────────────────────────────────────────

const FINANCE_RE = /\b(financ|loan|payment|apr|interest rate|pre[\s-]?approv|credit score|credit tier|down payment|monthly|afford|borrow|lend|lender|dti|income|debt|qualify|qualification)\b/i;

const INVENTORY_RE = /\b(suv|sedan|truck|pickup|coupe|hatchback|minivan|crossover|ev|hybrid|electric|awd|4wd|4x4|all.wheel|horsepower|mpg|towing|cargo|make|model|ford|honda|toyota|nissan|tesla|bmw|hyundai|kia|jeep|chevy|chevrolet|subaru|porsche|show me|find|search|available|in stock|inventory|test drive|schedule|appointment|looking for|interested in|recommend|suggestion|what do you have|what.*have)\b/i;

// ─── Agent resolver ────────────────────────────────────────────────

function resolveAgent(
  current: AgentType,
  intentScore: number,
  messageCount: number,
  message: string,
): AgentType {
  const isFinance   = FINANCE_RE.test(message);
  const isInventory = INVENTORY_RE.test(message);

  // Finance queries always route to Finance Agent, regardless of current state
  if (isFinance) return "FINANCE";

  // Finance → Concierge when message has no finance content
  if (current === "FINANCE") return "CONCIERGE";

  // Concierge stays Concierge
  if (current === "CONCIERGE") return "CONCIERGE";

  // Scout → Concierge when inventory intent is clear
  if (current === "SCOUT" && isInventory) return "CONCIERGE";

  // Scout → Concierge once intent starts building or after a few exchanges
  if (current === "SCOUT" && (intentScore > 0.3 || messageCount > 4)) return "CONCIERGE";

  // Stay on Scout
  return "SCOUT";
}

// ─── Main export ───────────────────────────────────────────────────

export async function* runOrchestrator(
  sessionId:      string,
  customerId:     string,
  message:        string,
  messageHistory: Anthropic.MessageParam[]
): AsyncGenerator<AgentStreamEvent> {
  // Load current session state
  const session = await prisma.chatSession.findUnique({
    where:   { id: sessionId },
    select: {
      currentAgent: true,
      intentScore:  true,
      messages:     { select: { id: true } },
    },
  });

  const currentAgent  = (session?.currentAgent ?? "SCOUT") as AgentType;
  const intentScore   = session?.intentScore   ?? 0;
  const messageCount  = session?.messages.length ?? 0;

  const targetAgent = resolveAgent(currentAgent, intentScore, messageCount, message);

  // Persist the transition if the agent changed
  if (targetAgent !== currentAgent) {
    await prisma.chatSession.update({
      where: { id: sessionId },
      data:  { currentAgent: targetAgent },
    });

    yield {
      type:      "agent_transition",
      fromAgent: currentAgent,
      toAgent:   targetAgent,
    };
  }

  // Dispatch to the appropriate agent
  switch (targetAgent) {
    case "SCOUT":
      yield* runScoutAgent(sessionId, customerId, message, messageHistory);
      break;
    case "CONCIERGE":
      yield* runConciergeAgent(sessionId, customerId, message, messageHistory);
      break;
    case "FINANCE":
      yield* runFinanceAgent(sessionId, customerId, message, messageHistory);
      break;
  }
}
