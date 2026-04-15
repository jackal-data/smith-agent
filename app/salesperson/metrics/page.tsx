import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";

// ─── Inline chart primitives ──────────────────────────────────────

const KPI_COLORS = {
  green:  { num: "text-green-700",  bg: "bg-green-50",  border: "border-green-100" },
  blue:   { num: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-100"  },
  purple: { num: "text-purple-700", bg: "bg-purple-50", border: "border-purple-100" },
  orange: { num: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
} as const;

function KpiCard({ label, value, sub, color }: {
  label: string;
  value: string;
  sub: string;
  color: keyof typeof KPI_COLORS;
}) {
  const c = KPI_COLORS[color];
  return (
    <div className={`rounded-xl border p-5 ${c.bg} ${c.border}`}>
      <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
      <p className={`text-3xl font-bold ${c.num}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1.5">{sub}</p>
    </div>
  );
}

function FunnelBar({ label, value, max, color, pct }: {
  label: string; value: number; max: number; color: string; pct?: string;
}) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 3 : 0) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-28 text-right shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-lg h-8 overflow-hidden">
        <div
          className={`h-full ${color} rounded-lg flex items-center px-3 transition-all duration-500`}
          style={{ width: `${width}%` }}
        >
          {width > 8 && (
            <span className="text-xs text-white font-semibold">{value.toLocaleString()}</span>
          )}
        </div>
      </div>
      {width <= 8 && value > 0 && <span className="text-xs text-gray-600 w-6">{value}</span>}
      {pct && <span className="text-xs text-gray-400 w-10 shrink-0 text-right">{pct}</span>}
    </div>
  );
}

function IntentBar({ label, count, max, color }: {
  label: string; count: number; max: number; color: string;
}) {
  const pct = max > 0 ? Math.max((count / max) * 100, count > 0 ? 4 : 0) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs font-semibold text-gray-700">{count}</span>
      </div>
      <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default async function MetricsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !["SALESPERSON", "MANAGER", "ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }

  const [
    totalSessions,
    handoffSessions,
    allAssignmentStatuses,
    allIntentScores,
    closedWonTimings,
    activeWithVehicles,
    reps,
    statusCounts,
  ] = await Promise.all([
    prisma.chatSession.count(),
    prisma.chatSession.count({ where: { handoffTriggered: true } }),

    // All assignment statuses for funnel + pipeline
    prisma.assignment.findMany({
      select: { status: true, intentScore: true },
    }),

    // Intent scores for distribution
    prisma.chatSession.findMany({
      select: { intentScore: true },
    }),

    // Timing data for closed-won
    prisma.assignment.findMany({
      where: { status: "CLOSED_WON" },
      select: { createdAt: true, updatedAt: true },
    }),

    // Active assignments with vehicle mentions for pipeline value
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

    // Per-rep leaderboard data
    prisma.user.findMany({
      where: { role: "SALESPERSON" },
      select: {
        name: true,
        email: true,
        specializations: true,
        managedBy: {
          select: { status: true, intentScore: true },
        },
      },
      orderBy: { name: "asc" },
    }),

    // Status distribution for pipeline breakdown
    prisma.assignment.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
  ]);

  // ── Derived KPIs ─────────────────────────────────────────────────

  const wonCount  = allAssignmentStatuses.filter(a => a.status === "CLOSED_WON").length;
  const lostCount = allAssignmentStatuses.filter(a => a.status === "CLOSED_LOST").length;
  const closedCount = wonCount + lostCount;
  const winRate = closedCount > 0 ? wonCount / closedCount : 0;

  const avgDaysToClose = closedWonTimings.length > 0
    ? closedWonTimings.reduce((s, a) => s + (a.updatedAt.getTime() - a.createdAt.getTime()), 0)
      / closedWonTimings.length / 86_400_000
    : 0;

  const avgIntent = allIntentScores.length > 0
    ? allIntentScores.reduce((s, x) => s + x.intentScore, 0) / allIntentScores.length
    : 0;

  const pipelineValue = activeWithVehicles.reduce((sum, a) => {
    return sum + (a.session.vehicleMentions[0]?.vehicle.msrp ?? 33_000);
  }, 0);

  // ── Intent distribution (split at the 0.72 handoff threshold) ────

  const intentBuckets = [
    { label: "0–25%  browsing",    min: 0,    max: 0.25, color: "bg-gray-300",    count: 0 },
    { label: "25–50%  interested", min: 0.25, max: 0.50, color: "bg-yellow-400",  count: 0 },
    { label: "50–72%  engaged",    min: 0.50, max: 0.72, color: "bg-orange-400",  count: 0 },
    { label: "72–90%  hot",        min: 0.72, max: 0.90, color: "bg-green-500",   count: 0 },
    { label: "90–100%  closing",   min: 0.90, max: 1.01, color: "bg-emerald-600", count: 0 },
  ];
  for (const { intentScore } of allIntentScores) {
    for (const b of intentBuckets) {
      if (intentScore >= b.min && intentScore < b.max) { b.count++; break; }
    }
  }
  const maxBucket = Math.max(...intentBuckets.map(b => b.count), 1);

  // ── Conversion funnel ─────────────────────────────────────────────

  const totalAssignments = allAssignmentStatuses.length;
  const funnelMax = totalSessions;
  const funnelStages = [
    { label: "Chats started",  value: totalSessions,     color: "bg-blue-300",   pct: undefined },
    { label: "Handed off",     value: handoffSessions,   color: "bg-blue-500",
      pct: totalSessions > 0 ? `${Math.round(handoffSessions / totalSessions * 100)}%` : undefined },
    { label: "Assigned to rep",value: totalAssignments,  color: "bg-indigo-500",
      pct: handoffSessions > 0 ? `${Math.round(totalAssignments / handoffSessions * 100)}%` : undefined },
    { label: "Closed won",     value: wonCount,          color: "bg-green-500",
      pct: totalAssignments > 0 ? `${Math.round(wonCount / totalAssignments * 100)}%` : undefined },
  ];

  // ── Pipeline by status ────────────────────────────────────────────

  const statusMap: Record<string, number> = {};
  for (const row of statusCounts) statusMap[row.status] = row._count.id;
  const pipelineStages = [
    { label: "Pending",     key: "PENDING",      color: "bg-yellow-400" },
    { label: "Acknowledged",key: "ACKNOWLEDGED", color: "bg-blue-400"   },
    { label: "In Progress", key: "IN_PROGRESS",  color: "bg-green-400"  },
  ];
  const pipelineMax = Math.max(...pipelineStages.map(s => statusMap[s.key] ?? 0), 1);

  // ── Leaderboard ───────────────────────────────────────────────────

  const leaderboard = reps.map((rep) => {
    const won    = rep.managedBy.filter(a => a.status === "CLOSED_WON").length;
    const lost   = rep.managedBy.filter(a => a.status === "CLOSED_LOST").length;
    const active = rep.managedBy.filter(a => ["PENDING","ACKNOWLEDGED","IN_PROGRESS"].includes(a.status)).length;
    const closed = won + lost;
    const rate   = closed > 0 ? Math.round((won / closed) * 100) : null;
    const avgI   = rep.managedBy.length > 0
      ? Math.round(rep.managedBy.reduce((s, a) => s + a.intentScore, 0) / rep.managedBy.length * 100)
      : 0;
    let specs: string[] = [];
    try { specs = JSON.parse(rep.specializations ?? "[]"); } catch { /* */ }
    return { name: rep.name ?? rep.email, active, won, lost, rate, avgIntent: avgI, specs };
  }).sort((a, b) => b.won - a.won || b.active - a.active);

  // ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/salesperson/dashboard" className="text-sm text-blue-600 hover:underline">
              ← Dashboard
            </Link>
            <h1 className="font-bold text-lg text-gray-900">Metrics</h1>
          </div>
          <span className="text-xs text-gray-400">
            All-time &nbsp;·&nbsp; {totalSessions.toLocaleString()} sessions
          </span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Win Rate"
            value={`${Math.round(winRate * 100)}%`}
            sub={`${wonCount} won · ${closedCount} closed`}
            color="green"
          />
          <KpiCard
            label="Avg Days to Close"
            value={avgDaysToClose > 0 ? `${avgDaysToClose.toFixed(1)}d` : "—"}
            sub={closedWonTimings.length > 0 ? `from ${closedWonTimings.length} closed deals` : "No closed deals yet"}
            color="blue"
          />
          <KpiCard
            label="Avg Intent Score"
            value={`${Math.round(avgIntent * 100)}%`}
            sub={`across ${totalSessions.toLocaleString()} sessions`}
            color="purple"
          />
          <KpiCard
            label="Pipeline Value"
            value={pipelineValue >= 1_000_000
              ? `$${(pipelineValue / 1_000_000).toFixed(1)}M`
              : `$${Math.round(pipelineValue / 1000)}K`}
            sub={`${activeWithVehicles.length} active customers`}
            color="orange"
          />
        </div>

        {/* ── Funnel + Intent distribution ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Conversion funnel */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-sm text-gray-900 mb-4">Conversion Funnel</h2>
            <div className="space-y-3">
              {funnelStages.map((s) => (
                <FunnelBar
                  key={s.label}
                  label={s.label}
                  value={s.value}
                  max={funnelMax}
                  color={s.color}
                  pct={s.pct}
                />
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-bold text-blue-700">
                  {totalSessions > 0 ? `${Math.round(handoffSessions / totalSessions * 100)}%` : "—"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Handoff rate</p>
              </div>
              <div>
                <p className="text-xl font-bold text-indigo-700">
                  {handoffSessions > 0 ? `${Math.round(totalAssignments / handoffSessions * 100)}%` : "—"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Assignment rate</p>
              </div>
              <div>
                <p className="text-xl font-bold text-green-700">
                  {`${Math.round(winRate * 100)}%`}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Close rate</p>
              </div>
            </div>
          </div>

          {/* Intent distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-sm text-gray-900 mb-4">Intent Distribution</h2>
            <div className="space-y-3">
              {intentBuckets.map((b) => (
                <IntentBar
                  key={b.label}
                  label={b.label}
                  count={b.count}
                  max={maxBucket}
                  color={b.color}
                />
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-gradient-to-r from-gray-300 via-yellow-400 via-orange-400 to-green-500" />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>0%</span>
                <span className="text-orange-500 font-medium">72% threshold</span>
                <span>100%</span>
              </div>
              <p className="text-xs text-gray-500 pt-1">
                <span className="font-semibold text-green-700">
                  {intentBuckets[3].count + intentBuckets[4].count}
                </span> sessions above handoff threshold
              </p>
            </div>
          </div>
        </div>

        {/* ── Pipeline breakdown + mini stats ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Pipeline by stage */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-sm text-gray-900 mb-4">Active Pipeline</h2>
            <div className="space-y-3">
              {pipelineStages.map((s) => {
                const count = statusMap[s.key] ?? 0;
                return (
                  <div key={s.key} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-24 shrink-0">{s.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                      <div
                        className={`h-full ${s.color} rounded-full flex items-center justify-end pr-2 transition-all duration-500`}
                        style={{ width: `${Math.max((count / pipelineMax) * 100, count > 0 ? 8 : 0)}%` }}
                      >
                        {count > 0 && (
                          <span className="text-[10px] text-white font-semibold">{count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 space-y-1 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Total active</span>
                <span className="font-semibold text-gray-900">{activeWithVehicles.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg intent (active)</span>
                <span className="font-semibold text-gray-900">
                  {activeWithVehicles.length > 0
                    ? `${Math.round(allAssignmentStatuses.filter(a => ["PENDING","ACKNOWLEDGED","IN_PROGRESS"].includes(a.status)).reduce((s, a) => s + a.intentScore, 0) / activeWithVehicles.length * 100)}%`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Avg markup rec.</span>
                <span className="font-semibold text-gray-900">—</span>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-sm text-gray-900">Salesperson Leaderboard</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Rep","Active","Won","Lost","Win Rate","Avg Intent","Specializations"].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-2.5 first:pl-5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {leaderboard.map((rep, i) => (
                    <tr key={rep.name} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          {i === 0 && <span>🥇</span>}
                          {i === 1 && <span>🥈</span>}
                          {i === 2 && <span>🥉</span>}
                          {i >= 3 && <span className="text-xs text-gray-400 w-4">{i + 1}</span>}
                          <span className="font-medium text-gray-900 text-sm">{rep.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          {rep.active}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-green-700">{rep.won}</td>
                      <td className="px-4 py-3 text-gray-400">{rep.lost}</td>
                      <td className="px-4 py-3">
                        {rep.rate !== null
                          ? <span className={`font-semibold ${rep.rate >= 50 ? "text-green-700" : "text-orange-600"}`}>
                              {rep.rate}%
                            </span>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{rep.avgIntent}%</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {rep.specs.map(s => (
                            <span key={s} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                              {s}
                            </span>
                          ))}
                          {rep.specs.length === 0 && <span className="text-xs text-gray-300">—</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {leaderboard.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">
                        No salesperson data yet — run the seed to populate.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
