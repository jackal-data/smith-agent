import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile } from "fs/promises";
import { join } from "path";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const applicationId = formData.get("applicationId") as string;
  const documentType = formData.get("type") as string;

  if (!file || !applicationId || !documentType) {
    return NextResponse.json({ error: "file, applicationId, and type required" }, { status: 400 });
  }

  // Verify the application belongs to this customer
  const application = await prisma.financingApplication.findFirst({
    where: {
      id: applicationId,
      ...(session.user.role === "CUSTOMER" && { customerId: session.user.id }),
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  // Save file locally (swap for S3 in production)
  const storageKey = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const uploadPath = join(process.cwd(), "public", "uploads", storageKey);
  const bytes = await file.arrayBuffer();
  await writeFile(uploadPath, Buffer.from(bytes));

  const document = await prisma.document.create({
    data: {
      applicationId,
      type: documentType,
      fileName: file.name,
      storageKey,
    },
  });

  return NextResponse.json({ document }, { status: 201 });
}
