import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Send, ChevronLeft, ShieldCheck, Clock, User, CheckCircle2 } from "lucide-react";

export default function ClaimThread() {
  const { id } = useParams();
  const { user } = useAuth();
  const [claim, setClaim] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorNotice, setErrorNotice] = useState(null);
  const endRef = useRef(null);

  const load = async () => {
    try {
      const [claimsRes, msgRes] = await Promise.all([
        api.get("/claims").catch(() => ({ data: [] })),
        api.get(`/claims/${id}/messages`).catch(() => ({ data: [] })),
      ]);
      const found = claimsRes.data.find((x) => x.id === id);
      if (found) {
        setClaim(found);
      }
      setMessages(msgRes.data || []);
      setErrorNotice(null);
    } catch (err) {
      console.warn("Claim load warning:", err);
      setErrorNotice("Unable to load full thread details. Refreshing…");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
    const t = setInterval(() => {
      if (user) load();
    }, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await api.post(`/claims/${id}/messages`, { text });
      setText("");
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  if (loading && !claim) {
    return <div className="p-20 text-center text-neutral-500 font-mono text-xs">Loading thread…</div>;
  }

  if (!claim) {
    return (
      <div className="max-w-[700px] mx-auto px-6 py-16 text-center space-y-4">
        <div className="font-display text-2xl text-neutral-800">Coordination Thread</div>
        <p className="text-xs text-neutral-500">
          This thread is either complete or belongs to a different account session.
        </p>
        <Link to={user?.role === "donor" ? "/donor" : "/receiver"} className="btn-primary !py-2 !px-4 !text-xs inline-flex">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto px-6 md:px-10 py-10" data-testid="claim-thread-page">
      <Link
        to={user?.role === "donor" ? "/donor" : "/receiver"}
        className="text-xs text-neutral-500 inline-flex items-center gap-1 hover:text-[#0D1117] transition"
        data-testid="thread-back"
      >
        <ChevronLeft size={14} /> Back to console
      </Link>

      {errorNotice && (
        <div className="mt-3 p-3 rounded bg-amber-50 text-amber-800 text-xs border border-amber-200">
          {errorNotice}
        </div>
      )}

      <div className="mt-4 grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-8">
          <div className="hairline bg-white p-4 h-[520px] flex flex-col rounded-xl" data-testid="thread-messages-container">
            
            {/* Header info inside chat */}
            <div className="pb-3 mb-3 border-b border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
              <span className="flex items-center gap-1">
                <ShieldCheck size={14} className="text-emerald-600" />
                Verified Handover Channel
              </span>
              <span className="font-mono text-[11px]">
                {claim.transaction_id || `Claim #${claim.id.slice(-6)}`}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {messages.length === 0 && (
                <div className="text-xs text-neutral-400 text-center py-12">
                  No messages yet. Say hello and coordinate pickup details.
                </div>
              )}
              {messages.map((m) => {
                const mine = m.sender_id === user?.id;
                const isSystem = m.sender_id === "system";
                return (
                  <div
                    key={m.id}
                    className={`flex ${
                      isSystem ? "justify-center" : mine ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] px-3.5 py-2.5 rounded-lg text-xs leading-relaxed ${
                        isSystem
                          ? "bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono text-center w-full"
                          : mine
                          ? "bg-[#0D1117] text-white rounded-br-none"
                          : "bg-neutral-100 text-neutral-800 rounded-bl-none"
                      }`}
                    >
                      {!isSystem && (
                        <div className="text-[10px] opacity-60 mb-1 font-semibold">
                          {m.sender_name || (mine ? "You" : "Partner")}
                        </div>
                      )}
                      {m.text}
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <form onSubmit={send} className="mt-3 flex gap-2 pt-3 border-t border-[hsl(var(--border))]">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type coordination message (pickup time, cold-chain courier, etc.)…"
                className="flex-1 h-10 px-3 border border-[hsl(var(--border))] text-xs rounded"
                data-testid="thread-input"
              />
              <button type="submit" className="btn-primary !py-2 !px-4" data-testid="thread-send-btn">
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>

        {/* Right Info Sidebar */}
        <div className="col-span-12 md:col-span-4 space-y-4">
          <div className="hairline bg-white p-5 rounded-xl">
            <div className="eyebrow">Medicine Allocation</div>
            <div className="font-display text-2xl mt-1">{claim.medicine?.name}</div>
            <div className="text-xs text-neutral-600 mt-1">
              {claim.medicine?.category} · Qty {claim.quantity_requested} units
            </div>
            
            <div className="mt-3 pt-3 border-t border-neutral-100 text-xs text-neutral-500 space-y-1">
              <div>Expires: <strong>{claim.medicine?.expiry_date}</strong></div>
              <div>Location: <strong>{claim.medicine?.location}</strong></div>
            </div>

            <div className="mt-4 eyebrow">Handover Status</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-display text-2xl capitalize text-[#0D1117]">
                {claim.status}
              </span>
              {claim.amount_paid && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Paid ₹{claim.amount_paid}
                </span>
              )}
            </div>
          </div>

          <div className="hairline bg-white p-5 rounded-xl">
            <div className="eyebrow">{user?.role === "donor" ? "Recipient Clinic / NGO" : "Donor Entity"}</div>
            <div className="font-display text-xl mt-1">
              {user?.role === "donor"
                ? claim.receiver?.organization || claim.receiver?.name
                : claim.donor?.organization || claim.donor?.name}
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              {user?.role === "donor" ? claim.receiver?.location : claim.donor?.location}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
