import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["MANAGER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    totalSessions,
    handoffs,
    salesClosed,
    salesLost,
    appointmentsBooked,
    avgIntentAtHandoff,
  ] = await Promise.all([
    prisma.chatSession.count(),
    prisma.chatSession.count({ where: { handoffTriggered: true } }),
    prisma.conversionEvent.count({ where: { eventType: "sale_closed" } }),
    prisma.conversionEvent.count({ where: { eventType: "sale_lost" } }),
    prisma.conversionEvent.count({ where: { eventType: "appointment_booked" } }),
    prisma.assignment.aggregate({ _avg: { intentScore: true } }),
  ]);

  const conversionRate = handoffs > 0 ? (salesClosed / handoffs) * 100 : 0;
  const handoffRate = totalSessions > 0 ? (handoffs / totalSessions) * 100 : 0;

  // Time to close: avg minutes from session start to CLOSED_WON assignment
  const closedAssignments = await prisma.assignment.findMany({
    where: { status: "CLOSED_WON" },
    include: {
      session: { select: { createdAt: true } },
    },
    take: 100,
  });

  const avgTimeToCloseMinutes =
    closedAssignments.length > 0
      ? closedAssignments.reduce((acc, a) => {
          const diff = (a.updatedAt.getTime() - a.session.createdAt.getTime()) / 60000;
          return acc + diff;
        }, 0) / closedAssignments.length
      : 0;

  return NextResponse.json({
    totalSessions,
    handoffs,
    handoffRate: Math.round(handoffRate * 10) / 10,
    salesClosed,
    salesLost,
    appointmentsBooked,
    conversionRate: Math.round(conversionRate * 10) / 10,
    avgTimeToCloseMinutes: Math.round(avgTimeToCloseMinutes),
    avgIntentAtHandoff: Math.round((avgIntentAtHandoff._avg.intentScore ?? 0) * 100) / 100,
  });
}
