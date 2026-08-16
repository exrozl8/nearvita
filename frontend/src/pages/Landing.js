import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { ArrowUpRight, ShieldCheck, TimerReset, HeartHandshake } from "lucide-react";
import MedicineCard from "@/components/MedicineCard";

const HERO_IMG =
  "https://images.unsplash.com/photo-1770775776141-6b3ac7ef9dd3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NjZ8MHwxfHNlYXJjaHwxfHxjbGVhbiUyMG1vZGVybiUyMG1lZGljYWwlMjBidWlsZGluZ3xlbnwwfHx8fDE3ODYzODU5MDJ8MA&ixlib=rb-4.1.0&q=85";
const MED_MACRO =
  "https://images.unsplash.com/photo-1549477752-31cd7327aed0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODR8MHwxfHNlYXJjaHwzfHxtZWRpY2luZSUyMHBpbGxzJTIwY2xvc2UlMjB1cCUyMG1hY3JvfGVufDB8fHx8MTc4NjM4NTg4M3ww&ixlib=rb-4.1.0&q=85";
const SORT_IMG =
  "https://images.unsplash.com/photo-1580281657527-47f249e8f4df?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzB8MHwxfHNlYXJjaHwxfHxwaGFybWFjaXN0JTIwc29ydGluZyUyMGJveGVzfGVufDB8fHx8MTc4NjM4NTg4Mnww&ixlib=rb-4.1.0&q=85";

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
                <span className="w-1.5 h-1.5 rounded-full bg-[#E05A47]" /> Issue 001 · Feb 2026
              </span>
              <span className="eyebrow">A humanitarian pharma network</span>
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
            <p className="mt-8 max-w-xl text-lg text-neutral-700 fade-up delay-2">
              NearVita is a curated donor network that redirects unopened,
              near-expiry medicines from hospitals, pharmacies and households
              to verified NGOs and patients — before they turn into medical
              waste.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4 fade-up delay-3">
              <Link to="/register" className="btn-primary" data-testid="hero-cta-donate">
                Donate a medicine <ArrowUpRight size={16} />
              </Link>
              <Link to="/browse" className="btn-outline" data-testid="hero-cta-browse">
                Browse near-expiry stock
              </Link>
            </div>
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 fade-up delay-4">
              {[
                ["Available meds", stats.available_medicines],
                ["Donors", stats.donors],
                ["Receivers", stats.receivers],
                ["Delivered", stats.delivered],
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
            <div className="relative aspect-[4/5] overflow-hidden hairline sharp-shadow">
              <img
                src={HERO_IMG}
                alt="Modern medical interior"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-white/85 backdrop-blur-md p-5 border-t border-[hsl(var(--border))]">
                <div className="eyebrow">Live counter · India</div>
                <div className="font-display text-3xl leading-tight mt-1">
                  ₹ 1.2Cr of medicine wasted every hour.
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  Source: Pharma Waste Advisory 2025
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 hidden lg:block bg-[#0D1117] text-white p-5 max-w-[240px]">
              <div className="eyebrow !text-white/60">Verified NGO</div>
              <div className="font-display text-xl mt-1">
                "Three patients treated this week from a single donor listing."
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <section className="border-t border-[hsl(var(--border))]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 grid grid-cols-1 md:grid-cols-3">
          {[
            {
              icon: <TimerReset size={22} />,
              title: "Race against expiry",
              body:
                "Listings surface urgency by days-left, so critical stock reaches receivers before it's condemned.",
            },
            {
              icon: <ShieldCheck size={22} />,
              title: "Verified, not viral",
              body:
                "Donors and receivers are reviewed. Prescription-only items require credentialed pickup.",
            },
            {
              icon: <HeartHandshake size={22} />,
              title: "Direct handoff",
              body:
                "A private thread between donor and receiver — no marketplaces, no middlemen, no resale.",
            },
          ].map((p, i) => (
            <div
              key={p.title}
              className={`p-10 ${i !== 0 ? "md:border-l border-[hsl(var(--border))]" : ""}`}
            >
              <div className="w-10 h-10 border border-[#0D1117] grid place-items-center rounded-sm">
                {p.icon}
              </div>
              <h3 className="font-display text-3xl mt-6 tracking-tight">{p.title}</h3>
              <p className="mt-3 text-sm text-neutral-600 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS - EDITORIAL */}
      <section className="border-t border-[hsl(var(--border))]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-4">
            <div className="eyebrow">Field Notes</div>
            <h2 className="font-display text-5xl mt-4 tracking-tight">
              How a donation moves.
            </h2>
            <p className="text-neutral-600 mt-4 text-sm max-w-sm">
              Three touchpoints between the shelf and the patient. Auditable at
              every step.
            </p>
          </div>
          <ol className="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              ["01", "List", "Donor snaps a photo, sets expiry & pickup city. Under 60 seconds."],
              ["02", "Match", "Receivers search & request. Donor accepts in one tap; a private thread opens."],
              ["03", "Deliver", "Handoff happens in-person or via courier. Marked delivered, chain closed."],
            ].map(([n, t, d]) => (
              <li key={n} className="p-6 bg-white hairline">
                <div className="font-mono-alt text-xs text-neutral-500">{n}</div>
                <h4 className="font-display text-3xl mt-3">{t}</h4>
                <p className="mt-3 text-sm text-neutral-600">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* IMAGE SPLIT */}
      <section className="border-t border-[hsl(var(--border))] bg-[#0D1117] text-white">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 grid grid-cols-12 gap-8 items-center">
          <div className="col-span-12 md:col-span-5">
            <img src={MED_MACRO} alt="Pills macro" className="w-full aspect-square object-cover" />
          </div>
          <div className="col-span-12 md:col-span-7 md:pl-10">
            <div className="eyebrow !text-white/60">A quiet epidemic</div>
            <h2 className="font-display text-4xl md:text-6xl leading-[0.95] mt-4">
              An estimated <span className="text-[#E05A47]">₹15,000&nbsp;crore</span> of medicine
              is destroyed in India every year — while 1 in 5 patients skip
              doses due to cost.
            </h2>
            <p className="mt-6 text-white/70 max-w-2xl">
              NearVita treats near-expiry inventory as a supply, not a
              liability. Donors get a compliant off-ramp. Receivers get a
              lifeline.
            </p>
            <div className="mt-8 flex gap-4">
              <Link to="/register" className="btn-primary !bg-white !text-[#0D1117]" data-testid="dark-cta-join">
                Join the network
              </Link>
              <Link to="/mission" className="btn-outline !border-white/50 !text-white" data-testid="dark-cta-mission">
                Read the manifesto
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE FEED */}
      {feed.length > 0 && (
        <section className="border-t border-[hsl(var(--border))]">
          <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-20">
            <div className="flex items-end justify-between mb-10">
              <div>
                <div className="eyebrow">On the ledger</div>
                <h2 className="font-display text-5xl mt-3 tracking-tight">
                  Recently listed.
                </h2>
              </div>
              <Link to="/browse" className="text-sm underline underline-offset-4" data-testid="feed-view-all">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {feed.map((m, i) => (
                <MedicineCard key={m.id} m={m} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="border-t border-[hsl(var(--border))]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-8">
            <div className="eyebrow">Take a first step</div>
            <h2 className="font-display text-6xl md:text-7xl leading-[0.95] mt-4 tracking-tighter">
              If it's on your shelf,
              <br />
              it could save a life.
            </h2>
          </div>
          <div className="col-span-12 md:col-span-4 flex md:items-end">
            <div className="w-full">
              <img src={SORT_IMG} alt="Pharmacist sorting" className="w-full aspect-[4/3] object-cover hairline" />
              <Link to="/register" className="btn-primary mt-6" data-testid="footer-cta-register">
                Start donating <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
