"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Vehicle {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  trim: string | null;
  color: string | null;
  msrp: number;
  status: string;
  mileage: number;
  features: string[];
  imageUrls: string[];
}

export default function CustomerInventoryPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  useEffect(() => {
    fetchVehicles();
  }, []);

  async function fetchVehicles() {
    setLoading(true);
    const params = new URLSearchParams({ status: "AVAILABLE" });
    if (maxPrice) params.set("maxPrice", maxPrice);

    const res = await fetch(`/api/inventory?${params}`);
    const data = await res.json();
    setVehicles(data.vehicles ?? []);
    setLoading(false);
  }

  const filtered = vehicles.filter((v) => {
    const q = search.toLowerCase();
    return (
      !q ||
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      String(v.year).includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/customer/dashboard" className="text-sm text-blue-600 hover:underline">
            ← Dashboard
          </Link>
          <h1 className="font-bold text-xl text-gray-900">Available Inventory</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by make, model, or year..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Max price"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-36 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={fetchVehicles}
              className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Filter
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-600 text-sm">Loading inventory...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-600 text-sm">No vehicles match your search.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((vehicle) => (
              <div key={vehicle.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                {/* Placeholder image */}
                <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  {vehicle.imageUrls.length > 0 ? (
                    <img src={vehicle.imageUrls[0]} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v5m-7 7a2 2 0 01-2-2 2 2 0 012-2 2 2 0 012 2 2 2 0 01-2 2zm7 0a2 2 0 01-2-2 2 2 0 012-2 2 2 0 012 2 2 2 0 01-2 2z" />
                    </svg>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </h3>
                  </div>
                  {vehicle.trim && (
                    <p className="text-xs text-gray-700 mb-2">{vehicle.trim}{vehicle.color ? ` · ${vehicle.color}` : ""}</p>
                  )}
                  <p className="text-lg font-bold text-blue-600 mb-2">
                    ${vehicle.msrp.toLocaleString()}
                  </p>
                  {vehicle.mileage > 0 && (
                    <p className="text-xs text-gray-700 mb-3">{vehicle.mileage.toLocaleString()} mi</p>
                  )}
                  {vehicle.features.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {vehicle.features.slice(0, 3).map((f) => (
                        <span key={f} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{f}</span>
                      ))}
                      {vehicle.features.length > 3 && (
                        <span className="text-xs text-gray-600">+{vehicle.features.length - 3} more</span>
                      )}
                    </div>
                  )}
                  <Link href="/customer/chat">
                    <button className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
                      Ask About This Car
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
