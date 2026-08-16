import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Send, ChevronLeft } from "lucide-react";

export default function ClaimThread() {
  const { id } = useParams();
  const { user } = useAuth();
  const [claim, setClaim] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const endRef = useRef(null);

  const load = async () => {
    const [a, b] = await Promise.all([
      api.get(`/claims?role=${user.role === "donor" ? "donor" : "receiver"}`),
      api.get(`/claims/${id}/messages`),
    ]);
    const c = a.data.find((x) => x.id === id);
    setClaim(c);
    setMessages(b.data);
  };

  useEffect(() => {
    if (user) load();
    const t = setInterval(() => user && load(), 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line
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

  if (!claim) return <div className="p-20 text-center text-neutral-500">Loading thread…</div>;

  return (
    <div className="max-w-[1000px] mx-auto px-6 md:px-10 py-10" data-testid="claim-thread-page">
      <Link to={user.role === "donor" ? "/donor" : "/receiver"} className="text-xs text-neutral-500 inline-flex items-center gap-1" data-testid="thread-back">
        <ChevronLeft size={14} /> Back
      </Link>
      <div className="mt-4 grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-8">
          <div className="hairline bg-white p-4 h-[520px] flex flex-col" data-testid="thread-messages-container">
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {messages.length === 0 && (
                <div className="text-xs text-neutral-500 text-center py-10">
                  No messages yet. Say hi and coordinate the handover.
                </div>
              )}
              {messages.map((m) => {
                const mine = m.sender_id === user.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-3 py-2 text-sm ${mine ? "bg-[#0D1117] text-white" : "bg-[hsl(var(--secondary))]"}`}>
                      <div className="text-[10px] opacity-60 mb-1">{m.sender_name}</div>
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
                placeholder="Type your message…"
                className="flex-1 h-10 px-3 border border-[hsl(var(--border))] text-sm"
                data-testid="thread-input"
              />
              <button className="btn-primary !py-2 !px-4" data-testid="thread-send-btn"><Send size={14} /></button>
            </form>
          </div>
        </div>
        <div className="col-span-12 md:col-span-4">
          <div className="hairline bg-white p-5">
            <div className="eyebrow">Item</div>
            <div className="font-display text-2xl mt-1">{claim.medicine?.name}</div>
            <div className="text-xs text-neutral-600 mt-1">{claim.medicine?.category} · Qty {claim.quantity_requested}</div>
            <div className="text-xs text-neutral-500 mt-3">Expires {claim.medicine?.expiry_date}</div>
            <div className="text-xs text-neutral-500">Pickup {claim.medicine?.location}</div>
            <div className="mt-4 eyebrow">Status</div>
            <div className="font-display text-2xl mt-1 capitalize">{claim.status}</div>
          </div>
          <div className="hairline bg-white p-5 mt-3">
            <div className="eyebrow">{user.role === "donor" ? "Receiver" : "Donor"}</div>
            <div className="font-display text-xl mt-1">
              {user.role === "donor"
                ? claim.receiver?.organization || claim.receiver?.name
                : claim.donor?.organization || claim.donor?.name}
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              {user.role === "donor" ? claim.receiver?.location : claim.donor?.location}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
