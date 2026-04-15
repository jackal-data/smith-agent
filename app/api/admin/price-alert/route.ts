import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPriceAlertEmails, type PriceAlertPayload } from "@/lib/email";

// GET /api/admin/price-alert — list available vehicles for the modal picker
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["MANAGER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const vehicles = await prisma.vehicle.findMany({
    where: { status: "AVAILABLE" },
    select: { id: true, year: true, make: true, model: true, trim: true, msrp: true, salePrice: true },
    orderBy: [{ make: "asc" }, { model: "asc" }],
  });

  const subscriberCount = await prisma.user.count({
    where: { marketingOptIn: true, role: "CUSTOMER" },
  });

  return NextResponse.json({ vehicles, subscriberCount });
}

// POST /api/admin/price-alert — send deal alert to all opted-in customers
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["MANAGER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { subject, message, vehicleId } = body as {
    subject: string;
    message: string;
    vehicleId?: string;
  };

  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
  }

  const subscribers = await prisma.user.findMany({
    where: { marketingOptIn: true, role: "CUSTOMER" },
    select: { email: true, name: true, unsubscribeToken: true },
  });

  const validSubs = subscribers.filter(
    (s): s is typeof s & { unsubscribeToken: string } => s.unsubscribeToken !== null
  );

  if (validSubs.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, message: "No subscribers" });
  }

  let vehicle: PriceAlertPayload["vehicle"] | undefined;
  if (vehicleId) {
    const v = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { year: true, make: true, model: true, trim: true, msrp: true, salePrice: true },
    });
    if (v) vehicle = v;
  }

  const payload: PriceAlertPayload = { subject: subject.trim(), message: message.trim(), vehicle };
  const result = await sendPriceAlertEmails(validSubs, payload);

  return NextResponse.json(result);
}
