import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { Link } from "react-router-dom";
import { RequestRow } from "./DonorDashboard";
import { Search, ShieldAlert, HeartHandshake } from "lucide-react";

export default function ReceiverDashboard() {
  const { user } = useAuth();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const claimsRes = await api.get("/claims?role=receiver");
      setClaims(claimsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const isApproved = user?.is_approved;

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
      {/* Header */}
      <div className="grid grid-cols-12 gap-6 items-end mb-10">
        <div className="col-span-12 lg:col-span-8">
          <div className="eyebrow flex items-center gap-1.5 text-neutral-500">
            <HeartHandshake size={14} className="text-[#E05A47]" /> Receiver Console & Allocations
          </div>
          <h1 className="font-display text-6xl md:text-7xl leading-[0.9] tracking-tighter mt-3">
            Your <em style={{ fontStyle: "italic" }}>requests</em>, {user?.name?.split(" ")[0]}.
          </h1>
          <p className="mt-4 text-neutral-600 text-sm max-w-xl leading-relaxed">
            Track your active surplus medicine claims and coordinate safe physical handover
            with donor pharmacies and hospitals. All medications are 100% free donations.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-4 flex lg:justify-end">
          <Link
            to="/browse"
            className="btn-primary"
            data-testid="receiver-browse-cta"
          >
            <Search size={16} /> Browse Available Medicines
          </Link>
        </div>
      </div>

      {/* Verification Warning Banner if Not Approved */}
      {!isApproved && (
        <div className="mb-8 p-5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3.5 shadow-sm">
          <ShieldAlert size={22} className="text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-bold text-sm text-amber-950">
              Administrative Credentialing In Progress
            </div>
            <p className="leading-relaxed">
              In accordance with Indian pharmaceutical regulations, your receiver account requires verification by
              NearVita compliance administrators before you can reserve or claim medicines.
            </p>
            <div className="text-[11px] text-amber-800 pt-1">
              Organization: <strong>{user?.organization || "Registered Entity"}</strong> · Credentials submitted for review.
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Stat label="Pending Requests" value={grouped.pending.length} />
        <Stat label="Accepted / Reserved" value={grouped.accepted.length} accent />
        <Stat label="Handover Complete" value={grouped.completed.length} />
        <Stat label="Total Requested" value={claims.length} />
      </div>

      {/* Claims List Header */}
      <div className="border-b border-[hsl(var(--border))] flex items-center justify-between pb-3 mb-6">
        <div className="eyebrow">Active Medicine Claims & Coordination ({claims.length})</div>
        <button onClick={load} className="text-xs text-neutral-500 hover:text-black underline">
          Refresh
        </button>
      </div>

      {/* Claims List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-xs text-neutral-500">Loading your requests…</div>
        ) : claims.length === 0 ? (
          <div
            className="py-16 text-center text-sm text-neutral-500 hairline bg-white rounded-xl space-y-2"
            data-testid="receiver-empty"
          >
            <div>You haven't requested any medicines yet.</div>
            <div>
              <Link to="/browse" className="underline font-semibold text-[#E05A47]">
                Browse unexpired surplus catalogue →
              </Link>
            </div>
          </div>
        ) : (
          claims.map((c) => (
            <RequestRow key={c.id} c={c} role="receiver" onChange={load} />
          ))
        )}
      </div>
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
