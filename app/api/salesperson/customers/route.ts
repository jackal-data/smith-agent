import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["SALESPERSON", "MANAGER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assignments = await prisma.assignment.findMany({
    where: {
      salespersonId: session.user.id,
      status: { notIn: ["CLOSED_LOST"] },
    },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      session: {
        select: {
          id: true,
          intentScore: true,
          status: true,
          createdAt: true,
          messages: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: [
      { status: "asc" },
      { createdAt: "desc" },
    ],
  });

  return NextResponse.json({
    customers: assignments.map((a) => ({
      assignmentId: a.id,
      assignmentStatus: a.status,
      intentScore: a.intentScore,
      recommendedMarkup: a.recommendedMarkup,
      customer: a.customer,
      session: {
        id: a.session.id,
        status: a.session.status,
        startedAt: a.session.createdAt,
        lastActivity: a.session.messages[0]?.createdAt ?? a.session.createdAt,
      },
      summary: a.summary,
      createdAt: a.createdAt,
    })),
  });
}
