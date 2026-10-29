import { Link } from "react-router-dom";
import { Pill, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="min-h-[70vh] flex items-center justify-center px-6 py-20"
      data-testid="not-found-page"
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto grid place-items-center rounded-2xl bg-neutral-100 border border-neutral-200">
          <Pill size={32} className="text-[#E05A47]" />
        </div>

        <div>
          <div className="eyebrow text-neutral-400">Error 404</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tight mt-2 text-[#0D1117]">
            Page not found.
          </h1>
          <p className="mt-3 text-neutral-600 text-sm leading-relaxed">
            The page you're looking for doesn't exist, has been relocated, or is temporarily unavailable.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link to="/" className="btn-primary w-full sm:w-auto justify-center !py-2.5 !text-xs">
            <Home size={14} /> Back to Home
          </Link>
          <Link to="/browse" className="btn-outline w-full sm:w-auto justify-center !py-2.5 !text-xs">
            <Search size={14} /> Browse Catalogue
          </Link>
        </div>
      </div>
    </div>
  );
}
