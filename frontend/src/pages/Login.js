import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "@/lib/api";
import { ShieldCheck } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetStage, setResetStage] = useState(1); // 1: request, 2: enter token & new password

  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const r = await login(email, password);
    setBusy(false);
    if (r.ok) {
      toast.success(`Welcome back, ${r.user.name.split(" ")[0]}!`);
      const dest =
        r.user.role === "admin"
          ? "/admin"
          : r.user.role === "donor"
          ? "/donor"
          : "/receiver";
      navigate(dest);
    } else {
      toast.error(r.error);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email: forgotEmail });
      setResetStage(2);
      toast.info("Password reset request submitted. Enter the security token to reset.");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post("/auth/reset-password", {
        token: resetToken,
        new_password: newPassword,
      });
      toast.success(res.data.message || "Password updated successfully!");
      setShowForgot(false);
      setResetStage(1);
      setResetToken("");
      setNewPassword("");
      setEmail(forgotEmail);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 grid grid-cols-1 md:grid-cols-12 gap-10"
      data-testid="login-page"
    >
      {/* Left Column: Context & Safety Mission */}
      <div className="md:col-span-6 space-y-6">
        <div>
          <div className="eyebrow flex items-center gap-1.5 text-neutral-500">
            <ShieldCheck size={14} className="text-emerald-700" /> Secure Member Portal
          </div>
          <h1 className="font-display text-6xl md:text-7xl leading-[0.9] tracking-tighter mt-4">
            Sign in to <em style={{ fontStyle: "italic" }}>NearVita</em>.
          </h1>
          <p className="mt-6 text-neutral-600 max-w-md leading-relaxed">
            Welcome to India's non-commercial surplus medicine redistribution network.
            Connecting licensed healthcare donors with credentialed charitable clinics and NGOs.
          </p>
        </div>

        <div className="p-6 hairline bg-white rounded-xl border border-neutral-200 space-y-4 max-w-md">
          <div className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
            Verified Network Standards
          </div>
          <ul className="text-xs text-neutral-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span><strong>100% Free Donations:</strong> Zero resale, no cash transactions, strictly non-profit.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span><strong>Verified Receivers:</strong> Registered NGOs and dispensaries vetted prior to claim access.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span><strong>Drug Safety Rules:</strong> 30+ days minimum shelf life, Schedule H prescription compliance.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Right Column: Credentials Form */}
      <div className="md:col-span-6 max-w-md w-full ml-auto">
        {!showForgot ? (
          <form
            onSubmit={submit}
            className="bg-white hairline p-8 rounded-xl shadow-sm space-y-4"
            data-testid="login-form"
          >
            <div className="eyebrow mb-2">Member Sign In</div>

            <div>
              <label className="block text-xs font-medium mb-1.5 text-neutral-700">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full h-11 px-3 border border-[hsl(var(--border))] bg-white text-sm rounded focus:outline-none focus:border-neutral-900"
                data-testid="login-email-input"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-neutral-700">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-[11px] text-[#E05A47] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 px-3 border border-[hsl(var(--border))] bg-white text-sm rounded focus:outline-none focus:border-neutral-900"
                data-testid="login-password-input"
              />
            </div>

            <button
              disabled={busy}
              className="btn-primary w-full justify-center !py-3 !text-sm mt-4 shadow-sm"
              type="submit"
              data-testid="login-submit-btn"
            >
              {busy ? "Authenticating…" : "Sign In"}
            </button>

            <div className="text-xs text-neutral-500 pt-3 text-center border-t border-neutral-100">
              Don't have an account yet?{" "}
              <Link
                to="/register"
                className="underline text-[#E05A47] font-semibold"
                data-testid="login-to-register"
              >
                Register as Donor or Receiver
              </Link>
            </div>
          </form>
        ) : (
          <div className="bg-white hairline p-8 rounded-xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="eyebrow">Password Recovery</div>
              <button
                type="button"
                onClick={() => {
                  setShowForgot(false);
                  setResetStage(1);
                }}
                className="text-xs text-neutral-500 hover:text-neutral-900 underline"
              >
                Back to Sign in
              </button>
            </div>

            {resetStage === 1 ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-xs text-neutral-600">
                  Enter your registered institutional email to request a secure password reset token.
                </p>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-neutral-700">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full h-11 px-3 border border-[hsl(var(--border))] rounded text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-primary w-full justify-center !py-2.5 !text-xs"
                >
                  {busy ? "Submitting…" : "Request Reset Token"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs text-neutral-600">
                  Enter the password reset token and your new password (minimum 8 characters).
                </p>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-neutral-700">
                    Security Token
                  </label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Paste your reset token"
                    className="w-full h-11 px-3 border border-[hsl(var(--border))] rounded text-sm font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-neutral-700">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full h-11 px-3 border border-[hsl(var(--border))] rounded text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-primary w-full justify-center !py-2.5 !text-xs"
                >
                  {busy ? "Updating…" : "Set New Password"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
