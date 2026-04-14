import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { runCustomerChatAgent } from "@/agents/customer-chat-agent";
import { redactPII } from "@/lib/pii";
import { generateHandoffSummary, assignSalesperson, createAssignment } from "@/agents/handoff-agent";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

const requestSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { message, sessionId: existingSessionId } = parsed.data;
  const customerId = session.user.id;

  // Get or create chat session
  let chatSession = existingSessionId
    ? await prisma.chatSession.findFirst({
        where: { id: existingSessionId, customerId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            select: { role: true, content: true },
          },
        },
      })
    : null;

  if (!chatSession) {
    chatSession = await prisma.chatSession.create({
      data: { customerId },
      include: { messages: true },
    });
    // Track session start
    await prisma.conversionEvent.create({
      data: {
        sessionId: chatSession.id,
        customerId,
        eventType: "chat_started",
      },
    });
  }

  if (chatSession.status === "CLOSED" || chatSession.status === "ARCHIVED") {
    return NextResponse.json({ error: "Session is closed" }, { status: 400 });
  }

  // Redact PII from user message before processing
  const safeMessage = redactPII(message);

  // Build message history for Claude
  const messageHistory: Anthropic.MessageParam[] = chatSession.messages
    .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
    .map((m) => ({
      role: m.role === "USER" ? "user" : "assistant",
      content: m.content,
    }));

  // Stream response back to client
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let handoffSessionId: string | null = null;

        for await (const event of runCustomerChatAgent(
          chatSession!.id,
          customerId,
          safeMessage,
          messageHistory
        )) {
          const chunk = JSON.stringify(event) + "\n";
          controller.enqueue(encoder.encode(chunk));

          if (event.type === "handoff_triggered") {
            handoffSessionId = chatSession!.id;
          }
        }

        // Trigger handoff flow if needed
        if (handoffSessionId) {
          try {
            const payload = await generateHandoffSummary(handoffSessionId);
            const salespersonId = await assignSalesperson(payload);
            await createAssignment(payload, salespersonId);

            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "handoff_complete",
                  content: "You're being connected with a sales specialist who will be in touch shortly.",
                  sessionId: handoffSessionId,
                }) + "\n"
              )
            );
          } catch (handoffErr) {
            console.error("Handoff failed:", handoffErr);
          }
        }
      } catch (err) {
        console.error("Chat agent error:", err);
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
      "Content-Type": "application/x-ndjson",
      "X-Session-Id": chatSession.id,
      "Cache-Control": "no-cache",
    },
  });
}
