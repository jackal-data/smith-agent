import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { PriceRecommendationWidget } from "@/components/salesperson/PriceRecommendationWidget";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !["SALESPERSON", "MANAGER", "ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }

  const { customerId } = await params;

  const assignment = await prisma.assignment.findFirst({
    where: { customerId, salespersonId: session.user.id },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      session: {
        include: {
          messages: { orderBy: { createdAt: "asc" }, select: { id: true, role: true, content: true, createdAt: true } },
          vehicleMentions: { include: { vehicle: true }, orderBy: { mentionedAt: "desc" } },
        },
      },
    },
  });

  if (!assignment) notFound();

  const handoffPayload = JSON.parse(assignment.handoffPayload || "{}");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/salesperson/dashboard" className="text-sm text-blue-600 hover:underline">
            ← Dashboard
          </Link>
          <h1 className="font-bold text-lg text-gray-900">
            {assignment.customer.name || assignment.customer.email}
          </h1>
          <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
            {assignment.status.replace(/_/g, " ")}
          </span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Customer + summary */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer info */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="font-semibold text-sm text-gray-900 mb-3">Customer Info</h2>
            <div className="space-y-1.5 text-sm">
              <p><span className="text-gray-500 w-16 inline-block">Email:</span> {assignment.customer.email}</p>
              {assignment.customer.phone && (
                <p><span className="text-gray-500 w-16 inline-block">Phone:</span> {assignment.customer.phone}</p>
              )}
              <p>
                <span className="text-gray-500 w-16 inline-block">Intent:</span>
                <span className="font-semibold text-blue-700">{Math.round(assignment.intentScore * 100)}%</span>
              </p>
            </div>
          </div>

          {/* AI Summary */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="font-semibold text-sm text-gray-900 mb-2">AI Handoff Summary</h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{assignment.summary}</p>

            {handoffPayload.urgencySignals?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500 mb-1.5">Urgency signals</p>
                <div className="flex flex-wrap gap-1.5">
                  {handoffPayload.urgencySignals.map((s: string, i: number) => (
                    <span key={i} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 flex gap-4 text-xs text-gray-500">
              <span>{handoffPayload.financingMentioned ? "💰 Financing mentioned" : ""}</span>
              <span>{handoffPayload.tradeInMentioned ? "🔄 Trade-in mentioned" : ""}</span>
            </div>
          </div>

          {/* Vehicles of interest */}
          {assignment.session.vehicleMentions.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h2 className="font-semibold text-sm text-gray-900 mb-3">Vehicles of Interest</h2>
              <div className="space-y-2">
                {assignment.session.vehicleMentions.map((vm) => (
                  <div key={vm.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {vm.vehicle.year} {vm.vehicle.make} {vm.vehicle.model} {vm.vehicle.trim}
                      </p>
                      <p className="text-xs text-gray-500">VIN: {vm.vehicle.vin}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      ${vm.vehicle.msrp.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat transcript */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="font-semibold text-sm text-gray-900 mb-3">
              Chat Transcript ({assignment.session.messages.length} messages)
            </h2>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {assignment.session.messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "USER" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                      m.role === "USER"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    <p className="leading-relaxed">{m.content}</p>
                    <p className={`mt-1 text-[10px] ${m.role === "USER" ? "text-blue-200" : "text-gray-400"}`}>
                      {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Pricing widget + actions */}
        <div className="space-y-4">
          <PriceRecommendationWidget sessionId={assignment.session.id} />

          {/* Status update */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-semibold text-sm text-gray-900 mb-3">Update Status</h3>
            <form action={`/api/salesperson/customers/${customerId}`} method="PATCH" className="space-y-2">
              {[
                { value: "ACKNOWLEDGED", label: "Mark Acknowledged" },
                { value: "IN_PROGRESS", label: "Mark In Progress" },
                { value: "CLOSED_WON", label: "Close as Won" },
                { value: "CLOSED_LOST", label: "Close as Lost" },
              ].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className="w-full text-left text-sm px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={assignment.status === s.value}
                >
                  {s.label}
                </button>
              ))}
            </form>
          </div>

          <Link
            href={`/salesperson/appointments?customerId=${customerId}`}
            className="block w-full bg-blue-600 text-white text-center py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Schedule Appointment
          </Link>
        </div>
      </div>
    </div>
  );
}
