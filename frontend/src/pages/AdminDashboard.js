import { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";
import {
  ShieldCheck,
  Search,
  Check,
  Ban,
} from "lucide-react";

export default function AdminDashboard() {
  const [receivers, setReceivers] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | pending | approved
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recRes, ovRes] = await Promise.all([
        api.get("/admin/receivers"),
        api.get("/admin/overview").catch(() => ({ data: null })),
      ]);
      setReceivers(recRes.data || []);
      setOverview(ovRes.data);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (receiverId, isApproved) => {
    setBusyId(receiverId);
    try {
      await api.patch(`/admin/receivers/${receiverId}/status`, {
        is_approved: isApproved,
      });
      toast.success(
        isApproved
          ? "Receiver approved! They can now claim medicines."
          : "Receiver approval revoked."
      );
      loadData();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setBusyId(null);
    }
  };

  const filteredReceivers = receivers.filter((r) => {
    if (filter === "pending" && r.is_approved) return false;
    if (filter === "approved" && !r.is_approved) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = r.name?.toLowerCase().includes(q);
      const matchOrg = r.organization?.toLowerCase().includes(q);
      const matchEmail = r.email?.toLowerCase().includes(q);
      const matchLoc = r.location?.toLowerCase().includes(q);
      return matchName || matchOrg || matchEmail || matchLoc;
    }
    return true;
  });

  const pendingCount = receivers.filter((r) => !r.is_approved).length;
  const approvedCount = receivers.filter((r) => r.is_approved).length;

  return (
    <div
      className="max-w-[1400px] mx-auto px-6 md:px-10 py-12"
      data-testid="admin-dashboard-page"
    >
      {/* Page Header */}
      <div className="grid grid-cols-12 gap-6 items-end mb-10">
        <div className="col-span-12 lg:col-span-8">
          <div className="eyebrow flex items-center gap-1.5 text-amber-700">
            <ShieldCheck size={14} /> Governance & Credentialing Console
          </div>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tighter mt-3">
            Receiver <em style={{ fontStyle: "italic" }}>Verification</em>.
          </h1>
          <p className="mt-4 text-neutral-600 text-sm max-w-2xl leading-relaxed">
            NearVita operates on a verified-receiver trust model. Under Indian drug redistribution guidelines,
            only credentialed NGOs, charitable dispensaries, and verified clinics may claim donated medicines.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-4 flex lg:justify-end">
          <button
            onClick={loadData}
            className="btn-outline !py-2 !px-4 !text-xs"
          >
            Refresh Records
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="hairline p-5 bg-white rounded-lg">
          <div className="eyebrow">Pending Approval</div>
          <div className="font-display text-5xl mt-2 leading-none text-amber-600">
            {String(pendingCount).padStart(2, "0")}
          </div>
          <div className="text-[11px] text-neutral-500 mt-2">
            Awaiting credential verification
          </div>
        </div>

        <div className="hairline p-5 bg-white rounded-lg">
          <div className="eyebrow">Approved Receivers</div>
          <div className="font-display text-5xl mt-2 leading-none text-emerald-700">
            {String(approvedCount).padStart(2, "0")}
          </div>
          <div className="text-[11px] text-neutral-500 mt-2">
            Active verified healthcare partners
          </div>
        </div>

        <div className="hairline p-5 bg-white rounded-lg">
          <div className="eyebrow">Registered Donors</div>
          <div className="font-display text-5xl mt-2 leading-none text-neutral-900">
            {String(overview?.total_donors || 0).padStart(2, "0")}
          </div>
          <div className="text-[11px] text-neutral-500 mt-2">
            Pharmacies, hospitals & donors
          </div>
        </div>

        <div className="hairline p-5 bg-white rounded-lg">
          <div className="eyebrow">Available Stock</div>
          <div className="font-display text-5xl mt-2 leading-none text-neutral-900">
            {String(overview?.available_medicines || 0).padStart(2, "0")}
          </div>
          <div className="text-[11px] text-neutral-500 mt-2">
            Unexpired donated medicines
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="hairline bg-white p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-neutral-500">Filter:</span>
          {[
            { id: "all", label: `All (${receivers.length})` },
            { id: "pending", label: `Pending Approval (${pendingCount})` },
            { id: "approved", label: `Verified (${approvedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                filter === tab.id
                  ? "bg-[#0D1117] text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, org, or city…"
            className="w-full h-9 pl-9 pr-3 border border-[hsl(var(--border))] rounded-md text-xs bg-white"
          />
        </div>
      </div>

      {/* Receivers List */}
      {loading ? (
        <div className="p-20 text-center text-xs text-neutral-500">Loading receiver profiles…</div>
      ) : filteredReceivers.length === 0 ? (
        <div className="hairline bg-white p-16 text-center rounded-xl space-y-2">
          <div className="font-display text-2xl text-neutral-800">No receivers found</div>
          <p className="text-xs text-neutral-500">
            {filter === "pending"
              ? "All registered receivers are currently approved!"
              : "No receiver accounts match the selected search query."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReceivers.map((rec) => {
            const isApproved = rec.is_approved;
            const isBusy = busyId === rec.id;
            return (
              <div
                key={rec.id}
                className="hairline bg-white p-6 rounded-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
                data-testid={`admin-receiver-card-${rec.id}`}
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isApproved
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      {isApproved ? "✓ Verified Receiver" : "⏳ Pending Approval"}
                    </span>
                    <span className="text-xs text-neutral-400">·</span>
                    <span className="text-xs text-neutral-500">
                      Joined {new Date(rec.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-2xl text-[#0D1117] leading-tight">
                      {rec.name}
                    </h3>
                    <div className="text-sm font-semibold text-neutral-700 mt-0.5">
                      {rec.organization || "Independent Healthcare Volunteer"}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-neutral-600 pt-1">
                    <div>
                      <span className="text-neutral-400">Email:</span> {rec.email}
                    </div>
                    <div>
                      <span className="text-neutral-400">Location:</span> {rec.location || "Not specified"}
                    </div>
                    <div>
                      <span className="text-neutral-400">Phone:</span> {rec.phone || "Not specified"}
                    </div>
                  </div>

                  {rec.verification_details && (
                    <div className="mt-2 p-2.5 bg-neutral-50 rounded border border-neutral-200 text-xs text-neutral-700">
                      <strong className="text-neutral-900">Submitted Credentials:</strong>{" "}
                      {rec.verification_details}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-4 lg:pt-0">
                  {!isApproved ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleUpdateStatus(rec.id, true)}
                      className="btn-primary !py-2 !px-5 !text-xs !bg-emerald-700 hover:!bg-emerald-800 gap-1.5"
                      data-testid={`admin-approve-btn-${rec.id}`}
                    >
                      <Check size={14} />
                      {isBusy ? "Approving…" : "Approve Receiver"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleUpdateStatus(rec.id, false)}
                      className="btn-outline !py-2 !px-4 !text-xs !text-red-700 !border-red-300 hover:!bg-red-50 gap-1.5"
                      data-testid={`admin-revoke-btn-${rec.id}`}
                    >
                      <Ban size={14} />
                      {isBusy ? "Updating…" : "Revoke Approval"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
