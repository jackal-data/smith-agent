"use client";

import { useState } from "react";
import type { FinancingScenario } from "@/types/chat";

export function FinancingCalculator() {
  const [vehiclePrice, setVehiclePrice] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [creditTier, setCreditTier] = useState("good");
  const [scenarios, setScenarios] = useState<FinancingScenario[]>([]);
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    if (!vehiclePrice) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        vehiclePrice,
        downPayment: downPayment || "0",
        creditTier,
      });
      const res = await fetch(`/api/financing/options?${params}`);
      const data = await res.json();
      setScenarios(data.scenarios || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Financing Calculator</h2>

      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-xs text-gray-700 mb-1">Vehicle Price ($)</label>
          <input
            type="number"
            value={vehiclePrice}
            onChange={(e) => setVehiclePrice(e.target.value)}
            placeholder="35000"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-700 mb-1">Down Payment ($)</label>
          <input
            type="number"
            value={downPayment}
            onChange={(e) => setDownPayment(e.target.value)}
            placeholder="5000"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-700 mb-1">Credit Tier</label>
          <select
            value={creditTier}
            onChange={(e) => setCreditTier(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="excellent">Excellent (750+)</option>
            <option value="good">Good (700–749)</option>
            <option value="fair">Fair (650–699)</option>
            <option value="poor">Poor (&lt;650)</option>
          </select>
        </div>
        <button
          onClick={calculate}
          disabled={loading || !vehiclePrice}
          className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Calculating..." : "Calculate Payments"}
        </button>
      </div>

      {scenarios.length > 0 && (
        <div className="space-y-3 border-t pt-4">
          {scenarios.map((s) => (
            <div key={s.termMonths} className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-900">{s.termMonths} months</span>
                <span className="text-lg font-bold text-blue-700">
                  ${s.monthlyPayment.toLocaleString()}/mo
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-700">
                <span>{s.apr}% APR</span>
                <span>Total: ${s.totalCost.toLocaleString()}</span>
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-400 text-center">
            Rates are estimates. Final terms subject to credit approval.
          </p>
        </div>
      )}
    </div>
  );
}
