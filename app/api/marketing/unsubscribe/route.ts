import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/marketing/unsubscribe?token=xxx
// One-click unsubscribe link included in every marketing email.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return new NextResponse("Missing token", { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { unsubscribeToken: token },
    select: { id: true, email: true },
  });

  if (!user) {
    return new NextResponse("Invalid or expired unsubscribe link", { status: 404 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { marketingOptIn: false },
  });

  // Redirect to a simple confirmation page (or just return HTML)
  return new NextResponse(
    `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Unsubscribed – Smith Motors</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f1f5f9;margin:0}
.card{background:#fff;border-radius:12px;padding:40px;text-align:center;max-width:400px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
h1{margin:0 0 8px;font-size:20px;color:#111827}p{color:#6b7280;font-size:14px;margin:0 0 20px}
a{display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600}</style>
</head>
<body>
<div class="card">
  <p style="font-size:32px;margin:0 0 16px">✓</p>
  <h1>You've been unsubscribed</h1>
  <p>You won't receive any more deal alerts from Smith Motors.<br>You can re-subscribe anytime from your account settings.</p>
  <a href="/customer/dashboard">Back to Dashboard</a>
</div>
</body>
</html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}
