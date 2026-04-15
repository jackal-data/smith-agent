"use client";

import { useState, useEffect, useRef } from "react";
import type { ChatMessage } from "@/types/chat";

interface HandoffStatus {
  handoffTriggered: boolean;
  salespersonName?: string;
  salespersonJoined: boolean;
  salespersonMessages: ChatMessage[];
  assignmentStatus?: string;
}

export function useHandoff(sessionId?: string) {
  const [status, setStatus] = useState<HandoffStatus>({
    handoffTriggered: false,
    salespersonJoined: false,
    salespersonMessages: [],
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/handoff?sessionId=${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();

        const joined = data.assignment?.status === "IN_PROGRESS";
        const spMessages: ChatMessage[] = (data.salespersonMessages ?? []).map(
          (m: { id: string; content: string; createdAt: string; senderName?: string }) => ({
            id: m.id,
            role: "salesperson" as const,
            content: m.content,
            createdAt: m.createdAt,
            senderName: m.senderName,
          })
        );

        setStatus({
          handoffTriggered: data.handoffTriggered,
          salespersonName: data.assignment?.salespersonName,
          salespersonJoined: joined,
          salespersonMessages: spMessages,
          assignmentStatus: data.assignment?.status,
        });
      } catch {
        // ignore
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 4000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sessionId]);

  return status;
}
