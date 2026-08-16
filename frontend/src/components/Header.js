import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Pill, LogOut, User } from "lucide-react";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const linkCls = ({ isActive }) =>
    `text-sm tracking-wide transition-colors ${
      isActive ? "text-[#0D1117]" : "text-neutral-500 hover:text-[#0D1117]"
    }`;

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-xl bg-[hsl(45,20%,97%)]/75 border-b border-[hsl(var(--border))]"
      data-testid="site-header"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2"
          data-testid="header-logo-link"
        >
          <div className="w-8 h-8 grid place-items-center border border-[#0D1117] rounded-sm">
            <Pill size={16} strokeWidth={2} />
          </div>
          <span className="font-display text-2xl leading-none tracking-tight">
            NearVita
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <NavLink to="/browse" className={linkCls} data-testid="nav-browse">
            Browse
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
              My Requests
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div
                className="hidden md:flex items-center gap-2 pl-3 pr-4 py-1.5 border border-[hsl(var(--border))] rounded-full"
                data-testid="header-user-chip"
              >
                <User size={14} />
                <span className="text-xs font-medium">{user.name}</span>
                <span className="eyebrow !text-[9px]">{user.role}</span>
              </div>
              <button
                onClick={async () => {
                  await logout();
                  navigate("/");
                }}
                className="btn-outline !py-2 !px-4 !text-xs"
                data-testid="header-logout-btn"
              >
                <LogOut size={14} /> Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm text-neutral-600 hover:text-[#0D1117]"
                data-testid="header-login-link"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="btn-primary !py-2 !px-4 !text-xs"
                data-testid="header-register-link"
              >
                Join network
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
