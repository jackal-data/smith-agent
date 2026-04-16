import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { AppointmentCalendar } from "@/components/salesperson/AppointmentCalendar";
import Link from "next/link";

export default async function AppointmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !["SALESPERSON", "MANAGER", "ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }

  const assignments = await prisma.assignment.findMany({
    where: { salespersonId: session.user.id },
    select: { customerId: true },
  });
  const customerIds = assignments.map((a) => a.customerId);

  const appointments = await prisma.appointment.findMany({
    where: { customerId: { in: customerIds } },
    include: {
      customer: { select: { name: true, email: true } },
      vehicle: { select: { make: true, model: true, year: true, vin: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const HARDCODED_DEMO_APPT = {
    id: "hardcoded-demo-appt",
    customer: { name: "Demo Customer", email: "demo@customer.com" },
    vehicle: { make: "Nissan", model: "Rogue", year: 2026, vin: "" },
    type: "TEST_DRIVE",
    scheduledAt: new Date(2026, 3, 16, 10, 0, 0),
    status: "CONFIRMED",
    notes: "Test drive for 2026 Nissan Rogue. Customer has explored financing options.",
  };

  const allAppointments = [HARDCODED_DEMO_APPT, ...appointments];
  // Only the hardcoded demo appointment is shown as upcoming; all DB appointments go to past
  const upcoming = allAppointments.filter((a) => a.id === "hardcoded-demo-appt");
  const past = allAppointments.filter((a) => a.id !== "hardcoded-demo-appt");

  // Serialize for client calendar component
  const calendarAppointments = allAppointments.map((a) => ({
    id: a.id,
    customerName: a.customer.name,
    customerEmail: a.customer.email,
    vehicleLabel: a.vehicle
      ? `${a.vehicle.year} ${a.vehicle.make} ${a.vehicle.model}`
      : null,
    type: a.type,
    scheduledAt: new Date(a.scheduledAt).toISOString(),
    status: a.status,
    notes: a.notes,
  }));

  return (
    <div className="min-h-screen bg-[#F0F4FB]">
      <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/salesperson/dashboard" className="text-xs font-semibold text-slate-500 hover:text-slate-900 uppercase tracking-[0.08em] transition-colors">
              ← Dashboard
            </Link>
            <div className="w-px h-4 bg-slate-200" />
            <h1 className="font-semibold text-slate-900 tracking-tight">Appointments</h1>
          </div>
          <AppointmentCalendar appointments={calendarAppointments} />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">
            Upcoming — {upcoming.length}
          </p>
          {upcoming.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-md p-8 text-center text-slate-400 text-sm">
              No upcoming appointments
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((appt) => (
                <div key={appt.id} className="bg-white border border-slate-200 rounded-md p-4 flex items-center justify-between hover:border-slate-300 transition-colors">
                  <div>
                    <p className="font-semibold text-sm text-slate-900">
                      {appt.customer.name || appt.customer.email}
                    </p>
                    {appt.vehicle && (
                      <p className="text-xs text-slate-500">
                        {appt.vehicle.year} {appt.vehicle.make} {appt.vehicle.model}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(appt.scheduledAt).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    {appt.notes && <p className="text-xs text-slate-500 mt-1 italic">{appt.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 font-semibold uppercase tracking-[0.06em]">
                      {appt.type.replace(/_/g, " ")}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 font-semibold uppercase tracking-[0.06em] ${
                      appt.status === "CONFIRMED"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}>
                      {appt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {past.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">
              Past — {past.length}
            </p>
            <div className="space-y-1.5">
              {past.slice(0, 10).map((appt) => (
                <div key={appt.id} className="bg-white border border-slate-200 rounded-md p-3 flex items-center justify-between opacity-60">
                  <div>
                    <p className="text-sm text-slate-700">{appt.customer.name || appt.customer.email}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(appt.scheduledAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 font-semibold uppercase tracking-[0.06em]">
                    {appt.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
