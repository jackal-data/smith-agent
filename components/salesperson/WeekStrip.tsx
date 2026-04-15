"use client";

import { useState } from "react";

export interface StripAppointment {
  id: string;
  customerName: string | null;
  customerEmail: string;
  vehicleLabel: string | null;
  type: string;
  scheduledAt: string;
  status: string;
  notes: string | null;
}

interface WeekStripProps {
  appointments: StripAppointment[];
}

const TYPE_COLORS: Record<string, string> = {
  TEST_DRIVE:       "bg-blue-100 text-blue-700",
  FINANCING_REVIEW: "bg-purple-100 text-purple-700",
  DELIVERY:         "bg-green-100 text-green-700",
  SERVICE:          "bg-orange-100 text-orange-700",
};

function formatType(t: string) {
  return t.replace(/_/g, " ");
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export function WeekStrip({ appointments }: WeekStripProps) {
  const [selected, setSelected] = useState<StripAppointment | null>(null);

  // Build 7-day window starting today
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  const apptsByDay = days.map((day) =>
    appointments.filter((a) => sameDay(new Date(a.scheduledAt), day))
  );

  const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-700">This Week</p>
          <p className="text-xs text-gray-400">
            {today.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {" "}
            {days[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        </div>
        <div className="grid grid-cols-7 divide-x divide-gray-100">
          {days.map((day, i) => {
            const isToday = sameDay(day, today);
            const dayAppts = apptsByDay[i];
            return (
              <div key={i} className="flex flex-col items-center py-2 px-0.5 min-h-[64px]">
                <p className={`text-[10px] font-medium mb-0.5 ${isToday ? "text-blue-600" : "text-gray-400"}`}>
                  {DAY_NAMES[day.getDay()]}
                </p>
                <p className={`text-sm font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday ? "bg-blue-600 text-white" : "text-gray-700"
                }`}>
                  {day.getDate()}
                </p>
                <div className="flex flex-col gap-0.5 w-full px-0.5">
                  {dayAppts.slice(0, 2).map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setSelected(a)}
                      className={`w-full text-[9px] truncate rounded px-1 py-0.5 text-left ${
                        TYPE_COLORS[a.type] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {a.customerName?.split(" ")[0] ?? "Guest"}
                    </button>
                  ))}
                  {dayAppts.length > 2 && (
                    <p className="text-[9px] text-gray-400 text-center">+{dayAppts.length - 2}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail popup */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900">{selected.customerName || selected.customerEmail}</p>
                <p className="text-xs text-gray-500">{selected.customerEmail}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[selected.type] ?? "bg-gray-100 text-gray-600"}`}>
                  {formatType(selected.type)}
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{selected.status}</span>
              </div>
              {selected.vehicleLabel && (
                <p className="text-gray-700 text-xs">{selected.vehicleLabel}</p>
              )}
              <p className="text-gray-900 font-medium">
                {new Date(selected.scheduledAt).toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric",
                  hour: "numeric", minute: "2-digit",
                })}
              </p>
              {selected.notes && <p className="text-gray-600 text-xs italic">{selected.notes}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
