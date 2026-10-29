import { useEffect, useState } from "react";
import api from "@/lib/api";
import MedicineCard from "@/components/MedicineCard";
import { Search, Filter, ShieldCheck } from "lucide-react";

const CATEGORIES = [
  "All",
  "Antibiotic",
  "Pain Relief",
  "Diabetes",
  "Cardiac",
  "Respiratory",
  "Vitamins",
  "Dermatology",
  "Supplements",
  "Other",
];

export default function Browse() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [location, setLocation] = useState("");
  const [daysToExpiry, setDaysToExpiry] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params = { status: "available" };
    if (q) params.q = q;
    if (category && category !== "All") params.category = category;
    if (location) params.location = location;
    if (daysToExpiry) params.days_to_expiry = daysToExpiry;
    try {
      const { data } = await api.get("/medicines", { params });
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-12" data-testid="browse-page">
      <div className="grid grid-cols-12 gap-6 items-end mb-10">
        <div className="col-span-12 lg:col-span-6">
          <div className="eyebrow">Unexpired Surplus Catalogue</div>
          <h1 className="font-display text-6xl md:text-7xl tracking-tighter leading-[0.9] mt-3">
            Surplus stock, <em style={{ fontStyle: "italic" }}>ready to move.</em>
          </h1>
        </div>
        <div className="col-span-12 lg:col-span-6">
          <p className="text-neutral-600 text-sm max-w-lg lg:ml-auto leading-relaxed">
            Live unexpired medicines donated by pharmacies, clinics, and hospitals. Filter by category,
            city, or remaining shelf life. Verified healthcare receivers can claim items for free.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="hairline bg-white p-4 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-3 items-end shadow-sm">
        <div className="md:col-span-4">
          <label className="eyebrow block mb-2">Search Medication</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="e.g. Paracetamol, Amoxicillin, Metformin…"
              className="w-full h-11 pl-9 pr-3 border border-[hsl(var(--border))] text-sm rounded bg-white"
              data-testid="browse-search-input"
            />
          </div>
        </div>
        <div className="md:col-span-3">
          <label className="eyebrow block mb-2">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-11 px-3 border border-[hsl(var(--border))] text-sm bg-white rounded"
            data-testid="browse-category-select"
          >
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="eyebrow block mb-2">City</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Bengaluru, Delhi…"
            className="w-full h-11 px-3 border border-[hsl(var(--border))] text-sm rounded bg-white"
            data-testid="browse-location-input"
          />
        </div>
        <div className="md:col-span-2">
          <label className="eyebrow block mb-2">Shelf Life Remaining</label>
          <select
            value={daysToExpiry}
            onChange={(e) => setDaysToExpiry(e.target.value)}
            className="w-full h-11 px-3 border border-[hsl(var(--border))] text-sm bg-white rounded"
            data-testid="browse-days-select"
          >
            <option value="">Any (30+ days)</option>
            <option value="45">≤ 45 days (Urgent)</option>
            <option value="90">≤ 90 days</option>
            <option value="180">≤ 180 days</option>
          </select>
        </div>
        <div className="md:col-span-1">
          <button
            onClick={load}
            className="btn-primary w-full justify-center !py-3 !text-xs"
            data-testid="browse-apply-btn"
          >
            <Filter size={14} /> Filter
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs text-neutral-500 flex items-center gap-2" data-testid="browse-results-count">
          <span className="font-mono-alt font-bold text-neutral-800">{items.length}</span> unexpired medicine listings available
        </div>

        {/* 100% Free Donation Trust Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <ShieldCheck size={14} />
          <span>Zero Resale · 100% Free Donation Protocol</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 py-24 text-center text-neutral-500 text-sm">Loading catalogue…</div>
        ) : items.length === 0 ? (
          <div className="col-span-3 py-24 text-center text-neutral-500 text-sm hairline bg-white rounded-xl" data-testid="browse-empty">
            No medicine listings match the selected search criteria.
          </div>
        ) : (
          items.map((m, i) => <MedicineCard key={m.id} m={m} index={i} />)
        )}
      </div>
    </div>
  );
}
