"use client";

import { useEffect, useState } from "react";
import type { PricingRecommendation } from "@/types/agent";
import { cn } from "@/components/ui/cn";

interface PriceRecommendationWidgetProps {
  sessionId: string;
}

export function PriceRecommendationWidget({ sessionId }: PriceRecommendationWidgetProps) {
  const [rec, setRec] = useState<PricingRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/salesperson/recommendation?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((data) => setRec(data))
      .catch(() => setError("Could not load recommendation"))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-blue-200 rounded w-1/2 mb-2" />
        <div className="h-3 bg-blue-200 rounded w-3/4" />
      </div>
    );
  }

  if (error || !rec) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700">
        {error || "No recommendation available"}
      </div>
    );
  }

  const confidenceColors = {
    low: "bg-yellow-100 text-yellow-800",
    medium: "bg-blue-100 text-blue-800",
    high: "bg-green-100 text-green-800",
  };

  return (
    <div className="bg-white border border-blue-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-900">AI Pricing Recommendation</h3>
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", confidenceColors[rec.confidenceLevel])}>
          {rec.confidenceLevel} confidence
        </span>
      </div>

      <div className="bg-blue-50 rounded-lg px-4 py-3 mb-3 text-center">
        <p className="text-2xl font-bold text-blue-700">+{rec.openingMarkupPercent}%</p>
        <p className="text-xs text-blue-600">Opening markup over MSRP</p>
      </div>

      <p className="text-xs text-gray-600 mb-3">{rec.rationale}</p>

      <div className="mb-3">
        <p className="text-xs font-medium text-gray-700 mb-1.5">Talking points</p>
        <ul className="space-y-1">
          {rec.talkingPoints.map((point, i) => (
            <li key={i} className="text-xs text-gray-700 flex gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t pt-2">
        <p className="text-xs text-gray-700">
          Negotiation floor:{" "}
          <span className="font-semibold text-gray-700">
            ${rec.negotiationFloor.toLocaleString()}
          </span>
        </p>
      </div>
    </div>
  );
}
