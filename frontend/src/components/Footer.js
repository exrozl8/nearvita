import { Link } from "react-router-dom";
import { Pill, ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer
      className="border-t border-[hsl(var(--border))] mt-24 bg-white"
      data-testid="site-footer"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-14 grid grid-cols-1 md:grid-cols-5 gap-10">
        <div className="md:col-span-2 space-y-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 grid place-items-center border border-[#0D1117] rounded-sm bg-white shadow-sm">
              <Pill size={14} className="text-[#E05A47]" />
            </div>
            <span className="font-display text-2xl leading-none tracking-tight">
              NearVita
            </span>
          </Link>
          <p className="text-sm text-neutral-600 max-w-sm leading-relaxed">
            A verified redistribution network for unexpired surplus medicines.
            Zero resale, no cash. Connecting licensed donors with credentialed NGOs and charitable clinics.
          </p>
          <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 w-fit">
            <ShieldCheck size={14} />
            <span>100% Non-Commercial Medicine Redistribution</span>
          </div>
        </div>

        <div>
          <div className="eyebrow mb-3">Platform</div>
          <ul className="space-y-2.5 text-xs text-neutral-600 font-medium">
            <li>
              <Link to="/browse" className="hover:text-[#0D1117] hover:underline transition">
                Browse Catalogue
              </Link>
            </li>
            <li>
              <Link to="/mission" className="hover:text-[#0D1117] hover:underline transition">
                Mission & Manifesto
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-[#0D1117] hover:underline transition">
                Register as Donor
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-[#0D1117] hover:underline transition">
                Register as Receiver (NGO / Clinic)
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="eyebrow mb-3">Legal & Safety</div>
          <ul className="space-y-2.5 text-xs text-neutral-600 font-medium">
            <li>
              <Link to="/terms" className="hover:text-[#0D1117] hover:underline transition" data-testid="footer-link-terms">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:text-[#0D1117] hover:underline transition" data-testid="footer-link-privacy">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/disclaimer" className="hover:text-[#0D1117] hover:underline transition" data-testid="footer-link-disclaimer">
                Medical Disclaimer (Drugs Act)
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="eyebrow mb-3">Network Contact</div>
          <ul className="space-y-2 text-xs text-neutral-600">
            <li>
              <a href="mailto:hello@nearvita.health" className="hover:text-[#0D1117] underline">
                hello@nearvita.health
              </a>
            </li>
            <li>Bengaluru · Karnataka · India</li>
            <li className="pt-2 text-[11px] text-neutral-400">
              Compliant with Drugs & Cosmetics Act, 1940
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[hsl(var(--border))] bg-neutral-50/50">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <div>
            © {new Date().getFullYear()} NearVita Network · Every dose counts.
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <Link to="/terms" className="hover:underline">Terms</Link>
            <Link to="/privacy" className="hover:underline">Privacy</Link>
            <Link to="/disclaimer" className="hover:underline">Medical Notice</Link>
            <span className="font-mono-alt tracking-wider text-neutral-400">v2.5.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
