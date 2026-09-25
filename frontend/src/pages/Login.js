import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Sparkles, Building2, HeartHandshake, ShieldCheck } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (userEmail, userPassword) => {
    setBusy(true);
    const r = await login(userEmail, userPassword);
    setBusy(false);
    if (r.ok) {
      toast.success(`Welcome, ${r.user.name.split(" ")[0]}!`);
      const dest =
        r.user.role === "donor"
          ? "/donor"
          : r.user.role === "admin"
          ? "/browse"
          : "/receiver";
      navigate(dest);
    } else {
      toast.error(r.error);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    await handleLogin(email, password);
  };

  const quickDemoLogin = async (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    await handleLogin(demoEmail, demoPass);
  };

  return (
    <div
      className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 grid grid-cols-1 md:grid-cols-12 gap-10"
      data-testid="login-page"
    >
      <div className="md:col-span-6 space-y-6">
        <div>
          <div className="eyebrow">Access Portal</div>
          <h1 className="font-display text-6xl md:text-7xl leading-[0.9] tracking-tighter mt-4">
            Sign in to <em style={{ fontStyle: "italic" }}>continue</em>.
          </h1>
          <p className="mt-6 text-neutral-600 max-w-md">
            One platform for donors and receivers. Verified pickups, secure
            payments, private messaging, and audit trails for medical compliance.
          </p>
        </div>

        {/* Quick Access */}
        <div className="p-5 hairline bg-white rounded-xl border border-neutral-200 space-y-3 max-w-md">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#E05A47]">
            <Sparkles size={14} /> ⚡ 1-Click Fast Sign-In
          </div>
          <p className="text-[11px] text-neutral-500">
            Select a verified account role to sign in instantly:
          </p>

          <div className="space-y-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => quickDemoLogin("donor@nearvita.health", "Donor@1234")}
              className="w-full p-2.5 rounded-lg border border-neutral-200 hover:border-neutral-400 bg-neutral-50 hover:bg-white text-left flex items-center justify-between text-xs transition"
            >
              <div className="flex items-center gap-2">
                <Building2 size={15} className="text-blue-600" />
                <div>
                  <div className="font-semibold text-neutral-900">Apollo Pharmacy Network (Donor)</div>
                  <div className="text-[10px] text-neutral-500">donor@nearvita.health</div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                Login as Donor →
              </span>
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => quickDemoLogin("receiver@nearvita.health", "Receiver@1234")}
              className="w-full p-2.5 rounded-lg border border-neutral-200 hover:border-neutral-400 bg-neutral-50 hover:bg-white text-left flex items-center justify-between text-xs transition"
            >
              <div className="flex items-center gap-2">
                <HeartHandshake size={15} className="text-emerald-600" />
                <div>
                  <div className="font-semibold text-neutral-900">Care India Foundation (Receiver / NGO)</div>
                  <div className="text-[10px] text-neutral-500">receiver@nearvita.health</div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                Login as Receiver →
              </span>
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => quickDemoLogin("admin@nearvita.health", "Admin@1234")}
              className="w-full p-2.5 rounded-lg border border-neutral-200 hover:border-neutral-400 bg-neutral-50 hover:bg-white text-left flex items-center justify-between text-xs transition"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-amber-600" />
                <div>
                  <div className="font-semibold text-neutral-900">NearVita Central Admin</div>
                  <div className="text-[10px] text-neutral-500">admin@nearvita.health</div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                Login as Admin →
              </span>
            </button>
          </div>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="md:col-span-6 max-w-md w-full ml-auto bg-white hairline p-8 rounded-xl"
        data-testid="login-form"
      >
        <div className="eyebrow mb-6">Or Sign in with Credentials</div>
        <label className="block text-xs font-medium mb-1.5">Email address</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your.email@example.com"
          className="w-full h-11 px-3 border border-[hsl(var(--border))] bg-white text-sm rounded"
          data-testid="login-email-input"
        />
        <label className="block text-xs font-medium mb-1.5 mt-4">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full h-11 px-3 border border-[hsl(var(--border))] bg-white text-sm rounded"
          data-testid="login-password-input"
        />
        <button
          disabled={busy}
          className="btn-primary w-full justify-center mt-6"
          type="submit"
          data-testid="login-submit-btn"
        >
          {busy ? "Signing in…" : "Sign in to NearVita"}
        </button>
        <div className="text-xs text-neutral-500 mt-4 text-center">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="underline text-[#E05A47] font-semibold"
            data-testid="login-to-register"
          >
            Join the network
          </Link>
        </div>
      </form>
    </div>
  );
}
