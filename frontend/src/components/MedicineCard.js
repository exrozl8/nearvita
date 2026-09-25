import { Link } from "react-router-dom";
import { CalendarClock, MapPin } from "lucide-react";

function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function MedicineCard({ m, index = 0 }) {
  const days = daysUntil(m.expiry_date);
  const expBadge =
    days === null
      ? null
      : days < 0
      ? { text: "Expired", color: "bg-[#D32F2F]/10 text-[#D32F2F]" }
      : days <= 14
      ? { text: `${days}d left`, color: "bg-[#E05A47]/12 text-[#C94534]" }
      : days <= 45
      ? { text: `${days}d left`, color: "bg-[#F57C00]/12 text-[#B25A00]" }
      : { text: `${days}d left`, color: "bg-[#2E7D32]/10 text-[#2E7D32]" };

  return (
    <Link
      to={`/medicines/${m.id}`}
      className="group block hairline bg-white p-5 hover:sharp-shadow transition-shadow"
      style={{ animation: `fadeUp 0.6s ease both`, animationDelay: `${index * 40}ms` }}
      data-testid={`medicine-card-${m.id}`}
    >
      <div className="aspect-[4/3] overflow-hidden bg-[hsl(var(--secondary))] mb-4 border border-[hsl(var(--border))]">
        {m.image_url ? (
          // eslint-disable-next-line jsx-a11y/img-redundant-alt
          <img
            src={m.image_url}
            alt={m.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full grid place-items-center">
            <div className="font-display text-5xl text-neutral-300">
              {m.name?.[0] || "M"}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow mb-1">{m.category}</div>
          <h3 className="font-display text-2xl leading-none tracking-tight">
            {m.name}
          </h3>
          {m.brand && (
            <div className="text-xs text-neutral-500 mt-1">{m.brand}</div>
          )}
        </div>
        {expBadge && (
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-widest uppercase ${expBadge.color}`}
          >
            {expBadge.text}
          </span>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-neutral-600">
        <div className="flex items-center gap-1.5">
          <MapPin size={12} /> <span>{m.location}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarClock size={12} /> <span>{m.expiry_date}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-mono-alt text-neutral-500">
          Qty · {m.quantity}
        </span>
        {m.donor && (
          <span className="text-neutral-700 truncate max-w-[55%]">
            by {m.donor.organization || m.donor.name}
          </span>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-[hsl(var(--border))] flex items-center justify-between">
        <div>
          {m.is_free || m.price === 0 ? (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Free Donation
            </span>
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-lg text-[#0D1117]">₹{m.price}</span>
              {m.original_price && m.original_price > m.price && (
                <span className="text-[11px] text-neutral-400 line-through">
                  ₹{m.original_price}
                </span>
              )}
            </div>
          )}
        </div>
        <span className="text-xs text-[#E05A47] font-medium group-hover:underline">
          {m.is_free || m.price === 0 ? "Claim Free →" : "Buy / Reserve →"}
        </span>
      </div>
    </Link>
  );
}
