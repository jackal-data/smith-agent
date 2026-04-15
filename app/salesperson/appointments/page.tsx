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

  const upcoming = appointments.filter((a) => new Date(a.scheduledAt) >= new Date());
  const past = appointments.filter((a) => new Date(a.scheduledAt) < new Date());

  // Serialize for client calendar component
  const calendarAppointments = appointments.map((a) => ({
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
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/salesperson/dashboard" className="text-sm text-blue-600 hover:underline">
              ← Dashboard
            </Link>
            <h1 className="font-bold text-lg text-gray-900">Appointments</h1>
          </div>
          <AppointmentCalendar appointments={calendarAppointments} />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Upcoming ({upcoming.length})</h2>
          {upcoming.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-700 text-sm">
              No upcoming appointments
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((appt) => (
                <div key={appt.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-900">
                      {appt.customer.name || appt.customer.email}
                    </p>
                    {appt.vehicle && (
                      <p className="text-xs text-gray-700">
                        {appt.vehicle.year} {appt.vehicle.make} {appt.vehicle.model}
                      </p>
                    )}
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(appt.scheduledAt).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    {appt.notes && <p className="text-xs text-gray-700 mt-1 italic">{appt.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {appt.type.replace(/_/g, " ")}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      appt.status === "CONFIRMED"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
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
            <h2 className="font-semibold text-gray-700 mb-3 text-sm">Past ({past.length})</h2>
            <div className="space-y-2">
              {past.slice(0, 10).map((appt) => (
                <div key={appt.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between opacity-70">
                  <div>
                    <p className="text-sm text-gray-700">{appt.customer.name || appt.customer.email}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(appt.scheduledAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
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
