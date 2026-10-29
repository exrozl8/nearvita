import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { ArrowUpRight, ShieldCheck, TimerReset, HeartHandshake } from "lucide-react";
import MedicineCard from "@/components/MedicineCard";

const HERO_IMG =
  "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80";

export default function Landing() {
  const [stats, setStats] = useState({ available_medicines: 0, donors: 0, receivers: 0, delivered: 0 });
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    api.get("/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/medicines?status=available").then((r) => setFeed(r.data.slice(0, 3))).catch(() => {});
  }, []);

  return (
    <div data-testid="landing-page">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 pt-12 md:pt-20 pb-12 grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-7 relative">
            <div className="flex items-center gap-3 mb-8 fade-up">
              <span className="chip" data-testid="hero-tagline-chip">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E05A47]" /> NearVita Network Live
              </span>
              <span className="eyebrow">Zero Resale · 100% Free Surplus Medicine Donation</span>
            </div>
            <h1
              className="font-display text-[15vw] sm:text-[10vw] lg:text-[7.2vw] leading-[0.9] tracking-tighter fade-up delay-1"
              data-testid="hero-headline"
            >
              Every&nbsp;dose <br />
              deserves a <em className="italic text-[#E05A47] not-italic-heavy" style={{ fontStyle: "italic" }}>
                second life.
              </em>
            </h1>
            <p className="mt-8 max-w-xl text-lg text-neutral-700 fade-up delay-2 leading-relaxed">
              NearVita connects pharmacies, hospitals, and licensed donors to community clinics,
              NGOs, and charitable healthcare facilities. Facilitating 100% free surplus medicine
              donations with auditable chains of custody and verified receiver credentials.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4 fade-up delay-3">
              <Link to="/browse" className="btn-primary" data-testid="hero-cta-browse">
                Browse unexpired catalogue <ArrowUpRight size={16} />
              </Link>
              <Link to="/register" className="btn-outline" data-testid="hero-cta-donate">
                Register as Donor
              </Link>
            </div>
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 fade-up delay-4">
              {[
                ["Available stock", stats.available_medicines],
                ["Donors", stats.donors],
                ["Verified receivers", stats.receivers],
                ["Doses delivered", stats.delivered],
              ].map(([label, val]) => (
                <div key={label} className="border-t border-[hsl(var(--border))] pt-3">
                  <div className="font-display text-4xl md:text-5xl leading-none">
                    {String(val).padStart(2, "0")}
                  </div>
                  <div className="eyebrow mt-2">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5 relative">
            <div className="relative aspect-[4/5] overflow-hidden hairline sharp-shadow rounded-xl">
              <img
                src={HERO_IMG}
                alt="Modern medical facility"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md p-5 border-t border-[hsl(var(--border))]">
                <div className="eyebrow">Public Health Challenge · India</div>
                <div className="font-display text-3xl leading-tight mt-1">
                  ₹ 1.2Cr of medicine wasted every hour.
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  Pharma Waste Advisory Report · Zero-resale redistribution prevents destruction.
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 hidden lg:block bg-[#0D1117] text-white p-5 max-w-[240px] rounded-lg shadow-xl">
              <div className="eyebrow !text-white/60">Verified NGO Clinic</div>
              <div className="font-display text-xl mt-1">
                "Essential maintenance therapy redirected to forty patients this month."
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <section className="border-t border-[hsl(var(--border))] bg-white">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <TimerReset size={22} className="text-[#E05A47]" />,
              title: "30+ Day Shelf Life Rule",
              body:
                "Strict minimum 30-day window required before expiry. Past-date drugs are rejected, ensuring safety before handover.",
            },
            {
              icon: <ShieldCheck size={22} className="text-emerald-700" />,
              title: "Verified Healthcare Receivers",
              body:
                "NGOs and charitable clinics are administratively credentialed. Prescription-grade items require medical practitioner certification.",
            },
            {
              icon: <HeartHandshake size={22} className="text-blue-700" />,
              title: "Zero Resale, No Cash",
              body:
                "Every milligram of medicine on NearVita is a 100% free donation. No commerce, retail markups, or payment fees.",
            },
          ].map((col) => (
            <div key={col.title} className="p-6 hairline rounded-xl bg-[hsl(var(--secondary))]/30 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-white hairline grid place-items-center shadow-sm">
                {col.icon}
              </div>
              <h3 className="font-display text-2xl">{col.title}</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">{col.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED / LATEST FEED */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="eyebrow">Recent Surplus Donations</div>
            <h2 className="font-display text-4xl md:text-5xl mt-2 tracking-tight">
              Ready for immediate allocation.
            </h2>
          </div>
          <Link to="/browse" className="text-xs font-semibold text-[#E05A47] hover:underline flex items-center gap-1">
            View full catalogue ({stats.available_medicines}) <ArrowUpRight size={14} />
          </Link>
        </div>

        {feed.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {feed.map((m, i) => (
              <MedicineCard key={m.id} m={m} index={i} />
            ))}
          </div>
        ) : (
          <div className="p-16 text-center hairline bg-white rounded-xl text-neutral-500 text-sm">
            Current surplus batch in active distribution. Check back shortly or browse the catalogue.
          </div>
        )}
      </section>
    </div>
  );
}
