import Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODELS, buildCachedSystemBlock } from "@/lib/anthropic";
import prisma from "@/lib/prisma";
import { scoreMessage, detectUrgencySignals, HANDOFF_THRESHOLD } from "@/lib/intent-detector";
import type { ToolDefinition } from "@/types/agent";
import type { FinancingScenario } from "@/types/chat";

// ─── Dealership System Prompt (prompt-cached) ────────────────────

const DEALERSHIP_SYSTEM_PROMPT = `You are Alex, a friendly and knowledgeable automotive sales assistant for Smith Motors, a mid-size dealership. Your goal is to help customers find their perfect vehicle while building genuine trust.

## Your Personality
- Warm, professional, and honest — never pushy
- Listen actively and ask clarifying questions
- Use natural conversational language, not corporate-speak
- Be transparent about pricing, availability, and financing

## What You Can Help With
- Finding vehicles by make, model, year, features, or budget
- Explaining vehicle details, trims, and features
- Calculating financing options and monthly payments
- Checking availability and scheduling test drives
- Answering questions about trade-ins, warranties, and the buying process
- Explaining documentation requirements

## Key Guidelines
- Never fabricate vehicle details or prices
- Always use the search_inventory and get_vehicle_detail tools for accurate info
- If a customer is ready to move forward or wants to speak with someone, use escalate_to_salesperson
- Be honest about limitations — if something needs human expertise, say so
- For financing questions, use the calculate_financing tool for accurate numbers

## Privacy
- Never ask for or store SSNs, full credit card numbers, or passwords
- If a customer volunteers sensitive info, acknowledge it but don't repeat it back

Remember: your goal is to help customers make a confident, informed decision — not just close a sale.`;

// ─── Tool Definitions ─────────────────────────────────────────────

export const CHAT_TOOLS: ToolDefinition[] = [
  {
    name: "search_inventory",
    description: "Search the dealership inventory for vehicles matching customer criteria",
    input_schema: {
      type: "object",
      properties: {
        make: { type: "string", description: "Vehicle manufacturer (e.g., Toyota, Ford)" },
        model: { type: "string", description: "Vehicle model (e.g., Camry, F-150)" },
        year_min: { type: "number", description: "Minimum model year" },
        year_max: { type: "number", description: "Maximum model year" },
        max_price: { type: "number", description: "Maximum price in dollars" },
        features: { type: "array", items: { type: "string" }, description: "Required features (e.g., 'sunroof', 'AWD', 'leather')" },
      },
    },
  },
  {
    name: "get_vehicle_detail",
    description: "Get complete details for a specific vehicle by VIN",
    input_schema: {
      type: "object",
      properties: {
        vin: { type: "string", description: "Vehicle Identification Number" },
      },
      required: ["vin"],
    },
  },
  {
    name: "calculate_financing",
    description: "Calculate monthly payment scenarios for a vehicle purchase",
    input_schema: {
      type: "object",
      properties: {
        vehicle_price: { type: "number", description: "Sale price of the vehicle" },
        down_payment: { type: "number", description: "Down payment amount in dollars" },
        credit_tier: {
          type: "string",
          enum: ["excellent", "good", "fair", "poor"],
          description: "Customer's credit tier",
        },
      },
      required: ["vehicle_price", "down_payment", "credit_tier"],
    },
  },
  {
    name: "check_availability",
    description: "Check if a specific vehicle is currently available",
    input_schema: {
      type: "object",
      properties: {
        vin: { type: "string", description: "Vehicle Identification Number" },
      },
      required: ["vin"],
    },
  },
  {
    name: "book_appointment",
    description: "Schedule a test drive or appointment for a customer",
    input_schema: {
      type: "object",
      properties: {
        vehicle_vin: { type: "string", description: "VIN of the vehicle of interest" },
        appointment_type: {
          type: "string",
          enum: ["TEST_DRIVE", "FINANCING_REVIEW", "DELIVERY", "SERVICE"],
        },
        preferred_datetime: { type: "string", description: "ISO 8601 datetime string for the appointment" },
        notes: { type: "string", description: "Any special notes or requests" },
      },
      required: ["appointment_type", "preferred_datetime"],
    },
  },
  {
    name: "escalate_to_salesperson",
    description: "Hand off the customer to a human salesperson. Use this when the customer is ready to discuss purchase details, negotiate price, or when they explicitly ask for a human.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Why is this customer being escalated (brief summary)" },
      },
      required: ["reason"],
    },
  },
];

