import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  customerId: z.string(),
  vehicleId: z.string().optional(),
  type: z.enum(["TEST_DRIVE", "FINANCING_REVIEW", "DELIVERY", "SERVICE"]),
  scheduledAt: z.string(),
  durationMins: z.number().default(60),
  notes: z.string().optional(),
  sessionId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["SALESPERSON", "MANAGER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all appointments for customers assigned to this salesperson
  const assignments = await prisma.assignment.findMany({
    where: { salespersonId: session.user.id },
    select: { customerId: true },
  });
  const customerIds = assignments.map((a) => a.customerId);

  const appointments = await prisma.appointment.findMany({
    where: {
      customerId: { in: customerIds },
      scheduledAt: { gte: new Date() },
    },
    include: {
      customer: { select: { name: true, email: true } },
      vehicle: { select: { vin: true, make: true, model: true, year: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return NextResponse.json({ appointments });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["SALESPERSON", "MANAGER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const appointment = await prisma.appointment.create({
    data: {
      customerId: parsed.data.customerId,
      vehicleId: parsed.data.vehicleId,
      type: parsed.data.type,
      scheduledAt: new Date(parsed.data.scheduledAt),
      durationMins: parsed.data.durationMins,
      notes: parsed.data.notes,
      sessionId: parsed.data.sessionId,
    },
    include: {
      customer: { select: { name: true, email: true } },
      vehicle: { select: { vin: true, make: true, model: true, year: true } },
    },
  });

  await prisma.conversionEvent.create({
    data: {
      sessionId: parsed.data.sessionId,
      customerId: parsed.data.customerId,
      eventType: "appointment_booked",
      metadata: JSON.stringify({ type: parsed.data.type }),
    },
  });

  return NextResponse.json({ appointment }, { status: 201 });
}
