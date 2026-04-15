"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";

interface SettingsDropdownProps {
  name: string | null;
  email: string;
  role: string;
}

const ROLE_LABEL: Record<string, string> = {
  SALESPERSON: "Sales Advisor",
  MANAGER: "Manager",
  ADMIN: "Admin",
};

export function SettingsDropdown({ name, email, role }: SettingsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"profile" | "notifications">("profile");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : email.slice(0, 2).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full hover:bg-gray-100 px-2 py-1 transition-colors"
        aria-label="Settings"
      >
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
          {initials}
        </div>
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {(["profile", "notifications"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 text-xs py-2.5 font-medium capitalize transition-colors ${
                  tab === t
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Profile tab */}
          {tab === "profile" && (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                  {initials}
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">{name || email}</p>
                  <p className="text-xs text-gray-500">{email}</p>
                  <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    {ROLE_LABEL[role] ?? role}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-500 mb-1">Account</p>
                <div className="space-y-0.5 text-sm text-gray-700">
                  <p><span className="text-gray-400 w-14 inline-block text-xs">Name</span>{name ?? "—"}</p>
                  <p><span className="text-gray-400 w-14 inline-block text-xs">Email</span>{email}</p>
                  <p><span className="text-gray-400 w-14 inline-block text-xs">Role</span>{ROLE_LABEL[role] ?? role}</p>
                </div>
              </div>
            </div>
          )}

          {/* Notifications tab */}
          {tab === "notifications" && (
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Alerts</p>
              {[
                { label: "New customer assigned", defaultOn: true },
                { label: "Appointment reminders", defaultOn: true },
                { label: "Customer message received", defaultOn: false },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{item.label}</span>
                  <button
                    className={`w-9 h-5 rounded-full transition-colors relative ${
                      item.defaultOn ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        item.defaultOn ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Sign out */}
          <div className="border-t border-gray-100 p-3">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-2 text-sm text-red-600 hover:bg-red-50 rounded-lg px-3 py-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
