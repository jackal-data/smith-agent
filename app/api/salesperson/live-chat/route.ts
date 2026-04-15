import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["SALESPERSON", "MANAGER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const after = req.nextUrl.searchParams.get("after");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const afterDate = after ? new Date(after) : new Date(0);

  // Verify salesperson has an assignment for this session
  const assignment = await prisma.assignment.findFirst({
    where: { sessionId, salespersonId: session.user.id },
    select: {
      id: true,
      status: true,
      salesperson: { select: { name: true } },
    },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: {
      sessionId,
      role: { in: ["USER", "SALESPERSON"] },
      createdAt: { gt: afterDate },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true, createdAt: true, rawContent: true },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      senderName:
        m.role === "SALESPERSON"
          ? (m.rawContent ?? assignment.salesperson.name ?? "Salesperson")
          : undefined,
    })),
    assignmentStatus: assignment.status,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["SALESPERSON", "MANAGER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { sessionId, action, content } = body as {
    sessionId?: string;
    action?: string;
    content?: string;
  };

  if (!sessionId || !action) {
    return NextResponse.json({ error: "sessionId and action required" }, { status: 400 });
  }

  const assignment = await prisma.assignment.findFirst({
    where: { sessionId, salespersonId: session.user.id },
    include: { salesperson: { select: { name: true } } },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (action === "join") {
    await prisma.$transaction([
      prisma.assignment.update({
        where: { id: assignment.id },
        data: { status: "IN_PROGRESS" },
      }),
      prisma.chatSession.update({
        where: { id: sessionId },
        data: { status: "HANDED_OFF" },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (action === "message") {
    if (!content?.trim()) {
      return NextResponse.json({ error: "content required" }, { status: 400 });
    }
    await prisma.message.create({
      data: {
        sessionId,
        role: "SALESPERSON",
        content: content.trim(),
        rawContent: assignment.salesperson.name ?? session.user.name ?? "Salesperson",
      },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
