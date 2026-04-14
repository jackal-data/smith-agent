import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["SALESPERSON", "MANAGER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { customerId } = await params;

  const assignment = await prisma.assignment.findFirst({
    where: {
      customerId,
      salespersonId: session.user.id,
    },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
      session: {
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            select: { id: true, role: true, content: true, createdAt: true },
          },
          vehicleMentions: {
            include: { vehicle: true },
          },
        },
      },
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const handoffPayload = JSON.parse(assignment.handoffPayload || "{}");

  return NextResponse.json({
    assignment: {
      id: assignment.id,
      status: assignment.status,
      intentScore: assignment.intentScore,
      recommendedMarkup: assignment.recommendedMarkup,
      summary: assignment.summary,
      createdAt: assignment.createdAt,
    },
    customer: assignment.customer,
    session: {
      id: assignment.session.id,
      status: assignment.session.status,
      messages: assignment.session.messages,
      vehiclesOfInterest: assignment.session.vehicleMentions.map((vm) => ({
        vehicle: vm.vehicle,
        sentiment: vm.sentiment,
        mentionedAt: vm.mentionedAt,
      })),
    },
    handoffPayload,
  });
}

const updateSchema = z.object({
  status: z.enum(["ACKNOWLEDGED", "IN_PROGRESS", "CLOSED_WON", "CLOSED_LOST"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["SALESPERSON", "MANAGER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { customerId } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const assignment = await prisma.assignment.findFirst({
    where: { customerId, salespersonId: session.user.id },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const updated = await prisma.assignment.update({
    where: { id: assignment.id },
    data: { status: parsed.data.status },
  });

  if (parsed.data.status === "CLOSED_WON" || parsed.data.status === "CLOSED_LOST") {
    await prisma.conversionEvent.create({
      data: {
        sessionId: assignment.sessionId,
        customerId,
        eventType: parsed.data.status === "CLOSED_WON" ? "sale_closed" : "sale_lost",
      },
    });
  }

  return NextResponse.json({ status: updated.status });
}
