import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api, { formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  CalendarClock,
  MapPin,
  ChevronLeft,
  PackageCheck,
  CreditCard,
  ShieldCheck,
  Truck,
} from "lucide-react";
import PaymentModal from "@/components/PaymentModal";

export default function MedicineDetail() {
  const { id } = useParams();
  const [m, setM] = useState(null);
  const [msg, setMsg] = useState("");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const { user } = useAuth();
  const nav = useNavigate();

  const loadMedicine = () => {
    api
      .get(`/medicines/${id}`)
      .then((r) => setM(r.data))
      .catch(() => setM(false));
  };

  useEffect(() => {
    loadMedicine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (m === null)
    return <div className="p-20 text-center text-neutral-500">Loading…</div>;
  if (m === false)
    return <div className="p-20 text-center">Not found.</div>;

  const days = Math.ceil(
    (new Date(m.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
  );
  const isFree = m.is_free || Number(m.price) === 0;
  const unitPrice = Number(m.price || 0);
  const origPrice = Number(m.original_price || (unitPrice > 0 ? unitPrice * 3 : 0));
  const discountPercent =
    origPrice > unitPrice
      ? Math.round(((origPrice - unitPrice) / origPrice) * 100)
      : 0;

  const requestFreeItem = async () => {
    if (!user) return nav("/login");
    if (user.role !== "receiver") {
      toast.error(
        "Only receivers can request medicines. Switch role or login from a receiver account."
      );
      return;
    }
    setBusy(true);
    try {
      await api.post("/claims", {
        medicine_id: m.id,
        message: msg,
        quantity_requested: qty,
      });
      toast.success("Request sent to donor");
      nav("/receiver");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const handleCheckoutClick = () => {
    if (!user) {
      toast.info("Please sign in or select a demo account to checkout.");
      nav("/login");
      return;
    }
    setShowPaymentModal(true);
  };

  return (
    <div
      className="max-w-[1400px] mx-auto px-6 md:px-10 py-10"
      data-testid="medicine-detail-page"
    >
      <Link
        to="/browse"
        className="text-xs text-neutral-500 inline-flex items-center gap-1 hover:text-[#0D1117]"
        data-testid="detail-back"
      >
        <ChevronLeft size={14} /> Back to catalogue
      </Link>
      <div className="mt-6 grid grid-cols-12 gap-10">
        
        {/* Left Column: Image and Description */}
        <div className="col-span-12 lg:col-span-7">
          <div className="aspect-[4/3] hairline overflow-hidden bg-[hsl(var(--secondary))] relative rounded-lg">
            {m.image_url ? (
              <img
                src={m.image_url}
                alt={m.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full grid place-items-center font-display text-9xl text-neutral-300">
                {m.name?.[0]}
              </div>
            )}
            
            {/* Price overlay badge */}
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-3.5 py-1.5 rounded-full shadow-md border border-neutral-200">
              {isFree ? (
                <span className="text-xs font-bold text-emerald-700">
                  🎁 100% Free Donation
                </span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-lg text-[#0D1117]">
                    ₹{unitPrice}
                  </span>
                  {origPrice > unitPrice && (
                    <span className="text-xs text-neutral-400 line-through">
                      ₹{origPrice}
                    </span>
                  )}
                  {discountPercent > 0 && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      {discountPercent}% OFF
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8">
            <div className="eyebrow">Medical Description & Storage Info</div>
            <p className="mt-3 text-neutral-700 leading-relaxed max-w-2xl">
              {m.description || "No additional notes provided by the donor."}
            </p>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-neutral-50 hairline border border-neutral-200 flex items-center gap-3">
            <ShieldCheck size={20} className="text-emerald-600 flex-shrink-0" />
            <div className="text-xs text-neutral-600">
              <strong className="text-neutral-900">NearVita Quality Assurance:</strong> Donors guarantee verified batch numbers and temperature-controlled storage before final handover.
            </div>
          </div>
        </div>

        {/* Right Column: Pricing, Specs, and Actions */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <div>
            <div className="chip mb-3">
              <PackageCheck size={12} /> {m.status}
            </div>
            <div className="eyebrow">{m.category}</div>
            <h1 className="font-display text-5xl md:text-6xl leading-[0.95] tracking-tighter mt-1">
              {m.name}
            </h1>
            {m.brand && (
              <div className="mt-2 text-sm text-neutral-600 font-medium">
                Manufacturer: {m.brand}
              </div>
            )}
          </div>

          {/* Pricing Box */}
          <div className="p-5 hairline rounded-xl bg-white border border-neutral-200 space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-xs text-neutral-500">Allocation Price</div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="font-display text-4xl text-[#0D1117]">
                    {isFree ? "Free" : `₹${unitPrice}`}
                  </span>
                  {origPrice > unitPrice && (
                    <span className="text-sm text-neutral-400 line-through">
                      MRP ₹{origPrice}
                    </span>
                  )}
                </div>
              </div>
              {discountPercent > 0 && (
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    Save {discountPercent}%
                  </span>
                </div>
              )}
            </div>

            <div className="text-xs text-neutral-600 flex items-center gap-2 pt-2 border-t border-neutral-100">
              <Truck size={14} className="text-neutral-400" />
              <span>
                {m.delivery_fee > 0
                  ? `Courier / Transport handling: ₹${m.delivery_fee}`
                  : "Free Handover / Pickup at donor location"}
              </span>
            </div>
          </div>

          {/* Technical Specs Grid */}
          <div className="hairline p-5 bg-white grid grid-cols-2 gap-4 text-sm rounded-lg">
            <Info label="Form" value={m.form || "Tablet"} />
            <Info label="Dosage" value={m.dosage || "Standard"} />
            <Info label="Available Qty" value={`${m.quantity} units`} />
            <Info
              label="Expiry"
              value={`${m.expiry_date} (${days}d left)`}
              icon={<CalendarClock size={12} />}
            />
            <Info
              label="Pickup Location"
              value={m.location}
              icon={<MapPin size={12} />}
            />
            <Info
              label="Prescription"
              value={m.prescription_required ? "Required" : "Not required"}
            />
          </div>

          {/* Donor Card */}
          {m.donor && (
            <div className="hairline p-4 bg-white text-sm rounded-lg">
              <div className="eyebrow mb-1">Donor Partner</div>
              <div className="font-display text-2xl">
                {m.donor.organization || m.donor.name}
              </div>
              <div className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                <MapPin size={12} /> {m.donor.location}
              </div>
            </div>
          )}

          {/* Action Area: Pay & Reserve OR Claim */}
          {m.status === "available" && (
            <div className="p-6 hairline bg-white rounded-xl space-y-4 shadow-sm" data-testid="claim-form">
              <div className="flex items-center justify-between">
                <div className="eyebrow">Checkout & Allocation</div>
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                  Stock Ready
                </span>
              </div>

              {/* Primary Payment / Checkout CTA */}
              <button
                type="button"
                onClick={handleCheckoutClick}
                className="btn-primary w-full justify-center !py-3 !text-sm gap-2 shadow-md hover:shadow-lg transition"
                data-testid="pay-and-reserve-btn"
              >
                <CreditCard size={16} />
                {isFree
                  ? "Claim & Reserve (Free ₹0)"
                  : `Pay & Reserve Now (₹${unitPrice})`}
              </button>

              {/* Alternative Traditional Request Form Toggle */}
              <div className="pt-3 border-t border-neutral-200">
                <details className="text-xs group">
                  <summary className="cursor-pointer text-neutral-500 hover:text-neutral-800 font-medium flex items-center justify-between">
                    <span>Or send a custom message / request to donor</span>
                    <span className="text-[10px] text-neutral-400 group-open:rotate-180 transition">▼</span>
                  </summary>

                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium mb-1">Quantity requested</label>
                      <input
                        type="number"
                        min={1}
                        max={m.quantity}
                        value={qty}
                        onChange={(e) => setQty(parseInt(e.target.value || "1"))}
                        className="w-full h-9 px-3 border border-neutral-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium mb-1">Message to donor</label>
                      <textarea
                        value={msg}
                        onChange={(e) => setMsg(e.target.value)}
                        rows={3}
                        placeholder="Tell the donor about your clinic, patient need, or NGO camp…"
                        className="w-full px-3 py-2 border border-neutral-300 rounded text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={requestFreeItem}
                      disabled={busy}
                      className="btn-outline w-full justify-center !py-2 !text-xs"
                    >
                      {busy ? "Sending…" : "Send Request Without Online Payment"}
                    </button>
                  </div>
                </details>
              </div>

              {!user && (
                <div className="text-[11px] text-neutral-500 text-center bg-neutral-50 py-2 rounded">
                  You can sign in with 1-click using our pre-seeded demo accounts.
                </div>
              )}
            </div>
          )}

          {m.status !== "available" && (
            <div className="p-6 hairline bg-neutral-100 rounded-xl text-center text-sm text-neutral-600">
              This medicine has already been reserved or delivered.
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          medicine={m}
          user={user}
          onClose={() => setShowPaymentModal(false)}
          onPaid={() => {
            loadMedicine();
          }}
        />
      )}
    </div>
  );
}

function Info({ label, value, icon }) {
  return (
    <div>
      <div className="eyebrow flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-[hsl(var(--foreground))] font-medium">
        {value}
      </div>
    </div>
  );
}
