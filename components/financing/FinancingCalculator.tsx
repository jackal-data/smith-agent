"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

const APR_TABLE: Record<string, Record<number, number>> = {
  excellent: { 36: 2.9,  48: 3.4,  60: 3.9,  72: 4.4  },
  good:      { 36: 4.9,  48: 5.4,  60: 5.9,  72: 6.4  },
  fair:      { 36: 7.9,  48: 9.4,  60: 11.9, 72: 13.4 },
  poor:      { 36: 14.9, 48: 17.4, 60: 21.9, 72: 23.9 },
};

const CREDIT_TIERS = [
  { value: "excellent", label: "Excellent", sub: "750+",    color: "#16a34a" },
  { value: "good",      label: "Good",      sub: "700–749", color: "#2563eb" },
  { value: "fair",      label: "Fair",      sub: "650–699", color: "#d97706" },
  { value: "poor",      label: "Poor",      sub: "<650",    color: "#dc2626" },
];

const TERMS = [36, 48, 60, 72];

function calcPayment(principal: number, apr: number, months: number) {
  if (principal <= 0) return { monthly: 0, total: 0, interest: 0 };
  const r = apr / 100 / 12;
  const monthly = r === 0
    ? principal / months
    : (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  const total = monthly * months;
  return {
    monthly: Math.round(monthly * 100) / 100,
    total: Math.round(total * 100) / 100,
    interest: Math.round((total - principal) * 100) / 100,
  };
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function FinancingCalculator() {
  const [vehiclePrice, setVehiclePrice] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [tradeIn, setTradeIn] = useState("");
  const [creditTier, setCreditTier] = useState("good");
  const [selectedTerm, setSelectedTerm] = useState(60);

  const price    = parseFloat(vehiclePrice)  || 0;
  const down     = parseFloat(downPayment)   || 0;
  const trade    = parseFloat(tradeIn)       || 0;
  const principal = Math.max(0, price - down - trade);
  const hasPrice  = price > 0;
  const downPct   = price > 0 ? Math.round((down / price) * 100) : 0;

  const scenarios = useMemo(() => {
    return TERMS.map((term) => {
      const apr = APR_TABLE[creditTier][term];
      return { term, apr, ...calcPayment(principal, apr, term) };
    });
  }, [principal, creditTier]);

  const selected = scenarios.find((s) => s.term === selectedTerm)!;
  const interestPct = selected.total > 0
    ? Math.round((selected.interest / selected.total) * 100)
    : 0;
  const principalPct = 100 - interestPct;

  const chatMessage = hasPrice
    ? `I'd like to talk about financing. Vehicle price: $${fmt(price)}, down payment: $${fmt(down)}${trade > 0 ? `, trade-in: $${fmt(trade)}` : ""}, credit tier: ${creditTier}. I'm looking at ${selectedTerm}-month terms at ${selected.apr}% APR — monthly payment would be $${fmt(selected.monthly)}.`
    : "";

  return (
    <>
      <style>{`
        .fc-root { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }

        /* ── Inputs ── */
        .fc-section-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #6B7280;
          margin-bottom: 12px;
        }
        .fc-input-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }
        .fc-input-row-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }
        .fc-field { display: flex; flex-direction: column; gap: 5px; }
        .fc-label {
          font-size: 12px;
          font-weight: 600;
          color: #374151;
        }
        .fc-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .fc-prefix {
          position: absolute;
          left: 11px;
          font-size: 13px;
          font-weight: 500;
          color: #6B7280;
          pointer-events: none;
          user-select: none;
        }
        .fc-input {
          width: 100%;
          border: 1.5px solid #D1D5DB;
          border-radius: 8px;
          padding: 9px 11px 9px 24px;
          font-size: 14px;
          font-weight: 500;
          color: #111827;
          background: #F9FAFB;
          outline: none;
          transition: border-color 0.15s, background 0.15s;
          font-family: inherit;
        }
        .fc-input:focus {
          border-color: #1553A2;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(21,83,162,0.08);
        }
        .fc-input-hint {
          font-size: 11px;
          color: #9CA3AF;
          margin-top: 3px;
        }

        /* ── Credit tier ── */
        .fc-tier-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 20px;
        }
        .fc-tier-btn {
          border: 2px solid #E5E7EB;
          border-radius: 9px;
          padding: 10px 8px;
          background: #F9FAFB;
          cursor: pointer;
          text-align: center;
          transition: border-color 0.15s, background 0.15s;
          font-family: inherit;
        }
        .fc-tier-btn:hover { background: #F3F4F6; }
        .fc-tier-btn.active {
          background: #EFF6FF;
          border-color: #1553A2;
        }
        .fc-tier-label {
          font-size: 12px;
          font-weight: 700;
          color: #111827;
          display: block;
        }
        .fc-tier-sub {
          font-size: 10px;
          color: #6B7280;
          display: block;
          margin-top: 1px;
        }

        /* ── Terms ── */
        .fc-term-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 24px;
        }
        .fc-term-btn {
          border: 2px solid #E5E7EB;
          border-radius: 9px;
          padding: 9px 6px;
          background: #F9FAFB;
          cursor: pointer;
          text-align: center;
          transition: border-color 0.15s, background 0.15s;
          font-family: inherit;
        }
        .fc-term-btn:hover { background: #F3F4F6; }
        .fc-term-btn.active {
          background: #1553A2;
          border-color: #1553A2;
        }
        .fc-term-mo {
          font-size: 15px;
          font-weight: 800;
          color: #111827;
          display: block;
        }
        .fc-term-btn.active .fc-term-mo { color: #fff; }
        .fc-term-label {
          font-size: 10px;
          color: #6B7280;
          display: block;
          margin-top: 1px;
        }
        .fc-term-btn.active .fc-term-label { color: rgba(255,255,255,0.75); }

        /* ── Results ── */
        .fc-results {
          border-top: 1.5px solid #E5E7EB;
          padding-top: 24px;
          margin-top: 4px;
        }
        .fc-result-hero {
          background: linear-gradient(135deg, #1553A2 0%, #1e40af 100%);
          border-radius: 12px;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .fc-hero-left {}
        .fc-hero-eyebrow {
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.65);
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }
        .fc-hero-payment {
          font-size: 36px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -1px;
          line-height: 1;
        }
        .fc-hero-sub {
          font-size: 12px;
          color: rgba(255,255,255,0.6);
          margin-top: 4px;
        }
        .fc-hero-right {
          display: flex;
          flex-direction: column;
          gap: 4px;
          text-align: right;
        }
        .fc-hero-stat {
          font-size: 12px;
          color: rgba(255,255,255,0.75);
        }
        .fc-hero-stat strong { color: #fff; font-weight: 700; }

        /* Breakdown bar */
        .fc-bar-wrap { margin-bottom: 16px; }
        .fc-bar-labels {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        .fc-bar-label {
          font-size: 11px;
          font-weight: 600;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .fc-bar-dot {
          width: 8px;
          height: 8px;
          border-radius: 2px;
          flex-shrink: 0;
        }
        .fc-bar {
          height: 10px;
          border-radius: 6px;
          background: #E5E7EB;
          overflow: hidden;
          display: flex;
        }
        .fc-bar-principal {
          background: #1553A2;
          border-radius: 6px 0 0 6px;
          transition: width 0.4s ease;
        }
        .fc-bar-interest {
          background: #FCA5A5;
          flex: 1;
          transition: width 0.4s ease;
        }

        /* Term comparison table */
        .fc-compare {
          border: 1.5px solid #E5E7EB;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 20px;
        }
        .fc-compare-row {
          display: grid;
          grid-template-columns: 70px 1fr 1fr 1fr;
          align-items: center;
          padding: 10px 14px;
          border-bottom: 1px solid #F3F4F6;
          cursor: pointer;
          transition: background 0.12s;
        }
        .fc-compare-row:last-child { border-bottom: none; }
        .fc-compare-row:hover { background: #F9FAFB; }
        .fc-compare-row.active { background: #EFF6FF; }
        .fc-compare-head {
          display: grid;
          grid-template-columns: 70px 1fr 1fr 1fr;
          padding: 7px 14px;
          background: #F9FAFB;
          border-bottom: 1.5px solid #E5E7EB;
        }
        .fc-compare-head span {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #6B7280;
        }
        .fc-compare-term {
          font-size: 13px;
          font-weight: 700;
          color: #111827;
        }
        .fc-compare-row.active .fc-compare-term { color: #1553A2; }
        .fc-compare-cell {
          font-size: 12px;
          color: #374151;
          font-weight: 500;
        }
        .fc-compare-monthly {
          font-size: 13px;
          font-weight: 700;
          color: #111827;
        }
        .fc-compare-row.active .fc-compare-monthly { color: #1553A2; }

        /* CTA */
        .fc-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          background: #111827;
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 13px 20px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.15s;
        }
        .fc-cta:hover { background: #1f2937; }

        .fc-disclaimer {
          font-size: 11px;
          color: #9CA3AF;
          text-align: center;
          margin-top: 12px;
          line-height: 1.5;
        }

        @media (max-width: 520px) {
          .fc-input-row { grid-template-columns: 1fr; }
          .fc-input-row-3 { grid-template-columns: 1fr 1fr; }
          .fc-tier-grid { grid-template-columns: 1fr 1fr; }
          .fc-term-row { grid-template-columns: repeat(4,1fr); }
          .fc-hero-payment { font-size: 28px; }
          .fc-compare-head,
          .fc-compare-row { grid-template-columns: 55px 1fr 1fr 1fr; }
        }
      `}</style>

      <div className="fc-root bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Financing Calculator</h2>
        <p className="text-sm text-gray-700 mb-6">Adjust the numbers below to estimate your monthly payments.</p>

        {/* Row 1: Price + Down + Trade-in */}
        <p className="fc-section-title">Vehicle Details</p>
        <div className="fc-input-row-3">
          <div className="fc-field">
            <label className="fc-label">Vehicle Price</label>
            <div className="fc-input-wrap">
              <span className="fc-prefix">$</span>
              <input
                className="fc-input"
                type="number"
                min="0"
                value={vehiclePrice}
                onChange={(e) => setVehiclePrice(e.target.value)}
                placeholder="32,000"
              />
            </div>
          </div>
          <div className="fc-field">
            <label className="fc-label">Down Payment</label>
            <div className="fc-input-wrap">
              <span className="fc-prefix">$</span>
              <input
                className="fc-input"
                type="number"
                min="0"
                value={downPayment}
                onChange={(e) => setDownPayment(e.target.value)}
                placeholder="3,000"
              />
            </div>
            {price > 0 && down > 0 && (
              <span className="fc-input-hint">{downPct}% of price</span>
            )}
          </div>
          <div className="fc-field">
            <label className="fc-label">Trade-in Value</label>
            <div className="fc-input-wrap">
              <span className="fc-prefix">$</span>
              <input
                className="fc-input"
                type="number"
                min="0"
                value={tradeIn}
                onChange={(e) => setTradeIn(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Credit tier */}
        <p className="fc-section-title">Credit Score</p>
        <div className="fc-tier-grid">
          {CREDIT_TIERS.map((t) => (
            <button
              key={t.value}
              className={`fc-tier-btn${creditTier === t.value ? " active" : ""}`}
              onClick={() => setCreditTier(t.value)}
            >
              <span className="fc-tier-label">{t.label}</span>
              <span className="fc-tier-sub">{t.sub}</span>
            </button>
          ))}
        </div>

        {/* Loan term */}
        <p className="fc-section-title">Loan Term</p>
        <div className="fc-term-row">
          {TERMS.map((t) => (
            <button
              key={t}
              className={`fc-term-btn${selectedTerm === t ? " active" : ""}`}
              onClick={() => setSelectedTerm(t)}
            >
              <span className="fc-term-mo">{t}</span>
              <span className="fc-term-label">mo</span>
            </button>
          ))}
        </div>

        {/* Results */}
        {hasPrice && (
          <div className="fc-results">

            {/* Hero monthly payment */}
            <div className="fc-result-hero">
              <div className="fc-hero-left">
                <div className="fc-hero-eyebrow">{selectedTerm}-month estimated payment</div>
                <div className="fc-hero-payment">${fmt(selected.monthly)}<span style={{ fontSize: 18, fontWeight: 600 }}>/mo</span></div>
                <div className="fc-hero-sub">{selected.apr}% APR · Smith Motors Finance</div>
              </div>
              <div className="fc-hero-right">
                <div className="fc-hero-stat">Amount financed: <strong>${fmt(principal)}</strong></div>
                <div className="fc-hero-stat">Total interest: <strong>${fmt(selected.interest)}</strong></div>
                <div className="fc-hero-stat">Total cost: <strong>${fmt(selected.total)}</strong></div>
              </div>
            </div>

            {/* Principal vs Interest bar */}
            <div className="fc-bar-wrap">
              <div className="fc-bar-labels">
                <span className="fc-bar-label">
                  <span className="fc-bar-dot" style={{ background: "#1553A2" }} />
                  Principal ({principalPct}%)
                </span>
                <span className="fc-bar-label">
                  <span className="fc-bar-dot" style={{ background: "#FCA5A5" }} />
                  Interest ({interestPct}%)
                </span>
              </div>
              <div className="fc-bar">
                <div className="fc-bar-principal" style={{ width: `${principalPct}%` }} />
                <div className="fc-bar-interest" />
              </div>
            </div>

            {/* All terms comparison */}
            <div className="fc-compare">
              <div className="fc-compare-head">
                <span>Term</span>
                <span>APR</span>
                <span>Monthly</span>
                <span>Total Cost</span>
              </div>
              {scenarios.map((s) => (
                <div
                  key={s.term}
                  className={`fc-compare-row${s.term === selectedTerm ? " active" : ""}`}
                  onClick={() => setSelectedTerm(s.term)}
                >
                  <span className="fc-compare-term">{s.term} mo</span>
                  <span className="fc-compare-cell">{s.apr}%</span>
                  <span className="fc-compare-monthly">${fmt(s.monthly)}/mo</span>
                  <span className="fc-compare-cell">${fmt(s.total)}</span>
                </div>
              ))}
            </div>

            {/* Talk to Alex CTA */}
            <Link
              href={`/customer/chat${chatMessage ? `?prefill=${encodeURIComponent(chatMessage)}` : ""}`}
              className="fc-cta"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Talk to Alex about this estimate
            </Link>

            <p className="fc-disclaimer">
              Estimates only. Final rates and terms subject to credit approval and lender review.<br />
              Actual APR may vary based on credit history, loan amount, and term.
            </p>
          </div>
        )}

        {!hasPrice && (
          <div className="text-center py-8 text-gray-500 text-sm">
            Enter a vehicle price above to see payment estimates
          </div>
        )}
      </div>
    </>
  );
}
