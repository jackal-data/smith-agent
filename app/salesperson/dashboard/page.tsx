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
  const serializedAppointments = weekAppointments.map((a) => ({
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
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            SM
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900">Smith Motors</p>
            <p className="text-xs text-gray-700">Sales Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/salesperson/appointments" className="text-sm text-blue-600 hover:underline">
            Appointments
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
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{assignments.length}</p>
            <p className="text-xs text-gray-700 mt-0.5">Active Customers</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{weekAppointments.length}</p>
            <p className="text-xs text-gray-700 mt-0.5">This Week</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {assignments.length > 0
                ? Math.round(
                    (assignments.reduce((s, a) => s + a.session.intentScore, 0) / assignments.length) * 100
                  )
                : 0}%
            </p>
            <p className="text-xs text-gray-700 mt-0.5">Avg Intent Score</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer list */}
          <div className="lg:col-span-2">
            <h2 className="font-semibold text-gray-900 mb-3">Your Customers</h2>
            {assignments.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-700">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm">No active customers yet.</p>
                <p className="text-xs text-gray-600 mt-1">New customers will appear here after handoff.</p>
              </div>
            ) : (
              <div className="space-y-3">
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
            )}
          </div>

          {/* This week strip */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">This Week</h2>
              <Link href="/salesperson/appointments" className="text-xs text-blue-600 hover:underline">
                All appointments →
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
