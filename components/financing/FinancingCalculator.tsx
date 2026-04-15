"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

// ─── Shared data ──────────────────────────────────────────────────────────────

const APR_TABLE: Record<string, Record<number, number>> = {
  excellent: { 36: 2.9,  48: 3.4,  60: 3.9,  72: 4.4  },
  good:      { 36: 4.9,  48: 5.4,  60: 5.9,  72: 6.4  },
  fair:      { 36: 7.9,  48: 9.4,  60: 11.9, 72: 13.4 },
  poor:      { 36: 14.9, 48: 17.4, 60: 21.9, 72: 23.9 },
};

const CREDIT_TIERS = [
  { value: "excellent", label: "Excellent", sub: "750+",    },
  { value: "good",      label: "Good",      sub: "700–749", },
  { value: "fair",      label: "Fair",      sub: "650–699", },
  { value: "poor",      label: "Poor",      sub: "<650",    },
];

const TERMS = [36, 48, 60, 72];

const EMPLOYMENT_OPTIONS = [
  { value: "employed",      label: "Employed" },
  { value: "self_employed", label: "Self-Employed" },
  { value: "retired",       label: "Retired" },
  { value: "other",         label: "Other" },
];

function calcPayment(principal: number, apr: number, months: number) {
  if (principal <= 0 || months <= 0) return { monthly: 0, total: 0, interest: 0 };
  const r = apr / 100 / 12;
  const monthly = r === 0
    ? principal / months
    : (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  const total = monthly * months;
  return {
    monthly: Math.round(monthly * 100) / 100,
    total:   Math.round(total * 100) / 100,
    interest: Math.round((total - principal) * 100) / 100,
  };
}

function maxLoanFromPayment(payment: number, apr: number, months: number) {
  if (payment <= 0) return 0;
  const r = apr / 100 / 12;
  if (r === 0) return payment * months;
  return payment * (1 - Math.pow(1 + r, -months)) / r;
}

function fmt(n: number) {
  return Math.round(n).toLocaleString("en-US");
}

// ─── Shared styles ─────────────────────────────────────────────────────────────

const SHARED_STYLES = `
  .fc-root { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }

  /* Tabs */
  .fc-tabs {
    display: flex;
    border-bottom: 2px solid #E5E7EB;
    margin-bottom: 24px;
  }
  .fc-tab {
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 600;
    color: #6B7280;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    cursor: pointer;
    background: none;
    border-top: none;
    border-left: none;
    border-right: none;
    font-family: inherit;
    transition: color 0.15s;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .fc-tab:hover { color: #374151; }
  .fc-tab.active { color: #1553A2; border-bottom-color: #1553A2; }

  /* Section labels */
  .fc-section-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #6B7280;
    margin-bottom: 10px;
  }

  /* Grid inputs */
  .fc-input-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 18px; }
  .fc-input-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
  .fc-field { display: flex; flex-direction: column; gap: 5px; }
  .fc-label { font-size: 12px; font-weight: 600; color: #374151; }
  .fc-input-wrap { position: relative; display: flex; align-items: center; }
  .fc-prefix {
    position: absolute; left: 11px;
    font-size: 13px; font-weight: 500; color: #6B7280;
    pointer-events: none; user-select: none;
  }
  .fc-input {
    width: 100%; border: 1.5px solid #D1D5DB; border-radius: 8px;
    padding: 9px 11px 9px 24px; font-size: 14px; font-weight: 500;
    color: #111827; background: #F9FAFB; outline: none;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
    font-family: inherit;
  }
  .fc-input:focus { border-color: #1553A2; background: #fff; box-shadow: 0 0 0 3px rgba(21,83,162,0.08); }
  .fc-input-no-prefix { padding-left: 11px; }
  .fc-select {
    width: 100%; border: 1.5px solid #D1D5DB; border-radius: 8px;
    padding: 9px 11px; font-size: 14px; font-weight: 500;
    color: #111827; background: #F9FAFB; outline: none;
    transition: border-color 0.15s; font-family: inherit; cursor: pointer;
  }
  .fc-select:focus { border-color: #1553A2; background: #fff; box-shadow: 0 0 0 3px rgba(21,83,162,0.08); }
  .fc-input-hint { font-size: 11px; color: #9CA3AF; margin-top: 3px; }

  /* Credit tier */
  .fc-tier-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-bottom: 18px; }
  .fc-tier-btn {
    border: 2px solid #E5E7EB; border-radius: 9px; padding: 10px 8px;
    background: #F9FAFB; cursor: pointer; text-align: center;
    transition: border-color 0.15s, background 0.15s; font-family: inherit;
  }
  .fc-tier-btn:hover { background: #F3F4F6; }
  .fc-tier-btn.active { background: #EFF6FF; border-color: #1553A2; }
  .fc-tier-label { font-size: 12px; font-weight: 700; color: #111827; display: block; }
  .fc-tier-sub { font-size: 10px; color: #6B7280; display: block; margin-top: 1px; }

  /* Terms */
  .fc-term-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-bottom: 22px; }
  .fc-term-btn {
    border: 2px solid #E5E7EB; border-radius: 9px; padding: 9px 6px;
    background: #F9FAFB; cursor: pointer; text-align: center;
    transition: border-color 0.15s, background 0.15s; font-family: inherit;
  }
  .fc-term-btn:hover { background: #F3F4F6; }
  .fc-term-btn.active { background: #1553A2; border-color: #1553A2; }
  .fc-term-mo { font-size: 15px; font-weight: 800; color: #111827; display: block; }
  .fc-term-btn.active .fc-term-mo { color: #fff; }
  .fc-term-label { font-size: 10px; color: #6B7280; display: block; margin-top: 1px; }
  .fc-term-btn.active .fc-term-label { color: rgba(255,255,255,0.75); }

  /* Results */
  .fc-results { border-top: 1.5px solid #E5E7EB; padding-top: 22px; margin-top: 4px; }
  .fc-result-hero {
    background: linear-gradient(135deg, #1553A2 0%, #1e40af 100%);
    border-radius: 12px; padding: 20px 24px;
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 16px; flex-wrap: wrap; gap: 12px;
  }
  .fc-hero-eyebrow { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.65); letter-spacing: 0.05em; margin-bottom: 4px; }
  .fc-hero-payment { font-size: 36px; font-weight: 800; color: #fff; letter-spacing: -1px; line-height: 1; }
  .fc-hero-sub { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 4px; }
  .fc-hero-right { display: flex; flex-direction: column; gap: 4px; text-align: right; }
  .fc-hero-stat { font-size: 12px; color: rgba(255,255,255,0.75); }
  .fc-hero-stat strong { color: #fff; font-weight: 700; }

  /* Breakdown bar */
  .fc-bar-wrap { margin-bottom: 16px; }
  .fc-bar-labels { display: flex; justify-content: space-between; margin-bottom: 5px; }
  .fc-bar-label { font-size: 11px; font-weight: 600; color: #374151; display: flex; align-items: center; gap: 5px; }
  .fc-bar-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
  .fc-bar { height: 10px; border-radius: 6px; background: #E5E7EB; overflow: hidden; display: flex; }
  .fc-bar-principal { background: #1553A2; border-radius: 6px 0 0 6px; transition: width 0.4s ease; }
  .fc-bar-interest { background: #FCA5A5; flex: 1; }

  /* Term comparison */
  .fc-compare { border: 1.5px solid #E5E7EB; border-radius: 10px; overflow: hidden; margin-bottom: 20px; }
  .fc-compare-head { display: grid; grid-template-columns: 70px 1fr 1fr 1fr; padding: 7px 14px; background: #F9FAFB; border-bottom: 1.5px solid #E5E7EB; }
  .fc-compare-head span { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6B7280; }
  .fc-compare-row { display: grid; grid-template-columns: 70px 1fr 1fr 1fr; align-items: center; padding: 10px 14px; border-bottom: 1px solid #F3F4F6; cursor: pointer; transition: background 0.12s; }
  .fc-compare-row:last-child { border-bottom: none; }
  .fc-compare-row:hover { background: #F9FAFB; }
  .fc-compare-row.active { background: #EFF6FF; }
  .fc-compare-term { font-size: 13px; font-weight: 700; color: #111827; }
  .fc-compare-row.active .fc-compare-term { color: #1553A2; }
  .fc-compare-cell { font-size: 12px; color: #374151; font-weight: 500; }
  .fc-compare-monthly { font-size: 13px; font-weight: 700; color: #111827; }
  .fc-compare-row.active .fc-compare-monthly { color: #1553A2; }

  /* CTA */
  .fc-cta {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%; background: #111827; color: #fff; border: none;
    border-radius: 10px; padding: 13px 20px; font-family: inherit;
    font-size: 14px; font-weight: 700; cursor: pointer; text-decoration: none;
    transition: background 0.15s;
  }
  .fc-cta:hover { background: #1f2937; }
  .fc-disclaimer { font-size: 11px; color: #9CA3AF; text-align: center; margin-top: 12px; line-height: 1.5; }

  /* ── Pre-approval specific ── */
  .pa-estimate {
    border-radius: 12px; padding: 20px 22px; margin-bottom: 18px;
    border: 2px solid;
  }
  .pa-estimate.qualified   { background: #F0FDF4; border-color: #86EFAC; }
  .pa-estimate.likely      { background: #EFF6FF; border-color: #93C5FD; }
  .pa-estimate.conditional { background: #FFFBEB; border-color: #FCD34D; }
  .pa-estimate.review      { background: #F9FAFB; border-color: #D1D5DB; }

  .pa-status-badge {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; padding: 3px 10px; border-radius: 20px;
    margin-bottom: 10px;
  }
  .pa-status-badge.qualified   { background: #DCFCE7; color: #15803D; }
  .pa-status-badge.likely      { background: #DBEAFE; color: #1D4ED8; }
  .pa-status-badge.conditional { background: #FEF3C7; color: #92400E; }
  .pa-status-badge.review      { background: #F3F4F6; color: #374151; }

  .pa-max-loan { font-size: 30px; font-weight: 800; color: #111827; letter-spacing: -0.5px; line-height: 1; margin-bottom: 4px; }
  .pa-max-label { font-size: 12px; color: #6B7280; margin-bottom: 12px; }
  .pa-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .pa-stat { background: rgba(255,255,255,0.7); border-radius: 8px; padding: 10px 12px; }
  .pa-stat-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: #6B7280; margin-bottom: 2px; }
  .pa-stat-value { font-size: 14px; font-weight: 700; color: #111827; }

  .pa-submit {
    width: 100%; background: #1553A2; color: #fff; border: none;
    border-radius: 10px; padding: 13px 20px; font-family: inherit;
    font-size: 14px; font-weight: 700; cursor: pointer;
    transition: background 0.15s; margin-bottom: 10px;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .pa-submit:hover:not(:disabled) { background: #104488; }
  .pa-submit:disabled { opacity: 0.5; cursor: not-allowed; }

  .pa-success {
    background: #F0FDF4; border: 1.5px solid #86EFAC; border-radius: 10px;
    padding: 16px 20px; text-align: center; margin-bottom: 12px;
  }
  .pa-success-icon { font-size: 28px; margin-bottom: 6px; }
  .pa-success-title { font-size: 15px; font-weight: 700; color: #15803D; margin-bottom: 4px; }
  .pa-success-sub { font-size: 12px; color: #166534; }

  @media (max-width: 520px) {
    .fc-tab { padding: 10px 14px; font-size: 13px; }
    .fc-input-row-3 { grid-template-columns: 1fr 1fr; }
    .fc-input-row-2 { grid-template-columns: 1fr; }
    .fc-tier-grid { grid-template-columns: 1fr 1fr; }
    .fc-hero-payment { font-size: 28px; }
    .fc-compare-head, .fc-compare-row { grid-template-columns: 55px 1fr 1fr 1fr; }
    .pa-stats { grid-template-columns: 1fr; }
  }
`;

// ─── Calculator Tab ───────────────────────────────────────────────────────────

function CalculatorTab() {
  const [vehiclePrice, setVehiclePrice] = useState("");
  const [downPayment, setDownPayment]   = useState("");
  const [tradeIn, setTradeIn]           = useState("");
  const [creditTier, setCreditTier]     = useState("good");
  const [selectedTerm, setSelectedTerm] = useState(60);

  const price     = parseFloat(vehiclePrice) || 0;
  const down      = parseFloat(downPayment)  || 0;
  const trade     = parseFloat(tradeIn)      || 0;
  const principal = Math.max(0, price - down - trade);
  const hasPrice  = price > 0;
  const downPct   = price > 0 ? Math.round((down / price) * 100) : 0;

  const scenarios = useMemo(() => TERMS.map((term) => {
    const apr = APR_TABLE[creditTier][term];
    return { term, apr, ...calcPayment(principal, apr, term) };
  }), [principal, creditTier]);

  const selected     = scenarios.find((s) => s.term === selectedTerm)!;
  const interestPct  = selected.total > 0 ? Math.round((selected.interest / selected.total) * 100) : 0;
  const principalPct = 100 - interestPct;

  const chatMessage = hasPrice
    ? `I'd like to talk about financing. Vehicle price: $${fmt(price)}, down payment: $${fmt(down)}${trade > 0 ? `, trade-in: $${fmt(trade)}` : ""}, credit tier: ${creditTier}. Looking at ${selectedTerm}-month terms at ${selected.apr}% APR — monthly payment around $${fmt(selected.monthly)}.`
    : "";

  return (
    <>
      <p className="fc-section-title">Vehicle Details</p>
      <div className="fc-input-row-3">
        <div className="fc-field">
          <label className="fc-label">Vehicle Price</label>
          <div className="fc-input-wrap"><span className="fc-prefix">$</span>
            <input className="fc-input" type="number" min="0" value={vehiclePrice} onChange={(e) => setVehiclePrice(e.target.value)} placeholder="32,000" />
          </div>
        </div>
        <div className="fc-field">
          <label className="fc-label">Down Payment</label>
          <div className="fc-input-wrap"><span className="fc-prefix">$</span>
            <input className="fc-input" type="number" min="0" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} placeholder="3,000" />
          </div>
          {price > 0 && down > 0 && <span className="fc-input-hint">{downPct}% of price</span>}
        </div>
        <div className="fc-field">
          <label className="fc-label">Trade-In Value</label>
          <div className="fc-input-wrap"><span className="fc-prefix">$</span>
            <input className="fc-input" type="number" min="0" value={tradeIn} onChange={(e) => setTradeIn(e.target.value)} placeholder="0" />
          </div>
        </div>
      </div>

      <p className="fc-section-title">Credit Score</p>
      <div className="fc-tier-grid">
        {CREDIT_TIERS.map((t) => (
          <button key={t.value} className={`fc-tier-btn${creditTier === t.value ? " active" : ""}`} onClick={() => setCreditTier(t.value)}>
            <span className="fc-tier-label">{t.label}</span>
            <span className="fc-tier-sub">{t.sub}</span>
          </button>
        ))}
      </div>

      <p className="fc-section-title">Loan Term</p>
      <div className="fc-term-row">
        {TERMS.map((t) => (
          <button key={t} className={`fc-term-btn${selectedTerm === t ? " active" : ""}`} onClick={() => setSelectedTerm(t)}>
            <span className="fc-term-mo">{t}</span>
            <span className="fc-term-label">mo</span>
          </button>
        ))}
      </div>

      {hasPrice ? (
        <div className="fc-results">
          <div className="fc-result-hero">
            <div>
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

          <div className="fc-bar-wrap">
            <div className="fc-bar-labels">
              <span className="fc-bar-label"><span className="fc-bar-dot" style={{ background: "#1553A2" }} />Principal ({principalPct}%)</span>
              <span className="fc-bar-label"><span className="fc-bar-dot" style={{ background: "#FCA5A5" }} />Interest ({interestPct}%)</span>
            </div>
            <div className="fc-bar">
              <div className="fc-bar-principal" style={{ width: `${principalPct}%` }} />
              <div className="fc-bar-interest" />
            </div>
          </div>

          <div className="fc-compare">
            <div className="fc-compare-head">
              <span>Term</span><span>APR</span><span>Monthly</span><span>Total</span>
            </div>
            {scenarios.map((s) => (
              <div key={s.term} className={`fc-compare-row${s.term === selectedTerm ? " active" : ""}`} onClick={() => setSelectedTerm(s.term)}>
                <span className="fc-compare-term">{s.term} mo</span>
                <span className="fc-compare-cell">{s.apr}%</span>
                <span className="fc-compare-monthly">${fmt(s.monthly)}/mo</span>
                <span className="fc-compare-cell">${fmt(s.total)}</span>
              </div>
            ))}
          </div>

          <Link href={`/customer/chat${chatMessage ? `?prefill=${encodeURIComponent(chatMessage)}` : ""}`} className="fc-cta">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Talk to Alex about this estimate
          </Link>
          <p className="fc-disclaimer">Estimates only. Final rates and terms subject to credit approval.<br />Actual APR may vary based on credit history, loan amount, and term.</p>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#6B7280", fontSize: 14 }}>
          Enter a vehicle price above to see payment estimates
        </div>
      )}
    </>
  );
}

