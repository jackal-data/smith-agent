import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const make = searchParams.get("make");
  const model = searchParams.get("model");
  const maxPrice = searchParams.get("maxPrice");
  const status = searchParams.get("status") || "AVAILABLE";

  const vehicles = await prisma.vehicle.findMany({
    where: {
      status,
      ...(make && { make: { contains: make } }),
      ...(model && { model: { contains: model } }),
      ...(maxPrice && { msrp: { lte: parseFloat(maxPrice) } }),
    },
    orderBy: { msrp: "asc" },
  });

  return NextResponse.json({
    vehicles: vehicles.map((v) => ({
      ...v,
      features: JSON.parse(v.features || "[]"),
      imageUrls: JSON.parse(v.imageUrls || "[]"),
    })),
  });
}