// ─── Tool Execution ───────────────────────────────────────────────

async function executeSearchInventory(input: {
  make?: string;
  model?: string;
  year_min?: number;
  year_max?: number;
  max_price?: number;
  features?: string[];
}) {
  const vehicles = await prisma.vehicle.findMany({
    where: {
      status: "AVAILABLE",
      ...(input.make && { make: { contains: input.make } }),
      ...(input.model && { model: { contains: input.model } }),
      ...(input.year_min && { year: { gte: input.year_min } }),
      ...(input.year_max && { year: { lte: input.year_max } }),
      ...(input.max_price && { msrp: { lte: input.max_price } }),
    },
    take: 5,
    orderBy: { msrp: "asc" },
  });

  if (vehicles.length === 0) {
    return { found: 0, vehicles: [], message: "No vehicles found matching those criteria." };
  }

  return {
    found: vehicles.length,
    vehicles: vehicles.map((v) => ({
      vin: v.vin,
      year: v.year,
      make: v.make,
      model: v.model,
      trim: v.trim,
      color: v.color,
      msrp: v.msrp,
      mileage: v.mileage,
      features: JSON.parse(v.features || "[]"),
    })),
  };
}

async function executeGetVehicleDetail(input: { vin: string }) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { vin: input.vin },
  });
  if (!vehicle) return { error: "Vehicle not found" };
  return {
    vin: vehicle.vin,
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.trim,
    color: vehicle.color,
    msrp: vehicle.msrp,
    salePrice: vehicle.salePrice,
    mileage: vehicle.mileage,
    status: vehicle.status,
    features: JSON.parse(vehicle.features || "[]"),
    daysOnLot: vehicle.daysOnLot,
  };
}

function executeCalculateFinancing(input: {
  vehicle_price: number;
  down_payment: number;
  credit_tier: string;
}): FinancingScenario[] {
  const aprMap: Record<string, number[]> = {
    excellent: [2.9, 3.9, 4.9],
    good: [4.9, 5.9, 6.9],
    fair: [7.9, 9.9, 12.9],
    poor: [14.9, 17.9, 21.9],
  };
  const aprs = aprMap[input.credit_tier] || aprMap.good;
  const principal = input.vehicle_price - input.down_payment;
  const terms = [36, 48, 60];

  return terms.map((termMonths, i) => {
    const monthlyRate = aprs[i] / 100 / 12;
    const monthlyPayment =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1);
    return {
      termMonths,
      apr: aprs[i],
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalCost: Math.round(monthlyPayment * termMonths * 100) / 100,
      downPayment: input.down_payment,
      lender: "Smith Motors Finance",
    };
  });
}

async function executeCheckAvailability(input: { vin: string }) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { vin: input.vin },
    select: { status: true, vin: true },
  });
  if (!vehicle) return { available: false, reason: "Vehicle not found" };
  return {
    available: vehicle.status === "AVAILABLE",
    status: vehicle.status,
  };
}

async function executeBookAppointment(input: {
  vehicle_vin?: string;
  appointment_type: string;
  preferred_datetime: string;
  notes?: string;
}, customerId: string) {
  const appointment = await prisma.appointment.create({
    data: {
      customerId,
      vehicleId: input.vehicle_vin
        ? (await prisma.vehicle.findUnique({ where: { vin: input.vehicle_vin }, select: { id: true } }))?.id
        : undefined,
      type: input.appointment_type,
      scheduledAt: new Date(input.preferred_datetime),
      notes: input.notes,
    },
  });
  return {
    success: true,
    appointmentId: appointment.id,
    scheduledAt: appointment.scheduledAt,
    type: appointment.type,
    message: `Appointment confirmed for ${new Date(input.preferred_datetime).toLocaleString()}`,
  };
}

// ─── Main Agent Function ──────────────────────────────────────────

export interface AgentStreamEvent {
  type: "text" | "tool_result" | "handoff_triggered" | "done" | "error";
  content?: string;
  toolName?: string;
  toolResult?: unknown;
  intentScore?: number;
}

