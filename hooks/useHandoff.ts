"use client";

import { useState, useEffect, useRef } from "react";

interface HandoffStatus {
  handoffTriggered: boolean;
  salespersonName?: string;
  assignmentStatus?: string;
}

export function useHandoff(sessionId?: string) {
  const [status, setStatus] = useState<HandoffStatus>({ handoffTriggered: false });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/handoff?sessionId=${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        setStatus({
          handoffTriggered: data.handoffTriggered,
          salespersonName: data.assignment?.salespersonName,
          assignmentStatus: data.assignment?.status,
        });

        // Stop polling once assignment is acknowledged
        if (data.assignment?.status === "ACKNOWLEDGED" || data.assignment?.status === "IN_PROGRESS") {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch {
        // Ignore errors silently
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sessionId]);

  return status;
}
