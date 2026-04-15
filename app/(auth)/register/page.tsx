"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "CUSTOMER" as "CUSTOMER" | "SALESPERSON",
    registrationKey: "",
    marketingOptIn: true,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Registration failed");
      setLoading(false);
      return;
    }

    // Auto sign-in after registration
    await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    if (form.role === "SALESPERSON") {
      router.push("/salesperson/dashboard");
    } else {
      router.push("/customer/chat");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">
            SM
          </div>
          <h1 className="font-bold text-xl text-gray-900">Create account</h1>
          <p className="text-sm text-gray-700 mt-1">Join Smith Motors</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Min. 8 characters"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Account Type</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as "CUSTOMER" | "SALESPERSON" })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="CUSTOMER">Customer</option>
              <option value="SALESPERSON">Salesperson</option>
            </select>
          </div>

          {form.role === "SALESPERSON" && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Registration Key</label>
              <input
                type="password"
                value={form.registrationKey}
                onChange={(e) => setForm({ ...form, registrationKey: e.target.value })}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Provided by your manager"
              />
            </div>
          )}

          {form.role === "CUSTOMER" && (
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.marketingOptIn}
                onChange={(e) => setForm({ ...form, marketingOptIn: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs text-gray-600">
                Sign me up for deals &amp; price drop alerts from Smith Motors
              </span>
            </label>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-xs text-center text-gray-700 mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
