import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// SSE endpoint for real-time notifications to salesperson dashboard
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["SALESPERSON", "MANAGER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const salespersonId = session.user.id;
  let lastChecked = new Date();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Send initial heartbeat
      send({ type: "connected", timestamp: new Date().toISOString() });

      // Poll for new assignments every 5 seconds
      const interval = setInterval(async () => {
        try {
          const newAssignments = await prisma.assignment.findMany({
            where: {
              salespersonId,
              createdAt: { gt: lastChecked },
            },
            include: {
              customer: { select: { name: true, email: true } },
            },
          });

          if (newAssignments.length > 0) {
            for (const assignment of newAssignments) {
              send({
                type: "new_assignment",
                assignment: {
                  id: assignment.id,
                  customerName: assignment.customer.name,
                  customerEmail: assignment.customer.email,
                  intentScore: assignment.intentScore,
                  createdAt: assignment.createdAt,
                },
              });
            }
            lastChecked = new Date();
          }

          // Heartbeat
          send({ type: "ping", timestamp: new Date().toISOString() });
        } catch {
          clearInterval(interval);
          controller.close();
        }
      }, 5000);

      // Clean up after 5 minutes (client should reconnect)
      setTimeout(() => {
        clearInterval(interval);
        controller.close();
      }, 300000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
