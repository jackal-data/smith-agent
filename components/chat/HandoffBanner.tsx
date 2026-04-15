"use client";

import { cn } from "@/components/ui/cn";

interface HandoffBannerProps {
  salespersonName?: string;
  salespersonJoined?: boolean;
  message?: string;
  className?: string;
}

export function HandoffBanner({ salespersonName, salespersonJoined, message, className }: HandoffBannerProps) {
  if (salespersonJoined && salespersonName) {
    return (
      <div className={cn("bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-3", className)}>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">
          ✓
        </div>
        <div>
          <p className="text-sm font-semibold text-green-800">
            Connected with {salespersonName}
          </p>
          <p className="text-xs text-green-700 mt-0.5">
            {message || "You're now chatting directly with your sales specialist."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-start gap-3", className)}>
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
        <svg className="w-4 h-4 text-yellow-600 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
          <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-yellow-800">
          Connecting you with a specialist
        </p>
        <p className="text-xs text-yellow-700 mt-0.5">
          {message || "A sales specialist has been notified. They'll join this chat shortly."}
        </p>
      </div>
    </div>
  );
}
