import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiErrorDetail } from "@/lib/api";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const CATEGORIES = ["Antibiotic", "Pain Relief", "Diabetes", "Cardiac", "Respiratory", "Vitamins", "Dermatology", "Other"];
const FORMS = ["Tablet", "Capsule", "Syrup", "Injection", "Ointment", "Drops", "Inhaler", "Other"];

export default function DonorDashboard() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [claims, setClaims] = useState([]);
  const [tab, setTab] = useState("listings");
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const [a, b] = await Promise.all([
      api.get("/medicines?mine=true&status=all"),
      api.get("/claims?role=donor"),
    ]);
    setListings(a.data);
    setClaims(b.data);
  };

  useEffect(() => { load(); }, []);

  const pending = claims.filter((c) => c.status === "pending").length;

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-12" data-testid="donor-dashboard">
      <div className="grid grid-cols-12 gap-6 items-end mb-10">
        <div className="col-span-12 lg:col-span-8">
          <div className="eyebrow">Donor console</div>
          <h1 className="font-display text-6xl md:text-7xl leading-[0.9] tracking-tighter mt-3">
            Hello, <em style={{ fontStyle: "italic" }}>{user?.name?.split(" ")[0]}</em>.
          </h1>
          <p className="mt-4 text-neutral-600 text-sm max-w-xl">
            Manage active listings and requests from receivers. Accepting a
            request opens a private thread to arrange handover.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-4 flex lg:justify-end">
          <button onClick={() => setShowForm((v) => !v)} className="btn-primary" data-testid="donor-new-listing-btn">
            <Plus size={16} /> {showForm ? "Close form" : "New listing"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Stat label="Active listings" value={listings.filter((l) => l.status === "available").length} />
        <Stat label="Pending requests" value={pending} accent />
        <Stat label="Total delivered" value={listings.filter((l) => l.status === "delivered").length} />
        <Stat label="Reserved" value={listings.filter((l) => l.status === "reserved").length} />
      </div>

      {showForm && <NewListingForm onDone={() => { setShowForm(false); load(); }} />}

      <div className="mt-10 border-b border-[hsl(var(--border))] flex gap-8">
        {[
          ["listings", `Listings (${listings.length})`],
          ["requests", `Requests (${claims.length})`],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`pb-3 text-sm ${tab === k ? "border-b-2 border-[#E05A47] text-[#0D1117]" : "text-neutral-500"}`}
            data-testid={`donor-tab-${k}`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "listings" && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {listings.length === 0 && <div className="text-sm text-neutral-500 py-10">No listings yet. Add one to get started.</div>}
          {listings.map((l) => (
            <div key={l.id} className="hairline bg-white p-5 flex gap-4" data-testid={`donor-listing-${l.id}`}>
              <div className="w-24 h-24 bg-[hsl(var(--secondary))] flex-shrink-0 overflow-hidden">
                {l.image_url ? <img src={l.image_url} alt={l.name} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center font-display text-3xl text-neutral-300">{l.name?.[0]}</div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="eyebrow">{l.category}</div>
                    <div className="font-display text-2xl">{l.name}</div>
                  </div>
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-1 ${l.status === "available" ? "bg-[#2E7D32]/10 text-[#2E7D32]" : l.status === "reserved" ? "bg-[#F57C00]/10 text-[#B25A00]" : "bg-neutral-100 text-neutral-500"}`}>{l.status}</span>
                </div>
                <div className="text-xs text-neutral-600 mt-2">Qty {l.quantity} · Exp {l.expiry_date} · {l.location}</div>
                <div className="mt-3 flex gap-3 items-center">
                  <Link to={`/medicines/${l.id}`} className="text-xs underline" data-testid={`donor-view-${l.id}`}>View</Link>
                  <button
                    onClick={async () => {
                      if (!window.confirm("Delete listing?")) return;
                      await api.delete(`/medicines/${l.id}`);
                      toast.success("Listing removed");
                      load();
                    }}
                    className="text-xs text-red-600 inline-flex items-center gap-1"
                    data-testid={`donor-delete-${l.id}`}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "requests" && (
        <div className="mt-8 space-y-3">
          {claims.length === 0 && <div className="text-sm text-neutral-500 py-10">No requests yet.</div>}
          {claims.map((c) => (
            <RequestRow key={c.id} c={c} role="donor" onChange={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className={`hairline p-5 ${accent ? "bg-[#E05A47] text-white border-[#E05A47]" : "bg-white"}`}>
      <div className={`eyebrow ${accent ? "!text-white/80" : ""}`}>{label}</div>
      <div className="font-display text-5xl mt-2 leading-none">{String(value).padStart(2, "0")}</div>
    </div>
  );
}

function NewListingForm({ onDone }) {
  const [isFreeDonation, setIsFreeDonation] = useState(true);
  const [f, setF] = useState({
    name: "", brand: "", category: "Antibiotic", form: "Tablet", dosage: "",
    quantity: 1, expiry_date: "", location: "", description: "", image_url: "",
    prescription_required: false, price: 0, original_price: "", delivery_fee: 0,
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...f,
        quantity: parseInt(f.quantity),
        price: isFreeDonation ? 0.0 : parseFloat(f.price || 0),
        original_price: f.original_price ? parseFloat(f.original_price) : null,
        delivery_fee: parseFloat(f.delivery_fee || 0),
      };
      await api.post("/medicines", payload);
      toast.success("Listing added successfully");
      onDone();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="hairline bg-white p-6 grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="new-listing-form">
      <div className="md:col-span-3 flex items-baseline justify-between mb-2">
        <div className="eyebrow">New Medicine Listing</div>
        <div className="text-xs text-neutral-500">Fields marked with * are required</div>
      </div>
      <Input label="Medicine name*" v={f.name} on={(v) => set("name", v)} tid="ml-name" required />
      <Input label="Brand / Manufacturer" v={f.brand} on={(v) => set("brand", v)} tid="ml-brand" />
      <Select label="Category*" v={f.category} on={(v) => set("category", v)} options={CATEGORIES} tid="ml-category" />
      <Select label="Form" v={f.form} on={(v) => set("form", v)} options={FORMS} tid="ml-form" />
      <Input label="Dosage (e.g. 500mg)" v={f.dosage} on={(v) => set("dosage", v)} tid="ml-dosage" />
      <Input label="Quantity*" type="number" v={f.quantity} on={(v) => set("quantity", v)} tid="ml-quantity" required />
      <Input label="Expiry date*" type="date" v={f.expiry_date} on={(v) => set("expiry_date", v)} tid="ml-expiry" required />
      <Input label="Pickup city*" v={f.location} on={(v) => set("location", v)} tid="ml-location" required />
      <Input label="Image URL" v={f.image_url} on={(v) => set("image_url", v)} tid="ml-image" />
      
      {/* Pricing Mode Selector */}
      <div className="md:col-span-3 p-4 rounded-lg bg-neutral-50 border border-neutral-200">
        <label className="eyebrow block mb-2">Listing Model</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="radio"
              name="donation_mode"
              checked={isFreeDonation}
              onChange={() => {
                setIsFreeDonation(true);
                set("price", 0);
              }}
            />
            🎁 100% Free Donation (No cost to receiver)
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="radio"
              name="donation_mode"
              checked={!isFreeDonation}
              onChange={() => setIsFreeDonation(false)}
            />
            💳 Subsidized / Nominal Fee (Affordable Healthcare)
          </label>
        </div>

        {!isFreeDonation && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-neutral-200">
            <Input
              label="Subsidized Price (₹)*"
              type="number"
              v={f.price}
              on={(v) => set("price", v)}
              tid="ml-price"
              required={!isFreeDonation}
            />
            <Input
              label="Original Retail MRP (₹)"
              type="number"
              v={f.original_price}
              on={(v) => set("original_price", v)}
              tid="ml-mrp"
            />
            <Input
              label="Delivery / Courier Fee (₹)"
              type="number"
              v={f.delivery_fee}
              on={(v) => set("delivery_fee", v)}
              tid="ml-delivery"
            />
          </div>
        )}
      </div>

      <div className="md:col-span-3">
        <label className="block text-xs font-medium mb-1.5">Description</label>
        <textarea
          rows={3}
          value={f.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Sealed packaging, storage temperature, batch condition…"
          className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm"
          data-testid="ml-description-input"
        />
      </div>
      <label className="md:col-span-2 flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={f.prescription_required}
          onChange={(e) => set("prescription_required", e.target.checked)}
          data-testid="ml-prescription-checkbox"
        />
        Prescription required for handover
      </label>
      <button type="submit" disabled={busy} className="btn-primary md:col-span-1 justify-center" data-testid="ml-submit-btn">
        {busy ? "Publishing…" : "Publish listing"}
      </button>
    </form>
  );
}

function Input({ label, v, on, type = "text", required, tid }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5">{label}</label>
      <input
        type={type}
        value={v}
        onChange={(e) => on(e.target.value)}
        required={required}
        className="w-full h-11 px-3 border border-[hsl(var(--border))] text-sm"
        data-testid={`${tid}-input`}
      />
    </div>
  );
}
function Select({ label, v, on, options, tid }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5">{label}</label>
      <select
        value={v}
        onChange={(e) => on(e.target.value)}
        className="w-full h-11 px-3 border border-[hsl(var(--border))] text-sm bg-white"
        data-testid={`${tid}-select`}
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

export function RequestRow({ c, role, onChange }) {
  const [busy, setBusy] = useState(false);
  const update = async (status) => {
    setBusy(true);
    try {
      await api.patch(`/claims/${c.id}`, { status });
      toast.success(`Request ${status}`);
      onChange();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally { setBusy(false); }
  };

  const statusColor =
    c.status === "pending" ? "bg-[#F57C00]/10 text-[#B25A00]" :
    c.status === "accepted" ? "bg-[#0288D1]/10 text-[#0277BD]" :
    c.status === "completed" ? "bg-[#2E7D32]/10 text-[#2E7D32]" :
    "bg-neutral-100 text-neutral-500";

  return (
    <div className="hairline bg-white p-5" data-testid={`claim-row-${c.id}`}>
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="eyebrow">{c.medicine?.category}</div>
            <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${statusColor}`}>{c.status}</span>
            {c.transaction_id && (
              <span className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                💳 Paid ₹{c.amount_paid} ({c.payment_method?.toUpperCase()})
              </span>
            )}
          </div>
          <div className="font-display text-2xl mt-1">{c.medicine?.name}</div>
          <div className="text-xs text-neutral-600 mt-1">
            {role === "donor" ? `From ${c.receiver?.organization || c.receiver?.name}` : `To ${c.donor?.organization || c.donor?.name}`}
            {" · "}Qty {c.quantity_requested}{" · "}{c.medicine?.location}
          </div>
          {c.transaction_id && (
            <div className="text-[11px] font-mono text-neutral-500 mt-1">
              Order Ref: {c.transaction_id}
            </div>
          )}
          {c.message && <div className="mt-3 text-sm bg-[hsl(var(--secondary))] p-3 italic">"{c.message}"</div>}
          <div className="mt-3 flex gap-3">
            <Link to={`/claims/${c.id}`} className="text-xs underline text-[#E05A47] font-medium" data-testid={`claim-thread-link-${c.id}`}>Open coordination thread →</Link>
          </div>
        </div>
        {role === "donor" && c.status === "pending" && (
          <div className="flex flex-col gap-2">
            <button onClick={() => update("accepted")} disabled={busy} className="btn-primary !py-2 !px-4 !text-xs" data-testid={`claim-accept-${c.id}`}>Accept</button>
            <button onClick={() => update("rejected")} disabled={busy} className="btn-outline !py-2 !px-4 !text-xs !border-neutral-400 !text-neutral-500" data-testid={`claim-reject-${c.id}`}>Reject</button>
          </div>
        )}
        {role === "donor" && c.status === "accepted" && (
          <button onClick={() => update("completed")} disabled={busy} className="btn-primary !py-2 !px-4 !text-xs" data-testid={`claim-complete-${c.id}`}>Mark delivered</button>
        )}
      </div>
    </div>
  );
}
