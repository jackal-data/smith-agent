/**
 * Shared tool definitions and implementations for all Smith Motors agents.
 * Agents import only the definitions and executors they need.
 */

import prisma from "@/lib/prisma";
import type { ToolDefinition } from "@/types/agent";

// ─── Tool Definitions ─────────────────────────────────────────────

export const SEARCH_INVENTORY_DEF: ToolDefinition = {
  name: "search_inventory",
  description:
    "Search the dealership's live inventory. Call this FIRST whenever a customer asks about any make, model, feature, or budget — never answer vehicle questions from memory.",
  input_schema: {
    type: "object",
    properties: {
      make:     { type: "string",  description: "Vehicle manufacturer (e.g. Toyota, Ford)" },
      model:    { type: "string",  description: "Vehicle model (e.g. Camry, F-150)" },
      year_min: { type: "number",  description: "Minimum model year" },
      year_max: { type: "number",  description: "Maximum model year" },
      max_price:{ type: "number",  description: "Maximum MSRP in dollars" },
      features: { type: "array", items: { type: "string" }, description: "Required features (e.g. 'sunroof', 'AWD')" },
    },
  },
};

export const GET_VEHICLE_DETAIL_DEF: ToolDefinition = {
  name: "get_vehicle_detail",
  description: "Get complete details for a specific vehicle by VIN",
  input_schema: {
    type: "object",
    properties: {
      vin: { type: "string", description: "Vehicle Identification Number" },
    },
    required: ["vin"],
  },
};

export const CHECK_AVAILABILITY_DEF: ToolDefinition = {
  name: "check_availability",
  description: "Check if a specific vehicle is currently available",
  input_schema: {
    type: "object",
    properties: {
      vin: { type: "string", description: "Vehicle Identification Number" },
    },
    required: ["vin"],
  },
};

export const BOOK_APPOINTMENT_DEF: ToolDefinition = {
  name: "book_appointment",
  description: "Schedule a test drive or appointment for a customer",
  input_schema: {
    type: "object",
    properties: {
      vehicle_vin:          { type: "string", description: "VIN of the vehicle" },
      appointment_type:     { type: "string", enum: ["TEST_DRIVE", "FINANCING_REVIEW", "DELIVERY", "SERVICE"] },
      preferred_datetime:   { type: "string", description: "ISO 8601 datetime string" },
      notes:                { type: "string", description: "Special notes or requests" },
    },
    required: ["appointment_type", "preferred_datetime"],
  },
};

export const CALCULATE_FINANCING_DEF: ToolDefinition = {
  name: "calculate_financing",
  description: "Calculate monthly payment scenarios for a vehicle purchase across multiple loan terms",
  input_schema: {
    type: "object",
    properties: {
      vehicle_price: { type: "number", description: "Sale price of the vehicle" },
      down_payment:  { type: "number", description: "Down payment amount in dollars" },
      credit_tier:   { type: "string", enum: ["excellent", "good", "fair", "poor"] },
    },
    required: ["vehicle_price", "down_payment", "credit_tier"],
  },
};

export const CHECK_PRE_APPROVAL_DEF: ToolDefinition = {
  name: "check_pre_approval",
  description:
    "Estimate pre-approval likelihood based on income, existing debt, and desired loan amount. Uses debt-to-income (DTI) ratio. Does not pull credit — this is a soft estimate only.",
  input_schema: {
    type: "object",
    properties: {
      annual_income:  { type: "number", description: "Customer's gross annual income in dollars" },
      monthly_debt:   { type: "number", description: "Total existing monthly debt obligations (car loans, student loans, credit cards, etc.)" },
      desired_price:  { type: "number", description: "Vehicle purchase price" },
      down_payment:   { type: "number", description: "Planned down payment" },
      credit_tier:    { type: "string", enum: ["excellent", "good", "fair", "poor"], description: "Customer's self-reported credit tier" },
    },
    required: ["annual_income", "monthly_debt", "desired_price", "down_payment", "credit_tier"],
  },
};

export const GET_REQUIRED_DOCUMENTS_DEF: ToolDefinition = {
  name: "get_required_documents",
  description: "Return the list of documents required for a financing application",
  input_schema: {
    type: "object",
    properties: {
      has_trade_in: { type: "boolean", description: "Whether the customer has a trade-in vehicle" },
    },
  },
};

export const ESCALATE_DEF: ToolDefinition = {
  name: "escalate_to_salesperson",
  description:
    "Hand off to a human salesperson. Use when the customer is ready to negotiate price, wants to finalize a purchase, or explicitly asks for a human.",
  input_schema: {
    type: "object",
    properties: {
      reason: { type: "string", description: "Why this customer is being escalated" },
    },
    required: ["reason"],
  },
};

// ─── Tool Implementations ─────────────────────────────────────────

export async function executeSearchInventory(input: {
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
      ...(input.make      && { make:  { contains: input.make  } }),
      ...(input.model     && { model: { contains: input.model } }),
      ...(input.year_min  && { year:  { gte: input.year_min }  }),
      ...(input.year_max  && { year:  { lte: input.year_max }  }),
      ...(input.max_price && { msrp:  { lte: input.max_price } }),
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
      vin:       v.vin,
      year:      v.year,
      make:      v.make,
      model:     v.model,
      trim:      v.trim,
      color:     v.color,
      msrp:      v.msrp,
      mileage:   v.mileage,
      daysOnLot: v.daysOnLot,
      features:  JSON.parse(v.features || "[]"),
    })),
  };
}

