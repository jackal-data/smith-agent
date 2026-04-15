"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type View = "pick" | "customer" | "salesperson";

export function LandingPage() {
  const [view, setView] = useState<View>("pick");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password");
      return;
    }
    const res = await fetch("/api/auth/session");
    const session = await res.json();
    if (["SALESPERSON", "MANAGER", "ADMIN"].includes(session?.user?.role)) {
      router.push("/salesperson/dashboard");
    } else {
      router.push("/customer/chat");
    }
  };

  const reset = () => {
    setView("pick");
    setEmail("");
    setPassword("");
    setError("");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600;700&family=Barlow+Condensed:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .sm-root {
          display: flex;
          flex-direction: column;
          height: 100vh;
          font-family: 'Barlow', sans-serif;
          background: #0B1F36;
        }

        /* ── Top bar ── */
        .sm-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          height: 56px;
          background: #0B1F36;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          flex-shrink: 0;
          z-index: 20;
        }
        .sm-topbar-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .sm-topbar-diamond {
          width: 18px;
          height: 18px;
          background: #1B6BCC;
          transform: rotate(45deg);
          flex-shrink: 0;
        }
        .sm-topbar-name {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 700;
          font-size: 15px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #FFFFFF;
        }
        .sm-topbar-right {
          font-size: 11px;
          color: rgba(255,255,255,0.35);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 400;
        }

        /* ── Main split ── */
        .sm-split {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        /* ── Panels ── */
        .sm-panel {
          position: relative;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: flex 0.65s cubic-bezier(0.77, 0, 0.175, 1);
        }
        .sm-panel-customer { flex: 1; background: #FFFFFF; }
        .sm-panel-employee { flex: 1; background: #0B1F36; }

        /* Customer selected */
        .sm-root.view-customer .sm-panel-customer { flex: 1.6; }
        .sm-root.view-customer .sm-panel-employee { flex: 0.001; pointer-events: none; }
        .sm-root.view-customer .sm-panel-employee .sm-panel-inner { opacity: 0; }

        /* Salesperson selected */
        .sm-root.view-salesperson .sm-panel-employee { flex: 1.6; }
        .sm-root.view-salesperson .sm-panel-customer { flex: 0.001; pointer-events: none; }
        .sm-root.view-salesperson .sm-panel-customer .sm-panel-inner { opacity: 0; }

        .sm-panel-inner {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          transition: opacity 0.3s ease;
        }

        /* ── Divider ── */
        .sm-divider {
          width: 1px;
          flex-shrink: 0;
          background: #D0D9E3;
          z-index: 10;
          transition: opacity 0.4s ease;
        }
        .sm-root.view-customer .sm-divider,
        .sm-root.view-salesperson .sm-divider { opacity: 0; }

        /* ── Panel body ── */
        .sm-panel-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 0 64px 56px;
        }

        /* ── Selection card ── */
        .sm-select {
          cursor: pointer;
          max-width: 400px;
        }

        .sm-role-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          margin-bottom: 20px;
          padding: 5px 12px;
        }
        .sm-role-tag-customer {
          background: #EBF2FB;
          color: #1B6BCC;
          border: 1px solid #C2D8F3;
        }
        .sm-role-tag-employee {
          background: rgba(27,107,204,0.15);
          color: #7DB3EA;
          border: 1px solid rgba(27,107,204,0.3);
        }

        .sm-role-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .sm-role-dot-customer { background: #1B6BCC; }
        .sm-role-dot-employee { background: #7DB3EA; }

        .sm-select-heading {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 700;
          font-size: clamp(44px, 5vw, 68px);
          line-height: 0.95;
          letter-spacing: -0.01em;
          text-transform: uppercase;
          margin-bottom: 20px;
        }
        .sm-select-heading-dark { color: #0B1F36; }
        .sm-select-heading-light { color: #FFFFFF; }

        .sm-select-desc {
          font-size: 14px;
          font-weight: 400;
          line-height: 1.65;
          margin-bottom: 36px;
          max-width: 260px;
        }
        .sm-select-desc-dark { color: #5B738A; }
        .sm-select-desc-light { color: rgba(255,255,255,0.5); }

        .sm-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #1B6BCC;
          color: #FFFFFF;
          border: none;
          padding: 13px 24px;
          font-family: 'Barlow', sans-serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s;
        }
        .sm-btn-primary:hover { background: #155BA8; }

        .sm-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: transparent;
          color: #FFFFFF;
          border: 1.5px solid rgba(255,255,255,0.35);
          padding: 13px 24px;
          font-family: 'Barlow', sans-serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
        }
        .sm-btn-outline:hover {
          border-color: rgba(255,255,255,0.7);
          background: rgba(255,255,255,0.06);
        }

        /* ── Feature list ── */
        .sm-features {
          margin-top: 28px;
          display: flex;
          flex-direction: column;
          gap: 9px;
        }
        .sm-feature-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          font-weight: 400;
        }
        .sm-feature-item-dark  { color: #5B738A; }
        .sm-feature-item-light { color: rgba(255,255,255,0.45); }
        .sm-feature-check {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ── Form state ── */
        .sm-form-wrap {
          max-width: 340px;
          animation: smSlideIn 0.45s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
        }

        @keyframes smSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .sm-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'Barlow', sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          padding: 0;
          margin-bottom: 44px;
          transition: opacity 0.2s;
        }
        .sm-back:hover { opacity: 0.75; }
        .sm-back-dark  { color: #5B738A; }
        .sm-back-light { color: rgba(255,255,255,0.45); }

        .sm-form-role {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .sm-form-role-blue { color: #1B6BCC; }
        .sm-form-role-sky  { color: #7DB3EA; }

        .sm-form-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 700;
          font-size: 34px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          margin-bottom: 32px;
          line-height: 1;
        }
        .sm-form-title-dark  { color: #0B1F36; }
        .sm-form-title-light { color: #FFFFFF; }

        .sm-field { display: flex; flex-direction: column; gap: 6px; }
        .sm-field-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }
        .sm-field-label-dark  { color: #5B738A; }
        .sm-field-label-light { color: rgba(255,255,255,0.4); }

        .sm-input-dark, .sm-input-light {
          font-family: 'Barlow', sans-serif;
          font-size: 14px;
          font-weight: 400;
          padding: 11px 14px;
          outline: none;
          width: 100%;
          transition: border-color 0.2s;
        }
        .sm-input-dark {
          background: #F4F7FA;
          border: 1.5px solid #D0D9E3;
          color: #0B1F36;
        }
        .sm-input-dark::placeholder { color: #9EB3C5; }
        .sm-input-dark:focus {
          border-color: #1B6BCC;
          background: #FFFFFF;
        }
        .sm-input-light {
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.15);
          color: #FFFFFF;
        }
        .sm-input-light::placeholder { color: rgba(255,255,255,0.25); }
        .sm-input-light:focus {
          border-color: rgba(255,255,255,0.4);
          background: rgba(255,255,255,0.09);
        }

        .sm-submit-dark, .sm-submit-light {
          border: none;
          padding: 13px 20px;
          font-family: 'Barlow', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          width: 100%;
          margin-top: 6px;
          transition: opacity 0.2s, background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .sm-submit-dark { background: #1B6BCC; color: #FFFFFF; }
        .sm-submit-dark:hover { background: #155BA8; }
        .sm-submit-light { background: #FFFFFF; color: #0B1F36; }
        .sm-submit-light:hover { background: #EBF2FB; }
        .sm-submit-dark:disabled,
        .sm-submit-light:disabled { opacity: 0.45; cursor: not-allowed; }

        .sm-error {
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.04em;
          color: #D9000D;
          padding: 8px 12px;
          background: rgba(217,0,13,0.06);
          border-left: 2px solid #D9000D;
        }
        .sm-error-light { color: #FCA5A5; background: rgba(252,165,165,0.08); border-color: #FCA5A5; }

        .sm-register {
          font-size: 13px;
          margin-top: 20px;
          font-weight: 400;
        }
        .sm-register-dark  { color: #7B9AB2; }
        .sm-register-light { color: rgba(255,255,255,0.35); }
        .sm-register a { font-weight: 600; text-decoration: none; transition: opacity 0.2s; }
        .sm-register-dark a  { color: #1B6BCC; }
        .sm-register-light a { color: rgba(255,255,255,0.65); }
        .sm-register a:hover { opacity: 0.75; }

        /* ── Panel footer strip ── */
        .sm-panel-footer {
          padding: 16px 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .sm-panel-footer-dark  { border-top: 1px solid #E8EEF4; }
        .sm-panel-footer-light { border-top: 1px solid rgba(255,255,255,0.06); }
        .sm-footer-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .sm-footer-label-dark  { color: #C2D0DC; }
        .sm-footer-label-light { color: rgba(255,255,255,0.2); }

        /* ── Hover states ── */
        .sm-root.view-pick .sm-panel-customer:hover { background: #F7FAFD; }
        .sm-panel-customer { transition: flex 0.65s cubic-bezier(0.77, 0, 0.175, 1), background 0.2s; }
        .sm-root.view-pick .sm-panel-employee:hover { background: #0E2540; }
        .sm-panel-employee { transition: flex 0.65s cubic-bezier(0.77, 0, 0.175, 1), background 0.2s; }

        /* ── Mobile ── */
        @media (max-width: 640px) {
          .sm-split { flex-direction: column; }
          .sm-divider { width: 100%; height: 1px; }
          .sm-root.view-customer .sm-panel-customer { flex: 1.5; }
          .sm-root.view-customer .sm-panel-employee { flex: 0; }
          .sm-root.view-salesperson .sm-panel-employee { flex: 1.5; }
          .sm-root.view-salesperson .sm-panel-customer { flex: 0; }
          .sm-panel-body { padding: 24px 32px 40px; }
          .sm-panel-footer { padding: 14px 32px; }
          .sm-topbar { padding: 0 24px; }
        }
      `}</style>

      <div className={`sm-root view-${view}`}>

        {/* ── Top bar ── */}
        <div className="sm-topbar">
          <div className="sm-topbar-brand">
            <div className="sm-topbar-diamond" />
            <span className="sm-topbar-name">Smith Motors</span>
          </div>
          <span className="sm-topbar-right">Customer &amp; Employee Access</span>
        </div>

        {/* ── Split ── */}
        <div className="sm-split">

          {/* ── LEFT — Customer ── */}
          <div className="sm-panel sm-panel-customer">
            <div className="sm-panel-inner">
              <div className="sm-panel-body">
                {view !== "customer" ? (
                  <div className="sm-select" onClick={() => setView("customer")}>
                    <div className="sm-role-tag sm-role-tag-customer">
                      <span className="sm-role-dot sm-role-dot-customer" />
                      Customer Portal
                    </div>
                    <h2 className="sm-select-heading sm-select-heading-dark">
                      Shop<br />Vehicles
                    </h2>
                    <p className="sm-select-desc sm-select-desc-dark">
                      Browse inventory, explore financing options, and chat with our AI assistant.
                    </p>
                    <button className="sm-btn-primary">
                      Sign In
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <div className="sm-features">
                      {["Browse new & used inventory", "AI-powered chat assistant", "Financing pre-qualification"].map((f) => (
                        <div key={f} className="sm-feature-item sm-feature-item-dark">
                          <span className="sm-feature-check">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                              <path d="M3 8l3.5 3.5L13 5" stroke="#1B6BCC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </span>
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="sm-form-wrap">
                    <button className="sm-back sm-back-dark" onClick={reset}>
                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back
                    </button>
                    <p className="sm-form-role sm-form-role-blue">Customer Portal</p>
                    <h2 className="sm-form-title sm-form-title-dark">Sign In</h2>
                    <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div className="sm-field">
                        <label className="sm-field-label sm-field-label-dark">Email Address</label>
                        <input className="sm-input-dark" type="email" value={email}
                          onChange={(e) => setEmail(e.target.value)} required autoFocus
                          placeholder="you@example.com" />
                      </div>
                      <div className="sm-field">
                        <label className="sm-field-label sm-field-label-dark">Password</label>
                        <input className="sm-input-dark" type="password" value={password}
                          onChange={(e) => setPassword(e.target.value)} required
                          placeholder="••••••••" />
                      </div>
                      {error && <p className="sm-error">{error}</p>}
                      <button type="submit" disabled={loading} className="sm-submit-dark">
                        {loading ? "Signing In..." : "Sign In"}
                        {!loading && (
                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </button>
                    </form>
                    <p className="sm-register sm-register-dark">
                      New customer?{" "}
                      <Link href="/register">Create an account</Link>
                    </p>
                  </div>
                )}
              </div>
              <div className="sm-panel-footer sm-panel-footer-dark">
                <span className="sm-footer-label sm-footer-label-dark">Customer Access</span>
                <span className="sm-footer-label sm-footer-label-dark" style={{ letterSpacing: "0.06em" }}>
                  Smith Motors
                </span>
              </div>
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="sm-divider" />

          {/* ── RIGHT — Employee ── */}
          <div className="sm-panel sm-panel-employee">
            <div className="sm-panel-inner">
              <div className="sm-panel-body">
                {view !== "salesperson" ? (
                  <div className="sm-select" onClick={() => setView("salesperson")}>
                    <div className="sm-role-tag sm-role-tag-employee">
                      <span className="sm-role-dot sm-role-dot-employee" />
                      Employee Portal
                    </div>
                    <h2 className="sm-select-heading sm-select-heading-light">
                      Staff<br />Dashboard
                    </h2>
                    <p className="sm-select-desc sm-select-desc-light">
                      Manage leads, view customer assignments, and access dealership metrics.
                    </p>
                    <button className="sm-btn-outline">
                      Sign In
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <div className="sm-features">
                      {["Customer lead management", "Appointment scheduling", "Performance metrics"].map((f) => (
                        <div key={f} className="sm-feature-item sm-feature-item-light">
                          <span className="sm-feature-check">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                              <path d="M3 8l3.5 3.5L13 5" stroke="#7DB3EA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </span>
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="sm-form-wrap">
                    <button className="sm-back sm-back-light" onClick={reset}>
                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back
                    </button>
                    <p className="sm-form-role sm-form-role-sky">Employee Portal</p>
                    <h2 className="sm-form-title sm-form-title-light">Sign In</h2>
                    <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div className="sm-field">
                        <label className="sm-field-label sm-field-label-light">Email Address</label>
                        <input className="sm-input-light" type="email" value={email}
                          onChange={(e) => setEmail(e.target.value)} required autoFocus
                          placeholder="you@smithmotors.com" />
                      </div>
                      <div className="sm-field">
                        <label className="sm-field-label sm-field-label-light">Password</label>
                        <input className="sm-input-light" type="password" value={password}
                          onChange={(e) => setPassword(e.target.value)} required
                          placeholder="••••••••" />
                      </div>
                      {error && <p className="sm-error sm-error-light">{error}</p>}
                      <button type="submit" disabled={loading} className="sm-submit-light">
                        {loading ? "Signing In..." : "Sign In"}
                        {!loading && (
                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </button>
                    </form>
                    <p className="sm-register sm-register-light">
                      New team member?{" "}
                      <Link href="/register">Create an account</Link>
                    </p>
                  </div>
                )}
              </div>
              <div className="sm-panel-footer sm-panel-footer-light">
                <span className="sm-footer-label sm-footer-label-light">Employee Access</span>
                <span className="sm-footer-label sm-footer-label-light" style={{ letterSpacing: "0.06em" }}>
                  Smith Motors
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
