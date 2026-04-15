"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function LandingPage() {
  const [custEmail, setCustEmail] = useState("");
  const [custPassword, setCustPassword] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empPassword, setEmpPassword] = useState("");
  const [custError, setCustError] = useState("");
  const [empError, setEmpError] = useState("");
  const [loading, setLoading] = useState<"customer" | "employee" | null>(null);
  const [empOpen, setEmpOpen] = useState(false);
  const router = useRouter();

  const handleCustomerSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustError("");
    setLoading("customer");
    const result = await signIn("credentials", { email: custEmail, password: custPassword, redirect: false });
    setLoading(null);
    if (result?.error) { setCustError("Invalid email or password"); return; }
    router.push("/customer/chat");
  };

  const handleEmployeeSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmpError("");
    setLoading("employee");
    const result = await signIn("credentials", { email: empEmail, password: empPassword, redirect: false });
    setLoading(null);
    if (result?.error) { setEmpError("Invalid email or password"); return; }
    const res = await fetch("/api/auth/session");
    const session = await res.json();
    if (["SALESPERSON", "MANAGER", "ADMIN"].includes(session?.user?.role)) {
      router.push("/salesperson/dashboard");
    } else {
      setEmpError("This portal is for employees only.");
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600;700&family=Barlow+Condensed:wght@500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .sm-root {
          display: flex;
          flex-direction: column;
          height: 100vh;
          font-family: 'Barlow', sans-serif;
          background: #0B1F36;
          overflow: hidden;
        }

        /* ── Main area ── */
        .sm-main {
          flex: 1;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow: hidden;
          min-height: 0;
        }

        /* ── Car silhouette ── */
        .sm-car-bg {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -54%);
          width: min(860px, 92vw);
          pointer-events: none;
          user-select: none;
          opacity: 1;
        }

        /* ── Brand ── */
        .sm-brand {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 40px;
          padding-bottom: 28px;
          gap: 10px;
        }
        .sm-brand-mark {
          width: 36px;
          height: 36px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sm-brand-mark-outer {
          width: 36px;
          height: 36px;
          border: 1.5px solid rgba(255,255,255,0.3);
          transform: rotate(45deg);
          position: absolute;
        }
        .sm-brand-mark-inner {
          width: 14px;
          height: 14px;
          background: #1B6BCC;
          transform: rotate(45deg);
        }
        .sm-brand-name {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 700;
          font-size: 22px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #FFFFFF;
        }
        .sm-brand-sub {
          font-size: 11px;
          font-weight: 400;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          margin-top: -4px;
        }

        /* ── Customer card ── */
        .sm-card-wrap {
          position: relative;
          z-index: 2;
          width: 100%;
          display: flex;
          justify-content: center;
          padding: 0 16px;
          flex: 1;
          align-items: flex-start;
        }
        .sm-card {
          background: #FFFFFF;
          width: 100%;
          max-width: 400px;
          padding: 36px 40px 32px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.45), 0 4px 16px rgba(0,0,0,0.2);
        }
        .sm-card-eyebrow {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #1B6BCC;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .sm-card-eyebrow::before {
          content: '';
          display: block;
          width: 16px;
          height: 2px;
          background: #1B6BCC;
          flex-shrink: 0;
        }
        .sm-card-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 700;
          font-size: 28px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #0B1F36;
          margin-bottom: 24px;
          line-height: 1;
        }
        .sm-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 14px;
        }
        .sm-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #5B738A;
        }
        .sm-input {
          font-family: 'Barlow', sans-serif;
          font-size: 14px;
          font-weight: 400;
          padding: 10px 13px;
          background: #F4F7FA;
          border: 1.5px solid #D0D9E3;
          color: #0B1F36;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
          width: 100%;
        }
        .sm-input::placeholder { color: #9EB3C5; }
        .sm-input:focus {
          border-color: #1B6BCC;
          background: #FFFFFF;
        }
        .sm-error-box {
          font-size: 12px;
          font-weight: 500;
          color: #B91C1C;
          background: #FEF2F2;
          border-left: 2px solid #B91C1C;
          padding: 8px 12px;
          margin-bottom: 10px;
          letter-spacing: 0.03em;
        }
        .sm-submit {
          width: 100%;
          background: #1B6BCC;
          color: #FFFFFF;
          border: none;
          padding: 13px 20px;
          font-family: 'Barlow', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 6px;
          transition: background 0.2s;
        }
        .sm-submit:hover:not(:disabled) { background: #155BA8; }
        .sm-submit:disabled { opacity: 0.45; cursor: not-allowed; }
        .sm-register {
          font-size: 12px;
          color: #7B9AB2;
          margin-top: 16px;
          text-align: center;
          font-weight: 400;
        }
        .sm-register a {
          color: #1B6BCC;
          font-weight: 600;
          text-decoration: none;
        }
        .sm-register a:hover { text-decoration: underline; }

        /* ── Employee dock ── */
        .sm-dock {
          flex-shrink: 0;
          background: #060F1C;
          border-top: 1px solid rgba(255,255,255,0.07);
          z-index: 10;
          overflow: hidden;
          transition: max-height 0.4s cubic-bezier(0.77, 0, 0.175, 1);
          max-height: 58px;
        }
        .sm-dock.open { max-height: 320px; }

        .sm-dock-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          height: 58px;
          cursor: pointer;
          user-select: none;
          transition: background 0.15s;
        }
        .sm-dock-bar:hover { background: rgba(255,255,255,0.03); }

        .sm-dock-bar-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .sm-dock-pip {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4A7FB5;
          flex-shrink: 0;
        }
        .sm-dock-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.45);
        }
        .sm-dock-bar-right {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.3);
        }
        .sm-dock-chevron {
          transition: transform 0.35s ease;
          color: rgba(255,255,255,0.3);
        }
        .sm-dock.open .sm-dock-chevron { transform: rotate(180deg); }

        .sm-dock-form {
          padding: 0 40px 28px;
        }
        .sm-dock-form-inner {
          display: flex;
          gap: 12px;
          align-items: flex-end;
          flex-wrap: wrap;
        }
        .sm-dock-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
          flex: 1;
          min-width: 140px;
        }
        .sm-dock-label-field {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.3);
        }
        .sm-dock-input {
          font-family: 'Barlow', sans-serif;
          font-size: 13px;
          font-weight: 400;
          padding: 9px 12px;
          background: rgba(255,255,255,0.05);
          border: 1.5px solid rgba(255,255,255,0.1);
          color: #FFFFFF;
          outline: none;
          transition: border-color 0.2s;
          width: 100%;
        }
        .sm-dock-input::placeholder { color: rgba(255,255,255,0.2); }
        .sm-dock-input:focus { border-color: rgba(255,255,255,0.35); }
        .sm-dock-submit {
          background: rgba(255,255,255,0.1);
          border: 1.5px solid rgba(255,255,255,0.2);
          color: #FFFFFF;
          padding: 9px 22px;
          font-family: 'Barlow', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
          white-space: nowrap;
          height: 40px;
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .sm-dock-submit:hover:not(:disabled) {
          background: rgba(255,255,255,0.16);
          border-color: rgba(255,255,255,0.4);
        }
        .sm-dock-submit:disabled { opacity: 0.4; cursor: not-allowed; }
        .sm-dock-error {
          width: 100%;
          font-size: 11px;
          color: #FCA5A5;
          letter-spacing: 0.05em;
          margin-top: 6px;
          font-weight: 500;
        }
        .sm-dock-register {
          width: 100%;
          font-size: 11px;
          color: rgba(255,255,255,0.25);
          margin-top: 8px;
          letter-spacing: 0.04em;
        }
        .sm-dock-register a {
          color: rgba(255,255,255,0.45);
          font-weight: 600;
          text-decoration: none;
        }
        .sm-dock-register a:hover { color: rgba(255,255,255,0.7); }

        /* ── Mobile ── */
        @media (max-width: 540px) {
          .sm-brand { padding-top: 28px; padding-bottom: 18px; }
          .sm-card { padding: 28px 24px 24px; }
          .sm-dock-bar { padding: 0 20px; }
          .sm-dock-form { padding: 0 20px 24px; }
          .sm-dock-form-inner { flex-direction: column; }
          .sm-dock-submit { width: 100%; justify-content: center; }
        }
      `}</style>

      <div className="sm-root">

        {/* ── Main customer area ── */}
        <div className="sm-main">

          {/* Car silhouette SVG */}
          <svg
            className="sm-car-bg"
            viewBox="0 0 900 260"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Body */}
            <path
              d="M 75 215
                 Q 72 202 80 194
                 L 95 185
                 L 155 174
                 L 175 172
                 L 245 172
                 L 278 68
                 Q 300 58 328 56
                 L 572 56
                 Q 600 58 622 68
                 L 655 172
                 L 725 172
                 L 745 174
                 L 805 185
                 L 820 194
                 Q 828 202 825 215
                 Z"
              fill="rgba(255,255,255,0.03)"
              stroke="rgba(255,255,255,0.13)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* Roof highlight */}
            <path
              d="M 290 58 Q 450 52 610 58"
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="1"
            />
            {/* Front wheel */}
            <circle cx="205" cy="220" r="46"
              fill="rgba(255,255,255,0.025)"
              stroke="rgba(255,255,255,0.11)"
              strokeWidth="1.5"
            />
            <circle cx="205" cy="220" r="18"
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="1"
            />
            {/* Rear wheel */}
            <circle cx="695" cy="220" r="46"
              fill="rgba(255,255,255,0.025)"
              stroke="rgba(255,255,255,0.11)"
              strokeWidth="1.5"
            />
            <circle cx="695" cy="220" r="18"
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="1"
            />
            {/* Ground shadow */}
            <ellipse cx="450" cy="258" rx="390" ry="8"
              fill="rgba(0,0,0,0.25)"
            />
            <line x1="60" y1="253" x2="840" y2="253"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
          </svg>

          {/* Brand */}
          <div className="sm-brand">
            <div className="sm-brand-mark">
              <div className="sm-brand-mark-outer" />
              <div className="sm-brand-mark-inner" />
            </div>
            <div className="sm-brand-name">Smith Motors</div>
            <div className="sm-brand-sub">Authorized Dealer</div>
          </div>

          {/* Customer login card */}
          <div className="sm-card-wrap">
            <div className="sm-card">
              <div className="sm-card-eyebrow">Customer Portal</div>
              <h2 className="sm-card-title">Sign In</h2>

              <form onSubmit={handleCustomerSignIn}>
                <div className="sm-field">
                  <label className="sm-label">Email Address</label>
                  <input
                    className="sm-input"
                    type="email"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="you@example.com"
                  />
                </div>
                <div className="sm-field">
                  <label className="sm-label">Password</label>
                  <input
                    className="sm-input"
                    type="password"
                    value={custPassword}
                    onChange={(e) => setCustPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                </div>

                {custError && <div className="sm-error-box">{custError}</div>}

                <button type="submit" disabled={loading === "customer"} className="sm-submit">
                  {loading === "customer" ? "Signing In..." : "Sign In"}
                  {loading !== "customer" && (
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              </form>

              <p className="sm-register">
                New customer?{" "}
                <Link href="/register">Create an account</Link>
              </p>
            </div>
          </div>

        </div>

        {/* ── Employee dock ── */}
        <div className={`sm-dock${empOpen ? " open" : ""}`}>

          {/* Bar — always visible */}
          <div className="sm-dock-bar" onClick={() => setEmpOpen((v) => !v)}>
            <div className="sm-dock-bar-left">
              <div className="sm-dock-pip" />
              <span className="sm-dock-label">Employee Portal</span>
            </div>
            <div className="sm-dock-bar-right">
              <span>{empOpen ? "Close" : "Staff Sign In"}</span>
              <svg
                className="sm-dock-chevron"
                width="14" height="14"
                fill="none" stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </div>
          </div>

          {/* Expanded form */}
          <div className="sm-dock-form">
            <form onSubmit={handleEmployeeSignIn}>
              <div className="sm-dock-form-inner">
                <div className="sm-dock-field">
                  <label className="sm-dock-label-field">Email</label>
                  <input
                    className="sm-dock-input"
                    type="email"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    required
                    placeholder="you@smithmotors.com"
                  />
                </div>
                <div className="sm-dock-field">
                  <label className="sm-dock-label-field">Password</label>
                  <input
                    className="sm-dock-input"
                    type="password"
                    value={empPassword}
                    onChange={(e) => setEmpPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                </div>
                <button type="submit" disabled={loading === "employee"} className="sm-dock-submit">
                  {loading === "employee" ? "..." : "Sign In"}
                  {loading !== "employee" && (
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
                {empError && <p className="sm-dock-error">{empError}</p>}
                <p className="sm-dock-register">
                  New team member?{" "}
                  <Link href="/register">Create an account</Link>
                </p>
              </div>
            </form>
          </div>

        </div>

      </div>
    </>
  );
}
