"use client";

import { useState } from "react";

export interface CalendarAppointment {
  id: string;
  customerName: string | null;
  customerEmail: string;
  vehicleLabel: string | null;
  type: string;
  scheduledAt: string;
  status: string;
  notes: string | null;
}

interface AppointmentCalendarProps {
  appointments: CalendarAppointment[];
}

const TYPE_COLORS: Record<string, string> = {
  TEST_DRIVE:       "bg-blue-100 text-blue-700 border-blue-200",
  FINANCING_REVIEW: "bg-purple-100 text-purple-700 border-purple-200",
  DELIVERY:         "bg-green-100 text-green-700 border-green-200",
  SERVICE:          "bg-orange-100 text-orange-700 border-orange-200",
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED:  "bg-yellow-100 text-yellow-700",
  CONFIRMED:  "bg-green-100 text-green-700",
  COMPLETED:  "bg-gray-100 text-gray-600",
  CANCELLED:  "bg-red-100 text-red-600",
  NO_SHOW:    "bg-red-50 text-red-500",
};

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export function AppointmentCalendar({ appointments }: AppointmentCalendarProps) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<CalendarAppointment | null>(null);
  const [dayDetail, setDayDetail] = useState<Date | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const apptsByDay = (d: number) => {
    const date = new Date(year, month, d);
    return appointments.filter((a) => sameDay(new Date(a.scheduledAt), date));
  };

  const MONTHS = ["January","February","March","April","May","June",
    "July","August","September","October","November","December"];
  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const dayAppts = dayDetail
    ? appointments.filter((a) => sameDay(new Date(a.scheduledAt), dayDetail))
    : [];

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Calendar View
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => { setOpen(false); setDayDetail(null); setSelected(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Calendar header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="font-bold text-gray-900">{MONTHS[month]} {year}</h2>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Day names row */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs text-gray-400 font-medium py-2">{d}</div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7">
              {/* leading blank cells */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`blank-${i}`} className="h-16 border-b border-r border-gray-50" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                const isToday = sameDay(new Date(year, month, d), today);
                const dayApptList = apptsByDay(d);
                const isSelected = dayDetail && sameDay(new Date(year, month, d), dayDetail);
                return (
                  <div
                    key={d}
                    onClick={() => setDayDetail(dayApptList.length > 0 ? new Date(year, month, d) : null)}
                    className={`h-16 border-b border-r border-gray-50 p-1 text-xs cursor-pointer transition-colors ${
                      dayApptList.length > 0 ? "hover:bg-blue-50" : ""
                    } ${isSelected ? "bg-blue-50" : ""}`}
                  >
                    <p className={`w-5 h-5 flex items-center justify-center rounded-full mb-0.5 font-medium ${
                      isToday ? "bg-blue-600 text-white" : "text-gray-700"
                    }`}>
                      {d}
                    </p>
                    {dayApptList.slice(0, 2).map((a) => (
                      <p
                        key={a.id}
                        onClick={(e) => { e.stopPropagation(); setSelected(a); setDayDetail(null); }}
                        className={`truncate text-[10px] rounded px-1 mb-0.5 cursor-pointer border ${
                          TYPE_COLORS[a.type] ?? "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {new Date(a.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        {" "}{a.customerName?.split(" ")[0] ?? "Guest"}
                      </p>
                    ))}
                    {dayApptList.length > 2 && (
                      <p className="text-[10px] text-gray-400 pl-1">+{dayApptList.length - 2} more</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Day detail panel */}
            {dayDetail && dayAppts.length > 0 && (
              <div className="border-t border-gray-100 p-4 max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-gray-500 mb-2">
                  {dayDetail.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
                <div className="space-y-2">
                  {dayAppts.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => { setSelected(a); setDayDetail(null); }}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{a.customerName || a.customerEmail}</p>
                        {a.vehicleLabel && <p className="text-xs text-gray-500">{a.vehicleLabel}</p>}
                        <p className="text-xs text-gray-400">
                          {new Date(a.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[a.type]?.split(" border")[0] ?? "bg-gray-100 text-gray-600"}`}>
                          {a.type.replace(/_/g, " ")}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[a.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {a.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
              <button onClick={() => { setOpen(false); setDayDetail(null); setSelected(null); }} className="text-sm text-gray-500 hover:text-gray-700">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-gray-900 text-base">{selected.customerName || selected.customerEmail}</p>
                <p className="text-xs text-gray-500">{selected.customerEmail}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <span className={`text-xs px-2 py-1 rounded-full font-medium border ${TYPE_COLORS[selected.type] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                  {selected.type.replace(/_/g, " ")}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[selected.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {selected.status}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {new Date(selected.scheduledAt).toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric",
                  hour: "numeric", minute: "2-digit",
                })}
              </p>
              {selected.vehicleLabel && (
                <p className="text-sm text-gray-700">{selected.vehicleLabel}</p>
              )}
              {selected.notes && (
                <p className="text-sm text-gray-600 italic bg-gray-50 rounded-lg p-2">{selected.notes}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
