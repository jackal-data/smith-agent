"use client";

import { useState } from "react";

export function MarketingOptInBanner() {
  const [status, setStatus] = useState<"idle" | "loading" | "accepted" | "dismissed">("idle");

  const handleOptIn = async () => {
    setStatus("loading");
    await fetch("/api/marketing/opt-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optIn: true }),
    });
    setStatus("accepted");
  };

  if (status === "dismissed" || status === "accepted") {
    if (status === "accepted") {
      return (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6 text-sm text-green-700">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          You&apos;re subscribed to deal alerts. We&apos;ll email you when prices drop.
        </div>
      );
    }
    return null;
  }

  return (
    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6">
      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </div>
      <p className="text-sm text-blue-800 flex-1">
        <span className="font-medium">Get deal alerts.</span>{" "}
        Sign up to hear about price drops and special offers.
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleOptIn}
          disabled={status === "loading"}
          className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {status === "loading" ? "Signing up…" : "Sign me up"}
        </button>
        <button
          onClick={() => setStatus("dismissed")}
          className="text-blue-400 hover:text-blue-600 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