// ─── Pre-Approval Tab ─────────────────────────────────────────────────────────

type PAStatus = "qualified" | "likely" | "conditional" | "review";

const PA_STATUS_META: Record<PAStatus, { label: string; headline: string; sub: string }> = {
  qualified:   { label: "Pre-Qualified ✓",       headline: "Great news — you likely pre-qualify!",        sub: "Based on your income and debt, your application looks strong." },
  likely:      { label: "Likely Pre-Qualified",   headline: "You're in good shape to apply.",              sub: "Your debt-to-income ratio is within our standard approval range." },
  conditional: { label: "Conditional Review",     headline: "You may qualify with some conditions.",       sub: "A lender review will help find the best terms for your situation." },
  review:      { label: "Human Review Needed",    headline: "Let's talk through your options.",            sub: "Our finance team can help find a path forward. No commitment required." },
};

function PreApprovalTab() {
  const [annualIncome,    setAnnualIncome]    = useState("");
  const [monthlyDebt,     setMonthlyDebt]     = useState("");
  const [employment,      setEmployment]      = useState("employed");
  const [creditTier,      setCreditTier]      = useState("good");
  const [desiredPrice,    setDesiredPrice]    = useState("");
  const [downPayment,     setDownPayment]     = useState("");
  const [loanTerm,        setLoanTerm]        = useState(60);
  const [submitting,      setSubmitting]      = useState(false);
  const [submitted,       setSubmitted]       = useState(false);
  const [submitError,     setSubmitError]     = useState("");

  const income  = parseFloat(annualIncome) || 0;
  const debt    = parseFloat(monthlyDebt)  || 0;
  const price   = parseFloat(desiredPrice) || 0;
  const down    = parseFloat(downPayment)  || 0;
  const hasData = income > 0;

  const estimate = useMemo(() => {
    if (!hasData) return null;
    const monthlyIncome   = income / 12;
    const dti             = monthlyIncome > 0 ? debt / monthlyIncome : 1;
    const availablePayment = Math.max(0, monthlyIncome * 0.43 - debt);
    const apr             = APR_TABLE[creditTier][loanTerm];
    const maxLoan         = Math.round(maxLoanFromPayment(availablePayment, apr, loanTerm));
    const principalNeeded = Math.max(0, price - down);
    const affordable      = maxLoan >= principalNeeded || price === 0;

    let status: PAStatus;
    if (dti < 0.36 && affordable && (creditTier === "excellent" || creditTier === "good")) status = "qualified";
    else if (dti < 0.43 && affordable) status = "likely";
    else if (dti < 0.50) status = "conditional";
    else status = "review";

    const { monthly } = calcPayment(principalNeeded > 0 ? principalNeeded : maxLoan * 0.8, apr, loanTerm);

    return { status, maxLoan, dti: Math.round(dti * 100), availablePayment, monthly, apr };
  }, [income, debt, creditTier, loanTerm, price, down, hasData]);

  const handleSubmit = async () => {
    if (!hasData || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/financing/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          annualIncome: income,
          creditScoreRange: creditTier,
          downPayment: down || 0,
          loanTermMonths: loanTerm,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setSubmitted(true);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const meta = estimate ? PA_STATUS_META[estimate.status] : null;

  return (
    <>
      <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
        <p style={{ fontSize: 12.5, color: "#1D4ED8", lineHeight: 1.5, margin: 0 }}>
          This is a <strong>soft check</strong> — it won&apos;t affect your credit score. We use your income and debt to give you an instant estimate before you formally apply.
        </p>
      </div>

      <p className="fc-section-title">Your Finances</p>
      <div className="fc-input-row-2">
        <div className="fc-field">
          <label className="fc-label">Annual Income</label>
          <div className="fc-input-wrap"><span className="fc-prefix">$</span>
            <input className="fc-input" type="number" min="0" value={annualIncome} onChange={(e) => setAnnualIncome(e.target.value)} placeholder="60,000" />
          </div>
        </div>
        <div className="fc-field">
          <label className="fc-label">Monthly Debt Payments</label>
          <div className="fc-input-wrap"><span className="fc-prefix">$</span>
            <input className="fc-input" type="number" min="0" value={monthlyDebt} onChange={(e) => setMonthlyDebt(e.target.value)} placeholder="500" />
          </div>
          <span className="fc-input-hint">Rent, student loans, other car payments, etc.</span>
        </div>
      </div>

      <div className="fc-input-row-2" style={{ marginBottom: 18 }}>
        <div className="fc-field">
          <label className="fc-label">Employment Status</label>
          <select className="fc-select" value={employment} onChange={(e) => setEmployment(e.target.value)}>
            {EMPLOYMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="fc-field" style={{ visibility: "hidden" }} aria-hidden />
      </div>

      <p className="fc-section-title">Vehicle & Loan</p>
      <div className="fc-input-row-2">
        <div className="fc-field">
          <label className="fc-label">Desired Vehicle Price</label>
          <div className="fc-input-wrap"><span className="fc-prefix">$</span>
            <input className="fc-input" type="number" min="0" value={desiredPrice} onChange={(e) => setDesiredPrice(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <div className="fc-field">
          <label className="fc-label">Down Payment</label>
          <div className="fc-input-wrap"><span className="fc-prefix">$</span>
            <input className="fc-input" type="number" min="0" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} placeholder="0" />
          </div>
        </div>
      </div>

      <p className="fc-section-title">Credit Score</p>
      <div className="fc-tier-grid">
        {CREDIT_TIERS.map((t) => (
          <button key={t.value} className={`fc-tier-btn${creditTier === t.value ? " active" : ""}`} onClick={() => setCreditTier(t.value)}>
            <span className="fc-tier-label">{t.label}</span>
            <span className="fc-tier-sub">{t.sub}</span>
          </button>
        ))}
      </div>

      <p className="fc-section-title">Preferred Loan Term</p>
      <div className="fc-term-row" style={{ marginBottom: 24 }}>
        {TERMS.map((t) => (
          <button key={t} className={`fc-term-btn${loanTerm === t ? " active" : ""}`} onClick={() => setLoanTerm(t)}>
            <span className="fc-term-mo">{t}</span>
            <span className="fc-term-label">mo</span>
          </button>
        ))}
      </div>

      {/* Instant estimate */}
      {estimate && meta && (
        <div className={`pa-estimate ${estimate.status}`} style={{ marginBottom: 18 }}>
          <div className={`pa-status-badge ${estimate.status}`}>
            {meta.label}
          </div>
          <div className="pa-max-loan">${fmt(estimate.maxLoan)}</div>
          <div className="pa-max-label">Estimated max loan at {estimate.apr}% APR · {loanTerm} months</div>
          <div className="pa-stats">
            <div className="pa-stat">
              <div className="pa-stat-label">Est. Monthly Payment</div>
              <div className="pa-stat-value">${fmt(estimate.monthly)}/mo</div>
            </div>
            <div className="pa-stat">
              <div className="pa-stat-label">Debt-to-Income Ratio</div>
              <div className="pa-stat-value">{estimate.dti}%</div>
            </div>
          </div>
        </div>
      )}

      {!hasData && (
        <div style={{ textAlign: "center", padding: "24px 0 8px", color: "#6B7280", fontSize: 13 }}>
          Enter your annual income above to see your pre-qualification estimate
        </div>
      )}

      {/* Submit */}
      {submitted ? (
        <div className="pa-success">
          <div className="pa-success-icon">✅</div>
          <div className="pa-success-title">Application submitted!</div>
          <div className="pa-success-sub">Our finance team will review your information and follow up within 1 business day.</div>
        </div>
      ) : (
        <>
          <button className="pa-submit" disabled={!hasData || submitting} onClick={handleSubmit}>
            {submitting ? "Submitting…" : "Submit Pre-Approval Request"}
          </button>
          {submitError && <p style={{ fontSize: 12, color: "#DC2626", textAlign: "center", marginBottom: 8 }}>{submitError}</p>}
        </>
      )}

      <Link href="/customer/chat?prefill=I%27d%20like%20to%20talk%20about%20financing%20and%20pre-approval%20options." className="fc-cta" style={{ background: "#111827" }}>
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        Talk to Alex about financing
      </Link>
      <p className="fc-disclaimer">Submitting does not guarantee approval or lock in a rate.<br />A formal application with documentation is required for final approval.</p>
    </>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function FinancingCalculator() {
  const [activeTab, setActiveTab] = useState<"calc" | "preapproval">("calc");

  return (
    <>
      <style>{SHARED_STYLES}</style>
      <div className="fc-root bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div style={{ padding: "24px 24px 0" }}>
          <h2 className="text-lg font-bold text-gray-900 mb-0.5">Financing</h2>
          <p className="text-sm text-gray-700 mb-4">Calculate payments or check if you pre-qualify — no credit pull required.</p>

          <div className="fc-tabs">
            <button className={`fc-tab${activeTab === "calc" ? " active" : ""}`} onClick={() => setActiveTab("calc")}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Payment Calculator
            </button>
            <button className={`fc-tab${activeTab === "preapproval" ? " active" : ""}`} onClick={() => setActiveTab("preapproval")}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pre-Approval Check
            </button>
          </div>
        </div>

        <div style={{ padding: "0 24px 28px" }}>
          {activeTab === "calc" ? <CalculatorTab /> : <PreApprovalTab />}
        </div>
      </div>
    </>
  );
}
