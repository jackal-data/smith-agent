import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { CustomerCard } from "@/components/salesperson/CustomerCard";
import { WeekStrip } from "@/components/salesperson/WeekStrip";
import { SettingsDropdown } from "@/components/salesperson/SettingsDropdown";
import { MetricsPreviewCard } from "@/components/salesperson/MetricsPreviewCard";
import { DealAlertModal } from "@/components/salesperson/DealAlertModal";
import Link from "next/link";

export default async function SalespersonDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || !["SALESPERSON", "MANAGER", "ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }

  const assignments = await prisma.assignment.findMany({
    where: {
      salespersonId: session.user.id,
      status: { notIn: ["CLOSED_WON", "CLOSED_LOST"] },
    },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      session: {
        select: {
          id: true,
          status: true,
          intentScore: true,
          createdAt: true,
          messages: {
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { intentScore: "desc" },
  });

  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);

  const weekAppointments = await prisma.appointment.findMany({
    where: {
      customer: { managedBy: { some: { salespersonId: session.user.id } } },
      scheduledAt: { gte: new Date(), lte: weekEnd },
    },
    include: {
      customer: { select: { name: true, email: true } },
      vehicle: { select: { make: true, model: true, year: true, daysOnLot: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  // Serialize for client components (Dates → ISO strings)
  const serializedAppointments = [
    // Hardcoded Demo Customer appointment
    {
      id: "hardcoded-demo-appt",
      customerName: "Demo Customer",
      customerEmail: "demo@customer.com",
      vehicleLabel: "2026 Nissan Rogue",
      type: "TEST_DRIVE",
      scheduledAt: new Date(2026, 3, 16, 10, 0, 0).toISOString(),
      status: "CONFIRMED",
      notes: "Test drive for 2026 Nissan Rogue. Customer has explored financing options.",
    },
    ...weekAppointments.map((a) => ({
      id: a.id,
      customerName: a.customer.name,
      customerEmail: a.customer.email,
      vehicleLabel: a.vehicle
        ? `${a.vehicle.year} ${a.vehicle.make} ${a.vehicle.model}`
        : null,
      type: a.type,
      scheduledAt: a.scheduledAt.toISOString(),
      status: a.status,
      notes: a.notes,
    })),
  ];

  return (
    <div className="min-h-screen bg-[#F0F4FB]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-navy flex items-center justify-center text-white font-bold text-xs tracking-tight">
            SM
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-900 tracking-tight">Smith Motors</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.1em]">Sales Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/salesperson/appointments" className="text-xs font-semibold text-slate-500 hover:text-slate-900 uppercase tracking-[0.08em] transition-colors">
            Appointments
          </Link>
          <Link href="/salesperson/metrics" className="text-xs font-semibold text-slate-500 hover:text-slate-900 uppercase tracking-[0.08em] transition-colors">
            Metrics
          </Link>
          {["MANAGER", "ADMIN"].includes(session.user.role) && <DealAlertModal />}
          <SettingsDropdown
            name={session.user.name ?? null}
            email={session.user.email!}
            role={session.user.role}
          />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* KPI row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-slate-200 border-l-4 border-l-navy p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.1em] mb-2">Active Customers</p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{assignments.length}</p>
          </div>
          <div className="bg-white border border-slate-200 border-l-4 border-l-navy p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.1em] mb-2">This Week</p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{weekAppointments.length}</p>
          </div>
          <div className="bg-white border border-slate-200 border-l-4 border-l-navy p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.1em] mb-2">Avg Intent</p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">
              {assignments.length > 0
                ? Math.round(
                    (assignments.reduce((s, a) => s + a.session.intentScore, 0) / assignments.length) * 100
                  )
                : 0}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Customer list */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-[0.1em]">Your Customers</h2>
              <span className="text-xs text-slate-400">{assignments.length} active</span>
            </div>
            <div className="space-y-2">
              {/* Hardcoded Demo Customer entry */}
              <CustomerCard
                key="hardcoded-demo"
                assignmentId="hardcoded-demo"
                customerId="hardcoded-demo-customer"
                sessionId="hardcoded-demo-session"
                customerName="Demo Customer"
                customerEmail="demo@customer.com"
                intentScore={0.87}
                assignmentStatus="IN_PROGRESS"
                lastActivity={new Date(Date.now() - 1000 * 60 * 18).toISOString()}
                summary="Customer is interested in a 2026 Nissan Rogue. Test drive scheduled for Thursday, April 16 at 10:00 AM. Has explored financing options and appears highly motivated to buy. Recommended next step: confirm test drive and prepare a financing quote."
                recommendedMarkup={3.5}
              />
              {assignments.map((a) => (
                <CustomerCard
                  key={a.id}
                  assignmentId={a.id}
                  customerId={a.customer.id}
                  sessionId={a.session.id}
                  customerName={a.customer.name ?? undefined}
                  customerEmail={a.customer.email}
                  intentScore={a.session.intentScore}
                  assignmentStatus={a.status}
                  lastActivity={(a.session.messages[0]?.createdAt ?? a.session.createdAt).toISOString()}
                  summary={a.summary}
                  recommendedMarkup={a.recommendedMarkup ?? undefined}
                />
              ))}
            </div>
          </div>

          {/* This week strip */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-[0.1em]">This Week</h2>
              <Link href="/salesperson/appointments" className="text-xs font-semibold text-blue-700 hover:underline">
                All →
              </Link>
            </div>
            <WeekStrip appointments={serializedAppointments} />
            <MetricsPreviewCard />
          </div>
        </div>
      </div>
    </div>
  );
}
