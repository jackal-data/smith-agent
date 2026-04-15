import prisma from "@/lib/prisma";
import Link from "next/link";

export async function MetricsPreviewCard() {
  const [assignmentRows, sessionRows, activeAssignments] = await Promise.all([
    prisma.assignment.findMany({
      select: { status: true, intentScore: true },
    }),
    prisma.chatSession.findMany({
      select: { intentScore: true },
    }),
    prisma.assignment.findMany({
      where: { status: { in: ["PENDING", "ACKNOWLEDGED", "IN_PROGRESS"] } },
      include: {
        session: {
          include: {
            vehicleMentions: {
              include: { vehicle: { select: { msrp: true } } },
              orderBy: { sentiment: "desc" },
              take: 1,
            },
          },
        },
      },
    }),
  ]);

  // Win rate
  const won  = assignmentRows.filter(a => a.status === "CLOSED_WON").length;
  const lost = assignmentRows.filter(a => a.status === "CLOSED_LOST").length;
  const closed = won + lost;
  const winRate = closed > 0 ? Math.round((won / closed) * 100) : 0;

  // Pipeline value
  const pipelineValue = activeAssignments.reduce(
    (sum, a) => sum + (a.session.vehicleMentions[0]?.vehicle.msrp ?? 33_000), 0
  );
  const pipelineLabel = pipelineValue >= 1_000_000
    ? `$${(pipelineValue / 1_000_000).toFixed(1)}M`
    : `$${Math.round(pipelineValue / 1000)}K`;

  // Avg intent
  const avgIntent = sessionRows.length > 0
    ? Math.round(sessionRows.reduce((s, x) => s + x.intentScore, 0) / sessionRows.length * 100)
    : 0;

  // Intent distribution (5 buckets, split at 0.72 handoff threshold)
  const buckets = [
    { color: "bg-gray-300",    min: 0,    max: 0.25, count: 0 },
    { color: "bg-yellow-400",  min: 0.25, max: 0.50, count: 0 },
    { color: "bg-orange-400",  min: 0.50, max: 0.72, count: 0 },
    { color: "bg-green-400",   min: 0.72, max: 0.90, count: 0 },
    { color: "bg-emerald-600", min: 0.90, max: 1.01, count: 0 },
  ];
  for (const { intentScore } of sessionRows) {
    for (const b of buckets) {
      if (intentScore >= b.min && intentScore < b.max) { b.count++; break; }
    }
  }
  const totalForBar = Math.max(sessionRows.length, 1);
  const aboveThreshold = buckets[3].count + buckets[4].count;

  const activeCount = activeAssignments.length;

  return (
    <Link href="/salesperson/metrics">
      <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer mt-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-700">Performance</p>
          <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
            <span>View all</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Win rate + Pipeline */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className={`text-2xl font-bold ${winRate >= 50 ? "text-green-700" : winRate > 0 ? "text-orange-600" : "text-gray-400"}`}>
              {closed > 0 ? `${winRate}%` : "—"}
            </p>
            <p className="text-[10px] text-gray-500 mb-1">Win rate</p>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${winRate >= 50 ? "bg-green-500" : "bg-orange-400"}`}
                style={{ width: `${winRate}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">{won}W · {lost}L</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">{pipelineLabel}</p>
            <p className="text-[10px] text-gray-500 mb-1">Pipeline</p>
            <p className="text-[10px] text-gray-400">{activeCount} active customer{activeCount !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Intent distribution mini-bar */}
        <div className="mb-3">
          <p className="text-[10px] text-gray-500 mb-1.5">Intent distribution</p>
          <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
            {buckets.map((b, i) => (
              <div
                key={i}
                className={b.color}
                style={{ flex: Math.max(b.count, totalForBar * 0.02) }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-gray-400">Low intent</span>
            <span className="text-[10px] text-green-600 font-medium">
              {aboveThreshold} above 72% ↑
            </span>
          </div>
        </div>

        {/* Footer stats */}
        <div className="flex items-center gap-2 pt-2.5 border-t border-gray-100">
          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
            {avgIntent}% avg intent
          </span>
          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
            {won} won
          </span>
          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
            {activeCount} active
          </span>
        </div>

      </div>
    </Link>
  );
}
