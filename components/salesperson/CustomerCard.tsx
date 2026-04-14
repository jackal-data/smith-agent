"use client";

import { cn } from "@/components/ui/cn";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface CustomerCardProps {
  assignmentId: string;
  customerId: string;
  customerName?: string;
  customerEmail: string;
  intentScore: number;
  assignmentStatus: string;
  lastActivity: string;
  summary: string;
  recommendedMarkup?: number;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ACKNOWLEDGED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-green-100 text-green-800",
  CLOSED_WON: "bg-gray-100 text-gray-600",
  CLOSED_LOST: "bg-red-100 text-red-700",
};

function IntentBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-400" : "bg-gray-300";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

export function CustomerCard({
  customerId,
  customerName,
  customerEmail,
  intentScore,
  assignmentStatus,
  lastActivity,
  summary,
  recommendedMarkup,
}: CustomerCardProps) {
  return (
    <Link href={`/salesperson/customers/${customerId}`}>
      <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-semibold text-sm text-gray-900">
              {customerName || customerEmail}
            </p>
            <p className="text-xs text-gray-500">{customerEmail}</p>
          </div>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[assignmentStatus])}>
            {assignmentStatus.replace(/_/g, " ")}
          </span>
        </div>

        <div className="mb-3">
          <p className="text-xs text-gray-400 mb-1">Buying intent</p>
          <IntentBar score={intentScore} />
        </div>

        {recommendedMarkup !== undefined && (
          <div className="mb-3 bg-blue-50 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="text-blue-700 text-xs font-medium">
              AI suggests: Open at +{recommendedMarkup}% over MSRP
            </span>
          </div>
        )}

        <p className="text-xs text-gray-600 line-clamp-2 mb-2">{summary}</p>

        <p className="text-xs text-gray-400">
          Last activity {formatDistanceToNow(new Date(lastActivity), { addSuffix: true })}
        </p>
      </div>
    </Link>
  );
}
