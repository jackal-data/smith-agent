import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  annualIncome: z.number().optional(),
  creditScoreRange: z.string().optional(),
  downPayment: z.number().optional(),
  loanTermMonths: z.number().optional(),
  status: z.enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "DECLINED", "FUNDED"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const application = await prisma.financingApplication.findFirst({
    where: {
      id,
      ...(session.user.role === "CUSTOMER" && { customerId: session.user.id }),
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const updated = await prisma.financingApplication.update({
    where: { id },
    data: parsed.data,
  });

  if (parsed.data.status === "SUBMITTED") {
    await prisma.conversionEvent.create({
      data: {
        customerId: application.customerId,
        eventType: "financing_application_submitted",
      },
    });
  }

  return NextResponse.json({ application: updated });
}
