/**
 * Generic multi-turn agentic loop for all Smith Motors agents.
 * Each agent passes its system prompt, tool definitions, and a tool executor.
 * The runner handles streaming, tool dispatch, intent scoring, and DB persistence.
 */

import Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODELS, buildCachedSystemBlock } from "@/lib/anthropic";
import prisma from "@/lib/prisma";
import { scoreMessage, HANDOFF_THRESHOLD } from "@/lib/intent-detector";
import type { AgentStreamEvent, ToolDefinition } from "@/types/agent";

export interface AgentRunConfig {
  /** Unique name used in telemetry / debug */
  agentName: string;
  systemPrompt: string;
  tools: ToolDefinition[];
  /**
   * Dispatch function: given a tool name + input, return the result.
   * Return the sentinel `{ __escalate: true, reason: string }` to trigger handoff.
   */
  executeTool: (
    name: string,
    input: Record<string, unknown>,
    ctx: { customerId: string; sessionId: string }
  ) => Promise<unknown>;
  sessionId: string;
  customerId: string;
  message: string;
  messageHistory: Anthropic.MessageParam[];
}

export async function* runAgentLoop(config: AgentRunConfig): AsyncGenerator<AgentStreamEvent> {
  const {
    systemPrompt,
    tools,
    executeTool,
    sessionId,
    customerId,
    message,
    messageHistory,
  } = config;

  const intentDelta = scoreMessage(message);
  let fullAssistantText = "";
  let handoffTriggered  = false;
  let handoffReason     = "";

  // Build the working message list; grows as tool results are added
  let workingMessages: Anthropic.MessageParam[] = [
    ...messageHistory,
    { role: "user", content: message },
  ];

  // ── Multi-turn agentic loop ────────────────────────────────────────
  // Continues until the model stops with "end_turn" (no more tool calls)
  // or until an escalation is triggered.

  let maxIterations = 6; // guard against runaway loops

  while (maxIterations-- > 0) {
    const response = await anthropic.messages.create({
      model:      MODELS.SMART,
      max_tokens: 1024,
      system:     [buildCachedSystemBlock(systemPrompt)],
      tools:      tools as Anthropic.Tool[],
      messages:   workingMessages,
    });

    // Collect tool uses from this response
    const toolUseBlocks: Anthropic.ToolUseBlock[] = [];
    const toolResultContents: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        fullAssistantText += block.text;
        yield { type: "text", content: block.text };
      } else if (block.type === "tool_use") {
        toolUseBlocks.push(block);
        yield { type: "tool_result", toolName: block.name, content: `Using ${block.name}…` };
      }
    }

    // If no tool calls, we're done
    if (toolUseBlocks.length === 0 || response.stop_reason === "end_turn") break;

    // Execute all tool calls in this turn
    for (const block of toolUseBlocks) {
      const input = block.input as Record<string, unknown>;
      let result: unknown;

      try {
        result = await executeTool(block.name, input, { customerId, sessionId });
      } catch (err) {
        result = { error: String(err) };
      }

      // Escalation sentinel
      if (result && typeof result === "object" && "__escalate" in result) {
        handoffTriggered = true;
        handoffReason    = ((result as unknown) as { reason: string }).reason;
        result           = { acknowledged: true };
      }

      toolResultContents.push({
        type:        "tool_result",
        tool_use_id: block.id,
        content:     JSON.stringify(result),
      });

      yield { type: "tool_result", toolName: block.name, toolResult: result };
    }

    if (handoffTriggered) break;

    // Append assistant turn + tool results, then loop for the model's follow-up
    workingMessages = [
      ...workingMessages,
      { role: "assistant", content: response.content },
      { role: "user",      content: toolResultContents },
    ];
  }

  // ── Persist ───────────────────────────────────────────────────────

  await prisma.message.create({
    data: { sessionId, role: "USER",      content: message,           intentDelta },
  });
  await prisma.message.create({
    data: { sessionId, role: "ASSISTANT", content: fullAssistantText },
  });

  // Update session intent score
  const session = await prisma.chatSession.findUnique({
    where:   { id: sessionId },
    include: { messages: { select: { intentDelta: true } } },
  });

  if (session) {
    const allDeltas = session.messages
      .map((m) => m.intentDelta ?? 0)
      .concat(intentDelta);
    const newScore = Math.min(
      allDeltas.reduce((acc, d, i) => acc + d * Math.pow(0.85, i), 0),
      1.0
    );

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        intentScore: newScore,
        ...(handoffTriggered && {
          handoffTriggered: true,
          handoffAt:        new Date(),
          status:           "HANDED_OFF",
        }),
      },
    });

    // Auto-handoff on intent threshold
    if (!handoffTriggered && newScore >= HANDOFF_THRESHOLD && !session.handoffTriggered) {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data:  { handoffTriggered: true, handoffAt: new Date(), status: "HANDED_OFF" },
      });
      handoffTriggered = true;
      handoffReason    = "High buying intent detected";
    }
  }

  if (handoffTriggered) {
    yield { type: "handoff_triggered", content: handoffReason };
  }

  yield { type: "done", intentScore: intentDelta };
}
