"use client";

import { useState, useCallback, useRef } from "react";
import type { ChatMessage, StreamChunk } from "@/types/chat";

export function useChat(initialSessionId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [isLoading, setIsLoading] = useState(false);
  const [isHandedOff, setIsHandedOff] = useState(false);
  const [handoffMessage, setHandoffMessage] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      // Only add assistant placeholder when AI will respond (not after handoff)
      const assistantId = `assistant-${Date.now()}`;
      if (!isHandedOff) {
        const assistantMsg: ChatMessage = {
          id: assistantId,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }

      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content, sessionId }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) throw new Error("Chat request failed");

        const newSessionId = res.headers.get("X-Session-Id");
        if (newSessionId) setSessionId(newSessionId);

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const lines = decoder.decode(value).split("\n").filter(Boolean);
          for (const line of lines) {
            try {
              const chunk: StreamChunk & { type: string } = JSON.parse(line);

              if (chunk.type === "text" && chunk.content) {
                assistantContent += chunk.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: assistantContent } : m
                  )
                );
              } else if (chunk.type === "handoff_triggered" || chunk.type === "handoff_complete") {
                setIsHandedOff(true);
                setHandoffMessage(
                  chunk.content ||
                    "You're being connected with a sales specialist who will be in touch shortly."
                );
              } else if (chunk.type === "message_received") {
                // Message stored for salesperson — nothing to render
              }
            } catch {
              // Ignore parse errors from partial chunks
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: "Sorry, something went wrong. Please try again." }
                : m
            )
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, isLoading]
  );

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  return {
    messages,
    sessionId,
    isLoading,
    isHandedOff,
    handoffMessage,
    sendMessage,
    stopStream,
  };
}
