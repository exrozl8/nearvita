import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiErrorDetail } from "@/lib/api";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  ShieldCheck,
  FileCheck2,
  Check,
  X,
  CheckCircle2,
} from "lucide-react";

const CATEGORIES = [
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
const FORMS = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Injection",
  "Ointment",
  "Drops",
  "Inhaler",
  "Other",
];

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

  useEffect(() => {
    load();
  }, []);

  const pending = claims.filter((c) => c.status === "pending").length;

  return (
    <div
      className="max-w-[1400px] mx-auto px-6 md:px-10 py-12"
      data-testid="donor-dashboard"
    >
      <div className="grid grid-cols-12 gap-6 items-end mb-10">
        <div className="col-span-12 lg:col-span-8">
          <div className="eyebrow flex items-center gap-1.5 text-neutral-500">
            <ShieldCheck size={14} className="text-emerald-700" /> Donor Console
          </div>
          <h1 className="font-display text-6xl md:text-7xl leading-[0.9] tracking-tighter mt-3">
            Hello, <em style={{ fontStyle: "italic" }}>{user?.name?.split(" ")[0]}</em>.
          </h1>
          <p className="mt-4 text-neutral-600 text-sm max-w-xl leading-relaxed">
            Manage your donated surplus medicines and allocate them to verified healthcare
            receivers. All medicines on NearVita are 100% free donations for charitable and community care.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-4 flex lg:justify-end">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="btn-primary"
            data-testid="donor-new-listing-btn"
          >
            <Plus size={16} /> {showForm ? "Close Form" : "Donate Medicine"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Stat
          label="Active Listings"
          value={listings.filter((l) => l.status === "available").length}
        />
        <Stat label="Pending Requests" value={pending} accent />
        <Stat
          label="Total Delivered"
          value={listings.filter((l) => l.status === "delivered").length}
        />
        <Stat
          label="Reserved"
          value={listings.filter((l) => l.status === "reserved").length}
        />
      </div>

      {showForm && (
        <NewListingForm
          onDone={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      <div className="mt-10 border-b border-[hsl(var(--border))] flex gap-8">
        {[
          ["listings", `My Donations (${listings.length})`],
          ["requests", `Incoming Requests (${claims.length})`],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`pb-3 text-sm font-medium transition ${
              tab === k
                ? "border-b-2 border-[#E05A47] text-[#0D1117]"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
            data-testid={`donor-tab-${k}`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "listings" && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {listings.length === 0 && (
            <div className="text-sm text-neutral-500 py-10 col-span-2 text-center hairline bg-white rounded-xl">
              No active listings yet. Click "Donate Medicine" above to list surplus stock.
            </div>
          )}
          {listings.map((l) => (
            <div
              key={l.id}
              className="hairline bg-white p-5 flex gap-4 rounded-xl"
              data-testid={`donor-listing-${l.id}`}
            >
              <div className="w-24 h-24 bg-[hsl(var(--secondary))] flex-shrink-0 overflow-hidden rounded-lg">
                {l.image_url ? (
                  <img
                    src={l.image_url}
                    alt={l.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center font-display text-3xl text-neutral-300">
                    {l.name?.[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="eyebrow">{l.category}</div>
                    <div className="font-display text-2xl truncate">{l.name}</div>
                  </div>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full ${
                      l.status === "available"
                        ? "bg-[#2E7D32]/10 text-[#2E7D32]"
                        : l.status === "reserved"
                        ? "bg-[#F57C00]/10 text-[#B25A00]"
                        : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {l.status}
                  </span>
                </div>
                <div className="text-xs text-neutral-600 mt-2">
                  Remaining Qty: <strong>{l.quantity}</strong> · Exp: {l.expiry_date} · {l.location}
                </div>
                <div className="mt-3 flex gap-3 items-center">
                  <Link
                    to={`/medicines/${l.id}`}
                    className="text-xs underline text-neutral-700 hover:text-black font-medium"
                    data-testid={`donor-view-${l.id}`}
                  >
                    View Details
                  </Link>
                  <button
                    onClick={async () => {
                      if (!window.confirm("Delete this medicine listing?")) return;
                      await api.delete(`/medicines/${l.id}`);
                      toast.success("Listing removed");
                      load();
                    }}
                    className="text-xs text-red-600 inline-flex items-center gap-1 hover:underline"
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
          {claims.length === 0 && (
            <div className="text-sm text-neutral-500 py-12 text-center hairline bg-white rounded-xl">
              No allocation requests received yet.
            </div>
          )}
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
    <div
      className={`hairline p-5 rounded-xl ${
        accent ? "bg-[#E05A47] text-white border-[#E05A47]" : "bg-white"
      }`}
    >
      <div className={`eyebrow ${accent ? "!text-white/80" : ""}`}>{label}</div>
      <div className="font-display text-5xl mt-2 leading-none">
        {String(value).padStart(2, "0")}
      </div>
    </div>
  );
}

function NewListingForm({ onDone }) {
  // Safety Rule: Expiry must be at least 30 days in the future
  const minDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [f, setF] = useState({
    name: "",
    brand: "",
    category: "Antibiotic",
    form: "Tablet",
    dosage: "",
    quantity: 1,
    expiry_date: minDate,
    location: "",
    description: "",
    image_url: "",
    prescription_required: false,
    batch_number: "",
    storage_condition: "Store in cool dry place below 25°C",
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
      };
      await api.post("/medicines", payload);
      toast.success("Medicine donation published successfully!");
      onDone();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="hairline bg-white p-6 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 shadow-sm"
      data-testid="new-listing-form"
    >
      <div className="md:col-span-3 flex items-baseline justify-between mb-2">
        <div>
          <div className="eyebrow">Donate Unused Surplus Medicine</div>
          <div className="font-display text-2xl mt-1">100% Free Redistribution</div>
        </div>
        <div className="text-xs text-neutral-500">Fields marked with * are required</div>
      </div>

      {/* Safety Policy Banner */}
      <div className="md:col-span-3 p-3.5 bg-neutral-50 rounded-lg border border-neutral-200 flex items-start gap-2.5 text-xs text-neutral-700">
        <ShieldCheck size={16} className="text-emerald-700 flex-shrink-0 mt-0.5" />
        <div>
          <strong>Medicine Safety Rule:</strong> Pursuant to Indian drug safety regulations, all donated medicines
          must have a minimum shelf life of at least <strong>30+ days remaining</strong>, have sealed blister packs or intact
          packaging, and be free of any damage or adulteration. Expired drugs are strictly rejected.
        </div>
      </div>

      <Input label="Medicine name*" v={f.name} on={(v) => set("name", v)} tid="ml-name" required />
      <Input label="Brand / Manufacturer" v={f.brand} on={(v) => set("brand", v)} tid="ml-brand" />
      <Select label="Category*" v={f.category} on={(v) => set("category", v)} options={CATEGORIES} tid="ml-category" />
      <Select label="Form" v={f.form} on={(v) => set("form", v)} options={FORMS} tid="ml-form" />
      <Input label="Dosage (e.g. 500mg, 10ml)" v={f.dosage} on={(v) => set("dosage", v)} tid="ml-dosage" />
      <Input label="Quantity (Strips / Units)*" type="number" v={f.quantity} on={(v) => set("quantity", v)} tid="ml-quantity" required />
      
      <div>
        <label className="block text-xs font-medium mb-1.5">
          Expiry date* (Min 30 days remaining)
        </label>
        <input
          type="date"
          min={minDate}
          value={f.expiry_date}
          onChange={(e) => set("expiry_date", e.target.value)}
          required
          className="w-full h-11 px-3 border border-[hsl(var(--border))] text-sm rounded bg-white"
          data-testid="ml-expiry-input"
        />
        <div className="text-[10px] text-neutral-400 mt-1">
          Minimum valid date: {minDate}
        </div>
      </div>

      <Input label="Pickup City / Area*" v={f.location} on={(v) => set("location", v)} tid="ml-location" required />
      <Input label="Image URL (Optional)" v={f.image_url} on={(v) => set("image_url", v)} tid="ml-image" />

      <Input label="Batch Number (Optional)" v={f.batch_number} on={(v) => set("batch_number", v)} tid="ml-batch" />
      <div className="md:col-span-2">
        <Input label="Storage Conditions" v={f.storage_condition} on={(v) => set("storage_condition", v)} tid="ml-storage" />
      </div>

      <div className="md:col-span-3">
        <label className="block text-xs font-medium mb-1.5">Description & Verification Notes</label>
        <textarea
          rows={3}
          value={f.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Original sealed packaging, factory foil intact, climate-controlled storage conditions…"
          className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm rounded"
          data-testid="ml-description-input"
        />
      </div>

      <label className="md:col-span-2 flex items-center gap-2 text-xs font-medium cursor-pointer">
        <input
          type="checkbox"
          checked={f.prescription_required}
          onChange={(e) => set("prescription_required", e.target.checked)}
          data-testid="ml-prescription-checkbox"
        />
        <span>Schedule H / Prescription Required (Receiver must certify physician prescription)</span>
      </label>

      <button
        type="submit"
        disabled={busy}
        className="btn-primary md:col-span-1 justify-center !py-2.5 !text-xs shadow-sm"
        data-testid="ml-submit-btn"
      >
        {busy ? "Publishing…" : "Publish Donation Listing"}
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
        className="w-full h-11 px-3 border border-[hsl(var(--border))] text-sm rounded bg-white"
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
        className="w-full h-11 px-3 border border-[hsl(var(--border))] text-sm bg-white rounded"
        data-testid={`${tid}-select`}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
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
      toast.success(`Request updated to: ${status}`);
      onChange();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const statusColor =
    c.status === "pending"
      ? "bg-[#F57C00]/10 text-[#B25A00] border border-[#F57C00]/30"
      : c.status === "accepted"
      ? "bg-[#0288D1]/10 text-[#0277BD] border border-[#0288D1]/30"
      : c.status === "completed"
      ? "bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/30"
      : "bg-neutral-100 text-neutral-500 border border-neutral-200";

  return (
    <div className="hairline bg-white p-5 rounded-xl shadow-sm" data-testid={`claim-row-${c.id}`}>
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow">{c.medicine?.category}</span>
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full ${statusColor}`}
            >
              {c.status}
            </span>
            {c.prescription_certified && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <FileCheck2 size={11} /> Rx Certified
              </span>
            )}
          </div>

          <div className="font-display text-2xl text-[#0D1117]">{c.medicine?.name}</div>

          <div className="text-xs text-neutral-600">
            {role === "donor"
              ? `Requested by ${c.receiver?.organization || c.receiver?.name}`
              : `Donated by ${c.donor?.organization || c.donor?.name}`}
            {" · "}
            Requested: <strong>{c.quantity_requested} units</strong>
            {" · "}
            {c.medicine?.location}
          </div>

          {c.prescription_doctor && (
            <div className="text-[11px] text-neutral-500">
              Prescription Ref: <strong>{c.prescription_rx_number || "Verified"}</strong> · Dr. {c.prescription_doctor}
            </div>
          )}

          {c.message && (
            <div className="mt-2 text-xs bg-neutral-50 border border-neutral-100 p-3 rounded-lg text-neutral-700 italic">
              "{c.message}"
            </div>
          )}

          <div className="pt-2">
            <Link
              to={`/claims/${c.id}`}
              className="text-xs text-[#E05A47] hover:underline font-semibold inline-flex items-center gap-1"
              data-testid={`claim-thread-link-${c.id}`}
            >
              Open handover coordination channel →
            </Link>
          </div>
        </div>

        {role === "donor" && c.status === "pending" && (
          <div className="flex sm:flex-row md:flex-col gap-2 w-full md:w-auto">
            <button
              onClick={() => update("accepted")}
              disabled={busy}
              className="btn-primary !py-2 !px-4 !text-xs !bg-emerald-700 hover:!bg-emerald-800 gap-1.5"
              data-testid={`claim-accept-${c.id}`}
            >
              <Check size={14} /> Accept & Reserve
            </button>
            <button
              onClick={() => update("rejected")}
              disabled={busy}
              className="btn-outline !py-2 !px-4 !text-xs !border-neutral-300 !text-neutral-600 hover:!bg-neutral-50 gap-1.5"
              data-testid={`claim-reject-${c.id}`}
            >
              <X size={14} /> Decline
            </button>
          </div>
        )}

        {role === "donor" && c.status === "accepted" && (
          <button
            onClick={() => update("completed")}
            disabled={busy}
            className="btn-primary !py-2 !px-4 !text-xs gap-1.5"
            data-testid={`claim-complete-${c.id}`}
          >
            <CheckCircle2 size={14} /> Confirm Handover Complete
          </button>
        )}
      </div>
    </div>
  );
}