export async function* runCustomerChatAgent(
  sessionId: string,
  customerId: string,
  userMessage: string,
  messageHistory: Anthropic.MessageParam[]
): AsyncGenerator<AgentStreamEvent> {
  const messageDelta = scoreMessage(userMessage);
  const urgencySignals = detectUrgencySignals(userMessage);

  // Build messages array
  const messages: Anthropic.MessageParam[] = [
    ...messageHistory,
    { role: "user", content: userMessage },
  ];

  let fullAssistantText = "";
  let handoffTriggered = false;
  let handoffReason = "";

  const response = await anthropic.messages.create({
    model: MODELS.SMART,
    max_tokens: 1024,
    system: [buildCachedSystemBlock(DEALERSHIP_SYSTEM_PROMPT)],
    tools: CHAT_TOOLS as Anthropic.Tool[],
    messages,
    stream: false, // We'll use non-streaming for tool use simplicity
  });

  for (const block of response.content) {
    if (block.type === "text") {
      fullAssistantText += block.text;
      yield { type: "text", content: block.text };
    } else if (block.type === "tool_use") {
      const toolName = block.name;
      const toolInput = block.input as Record<string, unknown>;

      yield { type: "tool_result", toolName, content: `Looking up ${toolName}...` };

      let toolResult: unknown;

      if (toolName === "search_inventory") {
        toolResult = await executeSearchInventory(toolInput as Parameters<typeof executeSearchInventory>[0]);
      } else if (toolName === "get_vehicle_detail") {
        toolResult = await executeGetVehicleDetail(toolInput as { vin: string });
      } else if (toolName === "calculate_financing") {
        toolResult = executeCalculateFinancing(toolInput as Parameters<typeof executeCalculateFinancing>[0]);
      } else if (toolName === "check_availability") {
        toolResult = await executeCheckAvailability(toolInput as { vin: string });
      } else if (toolName === "book_appointment") {
        toolResult = await executeBookAppointment(
          toolInput as Parameters<typeof executeBookAppointment>[0],
          customerId
        );
        // Track conversion event
        await prisma.conversionEvent.create({
          data: {
            sessionId,
            customerId,
            eventType: "appointment_booked",
            metadata: JSON.stringify(toolInput),
          },
        });
      } else if (toolName === "escalate_to_salesperson") {
        handoffTriggered = true;
        handoffReason = (toolInput as { reason: string }).reason;
        toolResult = { acknowledged: true };
      }

      // Continue conversation with tool result
      const continueMessages: Anthropic.MessageParam[] = [
        ...messages,
        { role: "assistant", content: response.content },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(toolResult),
            },
          ],
        },
      ];

      if (toolName !== "escalate_to_salesperson") {
        const followUp = await anthropic.messages.create({
          model: MODELS.SMART,
          max_tokens: 1024,
          system: [buildCachedSystemBlock(DEALERSHIP_SYSTEM_PROMPT)],
          tools: CHAT_TOOLS as Anthropic.Tool[],
          messages: continueMessages,
        });

        for (const followBlock of followUp.content) {
          if (followBlock.type === "text") {
            fullAssistantText += followBlock.text;
            yield { type: "text", content: followBlock.text };
          }
        }
      }

      yield { type: "tool_result", toolName, toolResult };
    }
  }

  if (handoffTriggered) {
    yield { type: "handoff_triggered", content: handoffReason };
  }

  yield { type: "done", intentScore: messageDelta };

  // Update session intent score and save messages
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: { messages: { select: { intentDelta: true } } },
  });

  if (session) {
    const allDeltas = session.messages
      .map((m) => m.intentDelta ?? 0)
      .concat(messageDelta);
    const newScore = Math.min(
      allDeltas.reduce((acc, d, i) => acc + d * Math.pow(0.85, i), 0),
      1.0
    );

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        intentScore: newScore,
        ...(handoffTriggered && {
          handoffTriggered: true,
          handoffAt: new Date(),
          status: "HANDED_OFF",
        }),
      },
    });
  }

  // Save user message
  await prisma.message.create({
    data: {
      sessionId,
      role: "USER",
      content: userMessage,
      intentDelta: messageDelta,
    },
  });

  // Save assistant message
  await prisma.message.create({
    data: {
      sessionId,
      role: "ASSISTANT",
      content: fullAssistantText,
    },
  });

  // Check intent threshold for auto-handoff
  const updatedSession = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    select: { intentScore: true, handoffTriggered: true },
  });

  if (
    updatedSession &&
    updatedSession.intentScore >= HANDOFF_THRESHOLD &&
    !updatedSession.handoffTriggered
  ) {
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { handoffTriggered: true, handoffAt: new Date(), status: "HANDED_OFF" },
    });
    yield { type: "handoff_triggered", content: "High buying intent detected" };
  }
}
