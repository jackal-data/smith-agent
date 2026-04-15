import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { runOrchestrator } from "@/agents/orchestrator";
import { generateHandoffSummary, assignSalesperson, createAssignment } from "@/agents/closer-agent";
import { redactPII } from "@/lib/pii";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

const requestSchema = z.object({
  message:   z.string().min(1).max(2000),
  sessionId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body   = await req.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { message, sessionId: existingSessionId } = parsed.data;
  const customerId = session.user.id;

  // Get or create chat session
  let chatSession = existingSessionId
    ? await prisma.chatSession.findFirst({
        where:   { id: existingSessionId, customerId },
        include: { messages: { orderBy: { createdAt: "asc" }, select: { role: true, content: true } } },
      })
    : null;

  if (!chatSession) {
    chatSession = await prisma.chatSession.create({
      data:    { customerId },
      include: { messages: true },
    });
    await prisma.conversionEvent.create({
      data: { sessionId: chatSession.id, customerId, eventType: "chat_started" },
    });
  }

  if (chatSession.status === "CLOSED" || chatSession.status === "ARCHIVED") {
    return NextResponse.json({ error: "Session is closed" }, { status: 400 });
  }

  const safeMessage = redactPII(message);

  // If session is handed off to a salesperson, save the message but don't call AI
  if (chatSession.status === "HANDED_OFF") {
    await prisma.message.create({
      data: { sessionId: chatSession.id, role: "USER", content: safeMessage },
    });
    const enc = new TextEncoder();
    const handedOffStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          enc.encode(JSON.stringify({ type: "message_received", content: safeMessage }) + "\n")
        );
        controller.close();
      },
    });
    return new Response(handedOffStream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "X-Session-Id": chatSession.id,
        "Cache-Control": "no-cache",
      },
    });
  }

  // Build message history for Claude
  const messageHistory: Anthropic.MessageParam[] = chatSession.messages
    .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
    .map((m) => ({
      role:    m.role === "USER" ? "user" : "assistant",
      content: m.content,
    }));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let handoffSessionId: string | null = null;

        for await (const event of runOrchestrator(
          chatSession!.id,
          customerId,
          safeMessage,
          messageHistory
        )) {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

          if (event.type === "handoff_triggered") {
            handoffSessionId = chatSession!.id;
          }
        }

        // Trigger Closer Agent after handoff
        if (handoffSessionId) {
          try {
            const payload       = await generateHandoffSummary(handoffSessionId);
            const salespersonId = await assignSalesperson(payload);
            await createAssignment(payload, salespersonId);

            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type:    "handoff_complete",
                  content: "You're being connected with a sales specialist who will be in touch shortly.",
                  sessionId: handoffSessionId,
                }) + "\n"
              )
            );
          } catch (handoffErr) {
            console.error("Closer agent error:", handoffErr);
          }
        }
      } catch (err) {
        console.error("Orchestrator error:", err);
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ type: "error", content: "Something went wrong. Please try again." }) + "\n"
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "application/x-ndjson",
      "X-Session-Id":  chatSession.id,
      "Cache-Control": "no-cache",
    },
  });
}
