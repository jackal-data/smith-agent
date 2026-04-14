"use client";

import { cn } from "@/components/ui/cn";

interface HandoffBannerProps {
  salespersonName?: string;
  message?: string;
  className?: string;
}

export function HandoffBanner({ salespersonName, message, className }: HandoffBannerProps) {
  return (
    <div
      className={cn(
        "bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-3",
        className
      )}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs">
        ✓
      </div>
      <div>
        <p className="text-sm font-semibold text-green-800">
          {salespersonName
            ? `Connected with ${salespersonName}`
            : "Connecting you with a specialist"}
        </p>
        <p className="text-xs text-green-700 mt-0.5">
          {message ||
            "A sales specialist has been notified and will reach out to you shortly to continue your conversation."}
        </p>
      </div>
    </div>
  );
}
