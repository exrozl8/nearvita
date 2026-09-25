import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { Link } from "react-router-dom";
import { RequestRow } from "./DonorDashboard";
import { Search, Receipt } from "lucide-react";

export default function ReceiverDashboard() {
  const { user } = useAuth();
  const [claims, setClaims] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tab, setTab] = useState("claims"); // claims | receipts

  const load = async () => {
    const [claimsRes, payRes] = await Promise.all([
      api.get("/claims?role=receiver"),
      api.get("/payments/history").catch(() => ({ data: [] })),
    ]);
    setClaims(claimsRes.data);
    setPayments(payRes.data);
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = {
    pending: claims.filter((c) => c.status === "pending"),
    accepted: claims.filter((c) => c.status === "accepted"),
    completed: claims.filter((c) => c.status === "completed"),
    rejected: claims.filter((c) => c.status === "rejected"),
  };

  return (
    <div
      className="max-w-[1400px] mx-auto px-6 md:px-10 py-12"
      data-testid="receiver-dashboard"
    >
      <div className="grid grid-cols-12 gap-6 items-end mb-10">
        <div className="col-span-12 lg:col-span-8">
          <div className="eyebrow">Receiver Console & Patient Allocations</div>
          <h1 className="font-display text-6xl md:text-7xl leading-[0.9] tracking-tighter mt-3">
            Your <em style={{ fontStyle: "italic" }}>requests</em>, {user?.name?.split(" ")[0]}.
          </h1>
          <p className="mt-4 text-neutral-600 text-sm max-w-xl">
            Track your active medicine claims, verified payments, and arranged
            handovers. Open any thread to coordinate delivery with the donor pharmacy.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-4 flex lg:justify-end">
          <Link
            to="/browse"
            className="btn-primary"
            data-testid="receiver-browse-cta"
          >
            <Search size={16} /> Find medicines
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Stat label="Pending Requests" value={grouped.pending.length} />
        <Stat label="Accepted / Reserved" value={grouped.accepted.length} accent />
        <Stat label="Delivered" value={grouped.completed.length} />
        <Stat label="Verified Payments" value={payments.length} />
      </div>

      {/* Tabs */}
      <div className="border-b border-[hsl(var(--border))] flex gap-8 mb-6">
        {[
          { id: "claims", label: `Active Requests & Claims (${claims.length})` },
          { id: "receipts", label: `Payment Receipts & Invoices (${payments.length})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pb-3 text-sm font-medium transition ${
              tab === t.id
                ? "border-b-2 border-[#E05A47] text-[#0D1117]"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "claims" && (
        <div className="space-y-3">
          {claims.length === 0 ? (
            <div
              className="py-16 text-center text-sm text-neutral-500 hairline bg-white rounded-lg"
              data-testid="receiver-empty"
            >
              You haven't requested any medicines yet.{" "}
              <Link to="/browse" className="underline text-[#E05A47]">
                Browse the catalogue →
              </Link>
            </div>
          ) : (
            claims.map((c) => (
              <RequestRow key={c.id} c={c} role="receiver" onChange={load} />
            ))
          )}
        </div>
      )}

      {tab === "receipts" && (
        <div className="space-y-4">
          {payments.length === 0 ? (
            <div className="py-16 text-center text-sm text-neutral-500 hairline bg-white rounded-lg">
              No online payments recorded yet. When you pay for medicines via UPI or card, receipts appear here.
            </div>
          ) : (
            payments.map((p) => (
              <div
                key={p.id}
                className="hairline bg-white p-5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 grid place-items-center flex-shrink-0">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#0D1117]">
                        {p.transaction_id}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                        {p.status}
                      </span>
                    </div>
                    <div className="font-display text-xl mt-1 text-[#0D1117]">
                      {p.medicine_name} (x{p.quantity})
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      Paid via <strong className="uppercase">{p.method}</strong> · {new Date(p.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0">
                  <div className="text-right">
                    <div className="text-[11px] text-neutral-400">Total Paid</div>
                    <div className="font-display text-2xl text-[#0D1117]">
                      ₹{Number(p.amount).toFixed(2)}
                    </div>
                  </div>
                  {p.claim_id && (
                    <Link
                      to={`/claims/${p.claim_id}`}
                      className="btn-outline !py-2 !px-3 !text-xs"
                    >
                      View Thread →
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div
      className={`hairline p-5 rounded-lg ${
        accent ? "bg-[#0D1117] text-white border-[#0D1117]" : "bg-white"
      }`}
    >
      <div className={`eyebrow ${accent ? "!text-white/70" : ""}`}>{label}</div>
      <div className="font-display text-5xl mt-2 leading-none">
        {String(value).padStart(2, "0")}
      </div>
    </div>
  );
}
