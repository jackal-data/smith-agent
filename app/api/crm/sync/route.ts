import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getCRMAdapter } from "@/lib/crm-adapter";
import { z } from "zod";

const schema = z.object({ assignmentId: z.string() });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["SALESPERSON", "MANAGER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "assignmentId required" }, { status: 400 });
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: parsed.data.assignmentId },
    include: {
      customer: { select: { id: true, email: true, name: true, phone: true } },
      session: { select: { vehicleMentions: { include: { vehicle: true }, take: 1 } } },
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const crm = getCRMAdapter();
  await crm.pushLead(
    {
      id: assignment.customer.id,
      email: assignment.customer.email,
      name: assignment.customer.name || assignment.customer.email,
      phone: assignment.customer.phone ?? undefined,
    },
    {
      id: assignment.id,
      customerId: assignment.customer.id,
      vehicleVin: assignment.session.vehicleMentions[0]?.vehicle.vin,
      stage: assignment.status,
      intentScore: assignment.intentScore,
      summary: assignment.summary,
    }
  );

  return NextResponse.json({ synced: true });
}
