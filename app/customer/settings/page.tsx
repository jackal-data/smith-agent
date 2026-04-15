"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CustomerSettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [marketingLoading, setMarketingLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
    if (session?.user) {
      setName(session.user.name ?? "");
      setPhone((session.user as { phone?: string }).phone ?? "");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/customer/profile")
      .then((r) => r.json())
      .then((d) => { if (d.user) setMarketingOptIn(d.user.marketingOptIn); });
  }, [status]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);

    const res = await fetch("/api/customer/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });

    setSaving(false);

    if (!res.ok) {
      setError("Failed to save changes. Please try again.");
      return;
    }

    await update(); // refresh session so name reflects everywhere
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleLogout = () => signOut({ callbackUrl: "/" });

  const handleMarketingToggle = async (checked: boolean) => {
    setMarketingLoading(true);
    setMarketingOptIn(checked);
    await fetch("/api/marketing/opt-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optIn: checked }),
    });
    setMarketingLoading(false);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              SM
            </div>
            <span className="font-semibold text-gray-900">Smith Motors</span>
          </div>
          <Link href="/customer/dashboard" className="text-sm text-blue-600 font-medium hover:underline">
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-700 text-sm mt-1">Manage your profile and preferences</p>
        </div>

        {/* Profile section */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Personal Information</h2>
            <p className="text-xs text-gray-700 mt-0.5">This helps our team reach you about your inquiries</p>
          </div>

          <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
              <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                {name ? name[0].toUpperCase() : session?.user?.email?.[0].toUpperCase() ?? "?"}
              </div>
              <div>
                <p className="font-medium text-gray-900">{name || "No name set"}</p>
                <p className="text-sm text-gray-700">{session?.user?.email}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email"
                value={session?.user?.email ?? ""}
                disabled
                className="w-full border border-gray-100 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 000-0000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Used by our team to follow up on appointments</p>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
              {saved && (
                <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Marketing section */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Notifications &amp; Deals</h2>
            <p className="text-xs text-gray-500 mt-0.5">Control what emails you receive from Smith Motors</p>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Deal alerts &amp; price drops</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Get notified when vehicles you might love go on sale
                </p>
              </div>
              <button
                role="switch"
                aria-checked={marketingOptIn}
                disabled={marketingLoading}
                onClick={() => handleMarketingToggle(!marketingOptIn)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                  marketingOptIn ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                    marketingOptIn ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Account section */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Account</h2>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Sign out</p>
                <p className="text-xs text-gray-700 mt-0.5">You&apos;ll be returned to the sign-in page</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-gray-100 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
