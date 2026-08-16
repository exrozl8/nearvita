import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { Link } from "react-router-dom";
import { RequestRow } from "./DonorDashboard";
import { Search } from "lucide-react";

export default function ReceiverDashboard() {
  const { user } = useAuth();
  const [claims, setClaims] = useState([]);
  const load = async () => {
    const { data } = await api.get("/claims?role=receiver");
    setClaims(data);
  };
  useEffect(() => { load(); }, []);

  const grouped = {
    pending: claims.filter((c) => c.status === "pending"),
    accepted: claims.filter((c) => c.status === "accepted"),
    completed: claims.filter((c) => c.status === "completed"),
    rejected: claims.filter((c) => c.status === "rejected"),
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-12" data-testid="receiver-dashboard">
      <div className="grid grid-cols-12 gap-6 items-end mb-10">
        <div className="col-span-12 lg:col-span-8">
          <div className="eyebrow">Receiver console</div>
          <h1 className="font-display text-6xl md:text-7xl leading-[0.9] tracking-tighter mt-3">
            Your <em style={{ fontStyle: "italic" }}>requests</em>, {user?.name?.split(" ")[0]}.
          </h1>
          <p className="mt-4 text-neutral-600 text-sm max-w-xl">
            Track your active claims, accepted handovers, and completed
            deliveries. Open a thread to coordinate pickup with the donor.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-4 flex lg:justify-end">
          <Link to="/browse" className="btn-primary" data-testid="receiver-browse-cta">
            <Search size={16} /> Find medicines
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Stat label="Pending" value={grouped.pending.length} />
        <Stat label="Accepted" value={grouped.accepted.length} accent />
        <Stat label="Delivered" value={grouped.completed.length} />
        <Stat label="Rejected" value={grouped.rejected.length} />
      </div>

      <div className="space-y-3">
        {claims.length === 0 ? (
          <div className="py-16 text-center text-sm text-neutral-500 hairline bg-white" data-testid="receiver-empty">
            You haven't requested any medicines yet.{" "}
            <Link to="/browse" className="underline">Browse the catalogue →</Link>
          </div>
        ) : (
          claims.map((c) => <RequestRow key={c.id} c={c} role="receiver" onChange={load} />)
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className={`hairline p-5 ${accent ? "bg-[#0D1117] text-white border-[#0D1117]" : "bg-white"}`}>
      <div className={`eyebrow ${accent ? "!text-white/70" : ""}`}>{label}</div>
      <div className="font-display text-5xl mt-2 leading-none">{String(value).padStart(2, "0")}</div>
    </div>
  );
}
