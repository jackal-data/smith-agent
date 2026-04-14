import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  vehicleVin: z.string().optional(),
  annualIncome: z.number().optional(),
  creditScoreRange: z.string().optional(),
  downPayment: z.number().optional(),
  loanTermMonths: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const application = await prisma.financingApplication.create({
    data: {
      customerId: session.user.id,
      ...parsed.data,
    },
  });

  await prisma.conversionEvent.create({
    data: {
      customerId: session.user.id,
      eventType: "financing_application_started",
    },
  });

  return NextResponse.json({ application }, { status: 201 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applications = await prisma.financingApplication.findMany({
    where: {
      ...(session.user.role === "CUSTOMER" && { customerId: session.user.id }),
    },
    include: {
      documents: { select: { id: true, type: true, fileName: true, verified: true, uploadedAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ applications });
}
