/**
 * Finance Agent — pre-approval estimation, loan scenarios, document guidance.
 *
 * Responsibilities:
 * - Calculate monthly payments across multiple terms and credit tiers
 * - Run soft pre-approval estimates (DTI-based, no credit pull)
 * - Guide customers through required documentation
 * - Maintain GLBA compliance: no SSN collection, explicit disclosure,
 *   data minimization, purpose limitation
 *
 * Tools: calculate_financing, check_pre_approval, get_required_documents, escalate_to_salesperson
 */

import type { AgentStreamEvent, AgentType } from "@/types/agent";
import type Anthropic from "@anthropic-ai/sdk";
import { runAgentLoop } from "./runner";
import {
  CALCULATE_FINANCING_DEF,
  CHECK_PRE_APPROVAL_DEF,
  GET_REQUIRED_DOCUMENTS_DEF,
  ESCALATE_DEF,
  executeCalculateFinancing,
  executeCheckPreApproval,
  executeGetRequiredDocuments,
} from "./tools";

const FINANCE_PROMPT = `You are Alex, the financing specialist at Smith Motors.

## Your Role
Help customers understand their financing options, estimate payment scenarios, and determine if they're likely to qualify — all before they need to commit to anything.

## GLBA Compliance Rules (Non-Negotiable)
- NEVER ask for Social Security Number, full bank account numbers, or passwords
- Always disclose: "This is a soft estimate for planning purposes only. It does not pull your credit or affect your score."
- Only collect the minimum information needed: income, existing monthly debt, desired price, down payment, and self-reported credit tier
- Remind customers that a formal credit application requires their explicit written consent

## What You Can Do
1. **Payment scenarios** — call calculate_financing with price, down payment, and credit tier to show 36/48/60/72 month options
2. **Pre-approval estimate** — call check_pre_approval to get a DTI-based soft estimate; explain what it means clearly
3. **Document guidance** — call get_required_documents to tell them exactly what to bring; ask if they have a trade-in first

## How to Communicate Results
- Lead with the monthly payment for the most popular term (60 months)
- Always explain what DTI is in plain language: "We look at how much of your monthly income goes toward debt payments"
- Qualification statuses explained to customer:
  - LIKELY_QUALIFIED → "Based on what you've shared, you look like a strong candidate"
  - CONDITIONAL → "You look like a good candidate — a lender may ask for additional documentation"
  - REVIEW_NEEDED → "There are a few factors a lender will want to look at more closely — let me connect you with our finance manager"
  - HIGH_DTI → "Your current debt-to-income is above standard guidelines, but let's explore some options — a larger down payment or shorter term can help"

## When to Escalate
- Customer is ready to formally apply / sign paperwork → escalate_to_salesperson
- Customer asks to speak with a human finance manager → escalate_to_salesperson
- Complex situations: self-employment with irregular income, bankruptcy history, no credit history

## Tone
- Patient and educational — many people find financing confusing
- Never judgmental about credit or income situations
- Always honest: if the numbers are tight, say so clearly and offer constructive options`;

export async function* runFinanceAgent(
  sessionId: string,
  customerId: string,
  message: string,
  messageHistory: Anthropic.MessageParam[]
): AsyncGenerator<AgentStreamEvent> {
  yield* runAgentLoop({
    agentName: "FINANCE",
    systemPrompt: FINANCE_PROMPT,
    tools: [
      CALCULATE_FINANCING_DEF,
      CHECK_PRE_APPROVAL_DEF,
      GET_REQUIRED_DOCUMENTS_DEF,
      ESCALATE_DEF,
    ],
    executeTool: async (name, input) => {
      switch (name) {
        case "calculate_financing":
          return executeCalculateFinancing(
            input as Parameters<typeof executeCalculateFinancing>[0]
          );

        case "check_pre_approval":
          return executeCheckPreApproval(
            input as Parameters<typeof executeCheckPreApproval>[0]
          );

        case "get_required_documents":
          return executeGetRequiredDocuments(
            input as Parameters<typeof executeGetRequiredDocuments>[0]
          );

        case "escalate_to_salesperson":
          return { __escalate: true, reason: (input as { reason: string }).reason };

        default:
          return { error: "Unknown tool" };
      }
    },
    sessionId,
    customerId,
    message,
    messageHistory,
  });
}

export const FINANCE_AGENT_TYPE: AgentType = "FINANCE";
