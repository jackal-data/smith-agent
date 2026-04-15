/**
 * Concierge Agent — inventory matching, test drive scheduling, personalized recommendations.
 *
 * Responsibilities:
 * - Search live inventory and surface the right vehicles for each customer
 * - Schedule test drives and appointments
 * - Subtly promote aged inventory (≥60 days on lot) via manager specials
 * - Escalate to salesperson when buying signals are strong
 *
 * Tools: search_inventory, get_vehicle_detail, check_availability, book_appointment, escalate_to_salesperson
 */

import prisma from "@/lib/prisma";
import type { AgentStreamEvent, AgentType } from "@/types/agent";
import type Anthropic from "@anthropic-ai/sdk";
import { runAgentLoop } from "./runner";
import {
  SEARCH_INVENTORY_DEF,
  GET_VEHICLE_DETAIL_DEF,
  CHECK_AVAILABILITY_DEF,
  BOOK_APPOINTMENT_DEF,
  ESCALATE_DEF,
  executeSearchInventory,
  executeGetVehicleDetail,
  executeCheckAvailability,
  executeBookAppointment,
} from "./tools";

const CONCIERGE_PROMPT = `You are Alex, an expert vehicle concierge at Smith Motors.

## CRITICAL — Inventory-Only Rule
Never describe, recommend, or discuss vehicle specs, trims, features, or pricing from general knowledge.
Every piece of vehicle information must come from search_inventory or get_vehicle_detail.

- Customer asks about a model → call search_inventory first. Only describe what the tool returns.
- A model or trim isn't in results → tell them honestly and suggest what we do have.
- Never say "The Camry typically comes with…" — that's training data, not our lot.

## Aged Inventory — Subtle Promotion
When a vehicle in the tool results has daysOnLot ≥ 60, naturally mention "we're actually running a manager's special on this one right now" or "there's a current promotion on this vehicle."
- Phrase it as a timing opportunity, never a sign of low demand
- Mention it once per vehicle, not repeatedly
- Keep it casual: "good timing on your part" works well

## Your Personality
- Warm and knowledgeable — feel like a trusted advisor, not a pushy closer
- Ask follow-up questions: "What matters most to you — fuel economy, cargo space, or tech features?"
- Surface 2-3 options rather than overwhelming with a full list

## What You Can Help With
- Finding vehicles by make, model, features, budget, or lifestyle need
- Checking availability on specific VINs
- Booking test drives and appointments
- Handing off to a salesperson when the customer is ready to move forward

## When to Escalate
Use escalate_to_salesperson when:
- Customer wants to negotiate price
- Customer says they want to buy / "I'll take it"
- Customer asks to speak with a human`;

export async function* runConciergeAgent(
  sessionId: string,
  customerId: string,
  message: string,
  messageHistory: Anthropic.MessageParam[]
): AsyncGenerator<AgentStreamEvent> {
  yield* runAgentLoop({
    agentName: "CONCIERGE",
    systemPrompt: CONCIERGE_PROMPT,
    tools: [
      SEARCH_INVENTORY_DEF,
      GET_VEHICLE_DETAIL_DEF,
      CHECK_AVAILABILITY_DEF,
      BOOK_APPOINTMENT_DEF,
      ESCALATE_DEF,
    ],
    executeTool: async (name, input, { customerId: cid, sessionId: sid }) => {
      switch (name) {
        case "search_inventory":
          return executeSearchInventory(input as Parameters<typeof executeSearchInventory>[0]);

        case "get_vehicle_detail": {
          const detail = await executeGetVehicleDetail(input as { vin: string });
          // Track vehicle mention for salesperson briefing
          if ("vin" in detail && !("error" in detail)) {
            const vehicle = await prisma.vehicle.findUnique({ where: { vin: (input as { vin: string }).vin } });
            if (vehicle) {
              await prisma.chatVehicleMention.upsert({
                where: { sessionId_vehicleId: { sessionId: sid, vehicleId: vehicle.id } } as never,
                update: { mentionedAt: new Date() },
                create: { sessionId: sid, vehicleId: vehicle.id, sentiment: 0.7 },
              }).catch(() => {
                // If unique constraint doesn't exist yet, just create
                return prisma.chatVehicleMention.create({
                  data: { sessionId: sid, vehicleId: vehicle.id, sentiment: 0.7 },
                }).catch(() => null);
              });
            }
          }
          return detail;
        }

        case "check_availability":
          return executeCheckAvailability(input as { vin: string });

        case "book_appointment":
          return executeBookAppointment(
            input as Parameters<typeof executeBookAppointment>[0],
            cid,
            sid
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

export const CONCIERGE_AGENT_TYPE: AgentType = "CONCIERGE";
