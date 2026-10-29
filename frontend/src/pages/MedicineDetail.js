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
  ShieldCheck,
  HeartHandshake,
  AlertCircle,
  FileCheck2,
} from "lucide-react";

export default function MedicineDetail() {
  const { id } = useParams();
  const [m, setM] = useState(null);
  const [msg, setMsg] = useState("");
  const [qty, setQty] = useState(1);
  const [rxDoctor, setRxDoctor] = useState("");
  const [rxNumber, setRxNumber] = useState("");
  const [rxCertified, setRxCertified] = useState(false);
  const [busy, setBusy] = useState(false);
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
    return (
      <div className="max-w-[700px] mx-auto px-6 py-20 text-center space-y-4">
        <div className="font-display text-3xl text-neutral-900">
          This medicine listing is no longer available.
        </div>
        <p className="text-sm text-neutral-600">
          It may have been claimed, removed, or replaced by refreshed catalogue data.
        </p>
        <Link to="/browse" className="btn-primary inline-flex !py-2.5 !px-5">
          <ChevronLeft size={16} /> Back to catalogue
        </Link>
      </div>
    );

  const days = Math.ceil(
    (new Date(m.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
  );

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.info("Please sign in to request this medicine donation.");
      nav("/login");
      return;
    }
    if (user.role !== "receiver" && user.role !== "admin") {
      toast.error(
        "Only registered receivers (NGOs, charitable clinics, or verified patients) can request medicines."
      );
      return;
    }
    if (user.role === "receiver" && !user.is_approved) {
      toast.error(
        "Your receiver account is currently pending administrative verification. Please wait for an administrator to approve your account before claiming medicines."
      );
      return;
    }
    if (m.prescription_required && !rxCertified) {
      toast.error(
        "Under the Drugs and Cosmetics Act, prescription certification is mandatory for this medicine."
      );
      return;
    }

    setBusy(true);
    try {
      const res = await api.post("/claims", {
        medicine_id: m.id,
        message: msg,
        quantity_requested: qty,
        prescription_doctor: rxDoctor,
        prescription_rx_number: rxNumber,
        prescription_certified: rxCertified,
      });
      toast.success("Donation claim submitted! Opening coordination thread…");
      nav(`/claims/${res.data.id}`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="max-w-[1400px] mx-auto px-6 md:px-10 py-10"
      data-testid="medicine-detail-page"
    >
      <Link
        to="/browse"
        className="text-xs text-neutral-500 inline-flex items-center gap-1 hover:text-[#0D1117] transition mb-6"
        data-testid="detail-back"
      >
        <ChevronLeft size={14} /> Back to catalogue
      </Link>

      <div className="grid grid-cols-12 gap-10">
        {/* Left Column: Image, Storage & Safety Protocols */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <div className="aspect-[4/3] hairline overflow-hidden bg-[hsl(var(--secondary))] relative rounded-xl shadow-sm">
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

            {/* Donation Badge */}
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-3.5 py-1.5 rounded-full shadow-md border border-emerald-200">
              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                🎁 100% Free Donation · Zero Resale
              </span>
            </div>
          </div>

          <div className="bg-white hairline p-6 rounded-xl space-y-3">
            <div className="eyebrow">Medical Description & Storage Condition</div>
            <p className="text-neutral-700 leading-relaxed text-sm">
              {m.description || "Unopened surplus medicine stored in compliance with standard pharmaceutical storage requirements."}
            </p>
            {m.storage_condition && (
              <div className="text-xs text-neutral-500 pt-2 border-t border-neutral-100">
                <strong>Storage:</strong> {m.storage_condition}
              </div>
            )}
            {m.batch_number && (
              <div className="text-xs text-neutral-500 font-mono">
                Batch No: {m.batch_number}
              </div>
            )}
          </div>

          {/* Safety & Compliance Alert */}
          <div className="p-4 rounded-xl bg-neutral-50 hairline border border-neutral-200 flex items-start gap-3">
            <ShieldCheck size={20} className="text-emerald-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-600 space-y-1">
              <div className="font-semibold text-neutral-900">
                NearVita Quality & Safety Assurance
              </div>
              <p>
                In compliance with the Drugs and Cosmetics Act, 1940, all listings must have at least 30+ days of
                remaining shelf life. Expired drugs are strictly barred. Handovers are coordinated directly with
                the donor facility under pharmacist supervision.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Specifications & Claim Request Form */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <div>
            <div className="chip mb-2">
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

          {/* Pure Donation Card */}
          <div className="p-5 hairline rounded-xl bg-white border border-neutral-200 space-y-2">
            <div className="text-xs text-neutral-500">Distribution Model</div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl text-emerald-800">
                Free Donation
              </span>
            </div>
            <p className="text-xs text-neutral-500 pt-1 border-t border-neutral-100">
              No money or transaction fee required. Donated free of charge for community healthcare.
            </p>
          </div>

          {/* Technical Specs Grid */}
          <div className="hairline p-5 bg-white grid grid-cols-2 gap-4 text-sm rounded-xl">
            <Info label="Form" value={m.form || "Tablet / Strip"} />
            <Info label="Dosage" value={m.dosage || "Standard formulation"} />
            <Info label="Available Stock" value={`${m.quantity} units`} />
            <Info
              label="Expiry Date"
              value={`${m.expiry_date} (${days}d left)`}
              icon={<CalendarClock size={12} />}
            />
            <Info
              label="Pickup City"
              value={m.location}
              icon={<MapPin size={12} />}
            />
            <Info
              label="Prescription"
              value={m.prescription_required ? "Schedule H (Required)" : "Not required"}
            />
          </div>

          {/* Donor Partner Card */}
          {m.donor && (
            <div className="hairline p-4 bg-white text-sm rounded-xl">
              <div className="eyebrow mb-1">Donor Partner</div>
              <div className="font-display text-2xl">
                {m.donor.organization || m.donor.name}
              </div>
              <div className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                <MapPin size={12} /> {m.donor.location}
              </div>
            </div>
          )}

          {/* Claim Action Area */}
          {m.status === "available" ? (
            <div className="p-6 hairline bg-white rounded-xl space-y-4 shadow-sm" data-testid="claim-form">
              <div className="flex items-center justify-between">
                <div className="eyebrow">Request Donation Allocation</div>
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Ready for Handover
                </span>
              </div>

              {/* Status Notice if Receiver is not verified */}
              {user && user.role === "receiver" && !user.is_approved && (
                <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle size={16} className="text-amber-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Verification Pending:</strong> Your receiver account has not yet been approved by an administrator.
                    You will be able to submit claim requests once verified.
                  </div>
                </div>
              )}

              {user && user.role === "donor" && (
                <div className="p-3 rounded-lg bg-neutral-100 text-xs text-neutral-600">
                  You are signed in as a Donor. Switch or sign into a verified Receiver account (clinic or NGO) to claim medicines.
                </div>
              )}

              <form onSubmit={handleClaimSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1 text-neutral-700">
                    Quantity requested (Max: {m.quantity})
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={m.quantity}
                    value={qty}
                    onChange={(e) => setQty(parseInt(e.target.value || "1"))}
                    className="w-full h-10 px-3 border border-neutral-300 rounded text-sm bg-white"
                  />
                </div>

                {/* Schedule H Prescription Check */}
                {m.prescription_required && (
                  <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                      <FileCheck2 size={15} /> Schedule H Prescription Requirement
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      As mandated under the Drugs & Cosmetics Act, redistribution of prescription medication requires
                      confirmation of a valid prescription issued by a Registered Medical Practitioner.
                    </p>

                    <div>
                      <label className="block text-[11px] font-medium text-neutral-800 mb-1">
                        Prescribing Doctor / Hospital Name*
                      </label>
                      <input
                        type="text"
                        required
                        value={rxDoctor}
                        onChange={(e) => setRxDoctor(e.target.value)}
                        placeholder="Dr. Sharma, MBBS / City Clinic"
                        className="w-full h-9 px-3 border border-neutral-300 rounded text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-neutral-800 mb-1">
                        Prescription / Rx Reference Number*
                      </label>
                      <input
                        type="text"
                        required
                        value={rxNumber}
                        onChange={(e) => setRxNumber(e.target.value)}
                        placeholder="e.g. RX-2026-9812"
                        className="w-full h-9 px-3 border border-neutral-300 rounded text-xs bg-white"
                      />
                    </div>

                    <label className="flex items-start gap-2 pt-1 text-xs text-neutral-800 cursor-pointer">
                      <input
                        type="checkbox"
                        required
                        checked={rxCertified}
                        onChange={(e) => setRxCertified(e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>
                        I certify that our healthcare facility / patient holds a valid prescription for this medicine.
                      </span>
                    </label>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium mb-1 text-neutral-700">
                    Message to donor (Clinic need, patient outreach, or pickup preference)
                  </label>
                  <textarea
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    rows={3}
                    placeholder="Describe your clinic, medical camp, or patient requirements…"
                    className="w-full px-3 py-2 border border-neutral-300 rounded text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy || (user && user.role === "receiver" && !user.is_approved)}
                  className="btn-primary w-full justify-center !py-3 !text-sm gap-2 shadow-sm"
                  data-testid="pay-and-reserve-btn"
                >
                  <HeartHandshake size={16} />
                  {busy ? "Submitting Request…" : "Claim Medicine (100% Free Donation)"}
                </button>
              </form>

              {!user && (
                <div className="text-[11px] text-neutral-500 text-center bg-neutral-50 py-2.5 rounded">
                  Please{" "}
                  <Link to="/login" className="underline font-semibold text-[#0D1117]">
                    sign in
                  </Link>{" "}
                  or{" "}
                  <Link to="/register" className="underline font-semibold text-[#0D1117]">
                    register as a verified receiver
                  </Link>{" "}
                  to claim donations.
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 hairline bg-neutral-100 rounded-xl text-center text-sm text-neutral-600">
              This medicine has already been reserved or delivered.
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
