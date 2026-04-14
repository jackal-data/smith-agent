import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chatSession = await prisma.chatSession.create({
    data: { customerId: session.user.id },
  });

  await prisma.conversionEvent.create({
    data: {
      sessionId: chatSession.id,
      customerId: session.user.id,
      eventType: "chat_started",
    },
  });

  return NextResponse.json({ sessionId: chatSession.id });
}
