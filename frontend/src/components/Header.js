import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Pill, LogOut, User, Server } from "lucide-react";
import BackendExplorerModal from "@/components/BackendExplorerModal";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showExplorer, setShowExplorer] = useState(false);

  const linkCls = ({ isActive }) =>
    `text-sm tracking-wide transition-colors ${
      isActive ? "text-[#0D1117] font-semibold" : "text-neutral-500 hover:text-[#0D1117]"
    }`;

  return (
    <>
      <header
        className="sticky top-0 z-40 backdrop-blur-xl bg-[hsl(45,20%,97%)]/85 border-b border-[hsl(var(--border))]"
        data-testid="site-header"
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2"
            data-testid="header-logo-link"
          >
            <div className="w-8 h-8 grid place-items-center border border-[#0D1117] rounded-sm bg-white shadow-sm">
              <Pill size={16} strokeWidth={2} className="text-[#E05A47]" />
            </div>
            <span className="font-display text-2xl leading-none tracking-tight">
              NearVita
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <NavLink to="/browse" className={linkCls} data-testid="nav-browse">
              Catalogue
            </NavLink>
            <NavLink to="/mission" className={linkCls} data-testid="nav-mission">
              Mission
            </NavLink>
            {user && user.role === "donor" && (
              <NavLink to="/donor" className={linkCls} data-testid="nav-donor-dashboard">
                Donor Console
              </NavLink>
            )}
            {user && user.role === "receiver" && (
              <NavLink
                to="/receiver"
                className={linkCls}
                data-testid="nav-receiver-dashboard"
              >
                Receiver Console
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowExplorer(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-medium transition shadow-sm"
              title="Click to view Live Backend Architecture, Database Collections & API Playground"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Server size={13} />
              <span className="hidden sm:inline font-mono">Backend Live</span>
            </button>

            {user ? (
              <>
                <div
                  className="hidden md:flex items-center gap-2 pl-3 pr-4 py-1.5 border border-[hsl(var(--border))] rounded-full bg-white text-xs"
                  data-testid="header-user-chip"
                >
                  <User size={13} className="text-neutral-500" />
                  <span className="font-medium">{user.name.split(" ")[0]}</span>
                  <span className="eyebrow !text-[9px] uppercase px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={async () => {
                    await logout();
                    navigate("/");
                  }}
                  className="btn-outline !py-1.5 !px-3 !text-xs"
                  data-testid="header-logout-btn"
                >
                  <LogOut size={13} /> Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-xs font-semibold text-neutral-700 hover:text-[#0D1117] px-2 py-1"
                  data-testid="header-login-link"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="btn-primary !py-1.5 !px-3 !text-xs"
                  data-testid="header-register-link"
                >
                  Join network
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Backend Explorer Modal */}
      {showExplorer && (
        <BackendExplorerModal onClose={() => setShowExplorer(false)} />
      )}
    </>
  );
}
