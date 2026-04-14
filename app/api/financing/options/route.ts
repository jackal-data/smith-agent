import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { FinancingScenario } from "@/types/chat";

const APR_TABLE: Record<string, number[]> = {
  excellent: [2.9, 3.4, 3.9],   // 36, 48, 60 months
  good:      [4.9, 5.4, 5.9],
  fair:      [7.9, 9.4, 11.9],
  poor:      [14.9, 17.4, 21.9],
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vehiclePrice = parseFloat(req.nextUrl.searchParams.get("vehiclePrice") || "0");
  const downPayment = parseFloat(req.nextUrl.searchParams.get("downPayment") || "0");
  const creditTier = req.nextUrl.searchParams.get("creditTier") || "good";

  if (vehiclePrice <= 0) {
    return NextResponse.json({ error: "vehiclePrice required" }, { status: 400 });
  }

  const aprs = APR_TABLE[creditTier] || APR_TABLE.good;
  const principal = vehiclePrice - downPayment;
  const terms = [36, 48, 60];

  const scenarios: FinancingScenario[] = terms.map((termMonths, i) => {
    const monthlyRate = aprs[i] / 100 / 12;
    const monthlyPayment =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1);
    return {
      termMonths,
      apr: aprs[i],
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalCost: Math.round(monthlyPayment * termMonths * 100) / 100,
      downPayment,
      lender: "Smith Motors Finance",
    };
  });

  return NextResponse.json({ scenarios, vehiclePrice, downPayment, creditTier });
}
