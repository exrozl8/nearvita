import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api, { formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { CalendarClock, MapPin, ChevronLeft, PackageCheck } from "lucide-react";

export default function MedicineDetail() {
  const { id } = useParams();
  const [m, setM] = useState(null);
  const [msg, setMsg] = useState("");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    api.get(`/medicines/${id}`).then((r) => setM(r.data)).catch(() => setM(false));
  }, [id]);

  if (m === null) return <div className="p-20 text-center text-neutral-500">Loading…</div>;
  if (m === false) return <div className="p-20 text-center">Not found.</div>;

  const days = Math.ceil((new Date(m.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));

  const requestItem = async () => {
    if (!user) return nav("/login");
    if (user.role !== "receiver") {
      toast.error("Only receivers can request medicines. Switch role from a receiver account.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/claims", { medicine_id: m.id, message: msg, quantity_requested: qty });
      toast.success("Request sent to donor");
      nav("/receiver");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-10" data-testid="medicine-detail-page">
      <Link to="/browse" className="text-xs text-neutral-500 inline-flex items-center gap-1 hover:text-[#0D1117]" data-testid="detail-back">
        <ChevronLeft size={14} /> Back to catalogue
      </Link>
      <div className="mt-6 grid grid-cols-12 gap-10">
        <div className="col-span-12 lg:col-span-7">
          <div className="aspect-[4/3] hairline overflow-hidden bg-[hsl(var(--secondary))]">
            {m.image_url ? (
              <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center font-display text-9xl text-neutral-300">
                {m.name?.[0]}
              </div>
            )}
          </div>
          <div className="mt-8">
            <div className="eyebrow">Description</div>
            <p className="mt-3 text-neutral-700 leading-relaxed max-w-2xl">
              {m.description || "No additional notes provided by the donor."}
            </p>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-5">
          <div className="chip mb-4">
            <PackageCheck size={12} /> {m.status}
          </div>
          <div className="eyebrow">{m.category}</div>
          <h1 className="font-display text-6xl leading-[0.95] tracking-tighter mt-2">{m.name}</h1>
          {m.brand && <div className="mt-2 text-neutral-500">{m.brand}</div>}

          <div className="mt-8 hairline p-6 bg-white grid grid-cols-2 gap-4 text-sm">
            <Info label="Form" value={m.form || "—"} />
            <Info label="Dosage" value={m.dosage || "—"} />
            <Info label="Quantity" value={m.quantity} />
            <Info label="Expiry" value={`${m.expiry_date} · ${days} days`} icon={<CalendarClock size={12} />} />
            <Info label="Location" value={m.location} icon={<MapPin size={12} />} />
            <Info label="Prescription" value={m.prescription_required ? "Required" : "Not required"} />
          </div>

          {m.donor && (
            <div className="mt-4 hairline p-4 bg-white text-sm">
              <div className="eyebrow mb-1">Donor</div>
              <div className="font-display text-2xl">{m.donor.organization || m.donor.name}</div>
              <div className="text-xs text-neutral-500 mt-1">{m.donor.location}</div>
            </div>
          )}

          {m.status === "available" && (!user || user.role === "receiver") && (
            <div className="mt-6 hairline bg-white p-6" data-testid="claim-form">
              <div className="eyebrow mb-3">Request this medicine</div>
              <label className="block text-xs mb-1.5">Quantity requested</label>
              <input
                type="number"
                min={1}
                max={m.quantity}
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value || "1"))}
                className="w-full h-11 px-3 border border-[hsl(var(--border))] text-sm"
                data-testid="claim-qty-input"
              />
              <label className="block text-xs mt-4 mb-1.5">Message to donor</label>
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                rows={4}
                placeholder="Tell the donor about the patient or organization…"
                className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm"
                data-testid="claim-message-input"
              />
              <button
                onClick={requestItem}
                disabled={busy}
                className="btn-primary w-full justify-center mt-4"
                data-testid="claim-submit-btn"
              >
                {busy ? "Sending…" : "Send request"}
              </button>
              {!user && (
                <div className="text-[11px] text-neutral-500 mt-2 text-center">
                  You'll be asked to sign in first.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, icon }) {
  return (
    <div>
      <div className="eyebrow flex items-center gap-1">{icon}{label}</div>
      <div className="mt-1 text-[hsl(var(--foreground))]">{value}</div>
    </div>
  );
}
