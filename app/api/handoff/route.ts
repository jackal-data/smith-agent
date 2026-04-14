import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const chatSession = await prisma.chatSession.findFirst({
    where: {
      id: sessionId,
      ...(session.user.role === "CUSTOMER" && { customerId: session.user.id }),
    },
    include: {
      assignment: {
        include: {
          salesperson: { select: { name: true } },
        },
      },
    },
  });

  if (!chatSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    handoffTriggered: chatSession.handoffTriggered,
    handoffAt: chatSession.handoffAt,
    status: chatSession.status,
    assignment: chatSession.assignment
      ? {
          id: chatSession.assignment.id,
          status: chatSession.assignment.status,
          salespersonName: chatSession.assignment.salesperson.name,
        }
      : null,
  });
}
