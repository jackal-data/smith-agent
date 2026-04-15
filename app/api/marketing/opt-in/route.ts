import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";

// POST /api/marketing/opt-in  { optIn: boolean }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { optIn } = await req.json();

  const data: { marketingOptIn: boolean; unsubscribeToken?: string } = {
    marketingOptIn: Boolean(optIn),
  };

  // Generate an unsubscribe token the first time they opt in
  if (optIn) {
    const existing = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { unsubscribeToken: true },
    });
    if (!existing?.unsubscribeToken) {
      data.unsubscribeToken = crypto.randomBytes(32).toString("hex");
    }
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { marketingOptIn: true },
  });

  return NextResponse.json({ marketingOptIn: user.marketingOptIn });
}
