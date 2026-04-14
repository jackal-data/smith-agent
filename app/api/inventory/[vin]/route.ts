import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ vin: string }> }
) {
  const { vin } = await params;
  const vehicle = await prisma.vehicle.findUnique({ where: { vin } });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

  return NextResponse.json({
    ...vehicle,
    features: JSON.parse(vehicle.features || "[]"),
    imageUrls: JSON.parse(vehicle.imageUrls || "[]"),
  });
}
