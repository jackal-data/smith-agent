import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  role: z.enum(["CUSTOMER", "SALESPERSON"]).default("CUSTOMER"),
  registrationKey: z.string().optional(),
  marketingOptIn: z.boolean().optional().default(false),
});

const SALESPERSON_KEY = process.env.SALESPERSON_REGISTRATION_KEY || "smith-sales-2024";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.role === "SALESPERSON" && parsed.data.registrationKey !== SALESPERSON_KEY) {
    return NextResponse.json({ error: "Invalid registration key" }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

  const marketingOptIn = parsed.data.role === "CUSTOMER" && parsed.data.marketingOptIn;

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      password: hashedPassword,
      role: parsed.data.role,
      marketingOptIn,
      ...(marketingOptIn && {
        unsubscribeToken: crypto.randomBytes(32).toString("hex"),
      }),
    },
    select: { id: true, email: true, name: true, role: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