export async function executeGetVehicleDetail(input: { vin: string }) {
  const vehicle = await prisma.vehicle.findUnique({ where: { vin: input.vin } });
  if (!vehicle) return { error: "Vehicle not found" };
  return {
    vin:       vehicle.vin,
    year:      vehicle.year,
    make:      vehicle.make,
    model:     vehicle.model,
    trim:      vehicle.trim,
    color:     vehicle.color,
    msrp:      vehicle.msrp,
    salePrice: vehicle.salePrice,
    mileage:   vehicle.mileage,
    daysOnLot: vehicle.daysOnLot,
    status:    vehicle.status,
    features:  JSON.parse(vehicle.features || "[]"),
  };
}

export async function executeCheckAvailability(input: { vin: string }) {
  const vehicle = await prisma.vehicle.findUnique({
    where:  { vin: input.vin },
    select: { status: true, vin: true },
  });
  if (!vehicle) return { available: false, reason: "Vehicle not found" };
  return { available: vehicle.status === "AVAILABLE", status: vehicle.status };
}

export async function executeBookAppointment(
  input: {
    vehicle_vin?: string;
    appointment_type: string;
    preferred_datetime: string;
    notes?: string;
  },
  customerId: string,
  sessionId: string,
) {
  const vehicleId = input.vehicle_vin
    ? (await prisma.vehicle.findUnique({ where: { vin: input.vehicle_vin }, select: { id: true } }))?.id
    : undefined;

  const appointment = await prisma.appointment.create({
    data: {
      customerId,
      vehicleId,
      type:        input.appointment_type,
      scheduledAt: new Date(input.preferred_datetime),
      notes:       input.notes,
    },
  });

  await prisma.conversionEvent.create({
    data: {
      sessionId,
      customerId,
      eventType: "appointment_booked",
      metadata:  JSON.stringify(input),
    },
  });

  return {
    success:       true,
    appointmentId: appointment.id,
    scheduledAt:   appointment.scheduledAt,
    type:          appointment.type,
    message:       `Appointment confirmed for ${new Date(input.preferred_datetime).toLocaleString()}`,
  };
}

const APR_TABLE: Record<string, number[]> = {
  excellent: [2.9,  3.9,  4.9,  5.9],
  good:      [4.9,  5.9,  6.9,  7.9],
  fair:      [7.9,  9.9, 12.9, 15.9],
  poor:      [14.9, 17.9, 21.9, 24.9],
};

export function executeCalculateFinancing(input: {
  vehicle_price: number;
  down_payment:  number;
  credit_tier:   string;
}) {
  const aprs      = APR_TABLE[input.credit_tier] ?? APR_TABLE.good;
  const principal = input.vehicle_price - input.down_payment;
  const terms     = [36, 48, 60, 72];

  return terms.map((termMonths, i) => {
    const r = aprs[i] / 100 / 12;
    const payment = (principal * r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
    return {
      termMonths,
      apr:            aprs[i],
      monthlyPayment: Math.round(payment * 100) / 100,
      totalCost:      Math.round(payment * termMonths * 100) / 100,
      downPayment:    input.down_payment,
    };
  });
}

export function executeCheckPreApproval(input: {
  annual_income: number;
  monthly_debt:  number;
  desired_price: number;
  down_payment:  number;
  credit_tier:   "excellent" | "good" | "fair" | "poor";
}) {
  const aprMap = { excellent: 2.9, good: 4.9, fair: 7.9, poor: 14.9 };
  const apr    = aprMap[input.credit_tier] ?? 6.9;
  const r      = apr / 100 / 12;
  const term   = 60;
  const principal = input.desired_price - input.down_payment;
  const estimatedPayment = (principal * r * Math.pow(1 + r, term)) / (Math.pow(1 + r, term) - 1);

  const monthlyIncome = input.annual_income / 12;
  const dti = (input.monthly_debt + estimatedPayment) / monthlyIncome;

  // Max loan the customer can likely service (36% DTI ceiling, standard guideline)
  const maxPayment = monthlyIncome * 0.36 - input.monthly_debt;
  const maxLoan    = maxPayment > 0
    ? (maxPayment * (Math.pow(1 + r, term) - 1)) / (r * Math.pow(1 + r, term))
    : 0;

  let qualificationStatus: string;
  if (dti <= 0.36)      qualificationStatus = "LIKELY_QUALIFIED";
  else if (dti <= 0.43) qualificationStatus = "CONDITIONAL";
  else if (dti <= 0.50) qualificationStatus = "REVIEW_NEEDED";
  else                  qualificationStatus = "HIGH_DTI";

  return {
    estimatedMonthlyPayment: Math.round(estimatedPayment),
    estimatedApr:            apr,
    dtiRatio:                Math.round(dti * 100),
    qualificationStatus,
    maxLoanEstimate:         Math.round(maxLoan),
    note: "This is a soft estimate for planning purposes only. It does not constitute a credit decision or affect your credit score.",
  };
}

export function executeGetRequiredDocuments(input: { has_trade_in?: boolean }) {
  const required = [
    { type: "DRIVERS_LICENSE",    description: "Valid government-issued photo ID" },
    { type: "PROOF_OF_INCOME",    description: "Two most recent pay stubs, or last two years of tax returns if self-employed" },
    { type: "PROOF_OF_INSURANCE", description: "Current auto insurance declarations page" },
  ];

  if (input.has_trade_in) {
    required.push({ type: "TRADE_IN_TITLE", description: "Title for your trade-in vehicle" });
  }

  return {
    required,
    glbaNotice:
      "Smith Motors collects this information solely to process your financing request. " +
      "We do not sell your personal financial data. Your Social Security Number is not required at this stage — " +
      "a full credit application will only be initiated with your explicit written consent.",
  };
}
