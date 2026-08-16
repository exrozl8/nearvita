import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const r = await login(email, password);
    setBusy(false);
    if (r.ok) {
      toast.success(`Welcome back, ${r.user.name.split(" ")[0]}`);
      navigate(r.user.role === "donor" ? "/donor" : "/receiver");
    } else {
      toast.error(r.error);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 grid grid-cols-1 md:grid-cols-12 gap-10" data-testid="login-page">
      <div className="md:col-span-6">
        <div className="eyebrow">Access</div>
        <h1 className="font-display text-6xl md:text-7xl leading-[0.9] tracking-tighter mt-4">
          Sign in to <em style={{ fontStyle: "italic" }}>continue</em>.
        </h1>
        <p className="mt-6 text-neutral-600 max-w-md">
          One account for donors and receivers. Verified pickups, private
          messaging, and a clear audit trail on every listing.
        </p>
      </div>
      <form
        onSubmit={submit}
        className="md:col-span-6 max-w-md w-full ml-auto bg-white hairline p-8"
        data-testid="login-form"
      >
        <div className="eyebrow mb-6">Log in</div>
        <label className="block text-xs font-medium mb-1.5">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full h-11 px-3 border border-[hsl(var(--border))] bg-white text-sm"
          data-testid="login-email-input"
        />
        <label className="block text-xs font-medium mb-1.5 mt-4">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full h-11 px-3 border border-[hsl(var(--border))] bg-white text-sm"
          data-testid="login-password-input"
        />
        <button
          disabled={busy}
          className="btn-primary w-full justify-center mt-6"
          type="submit"
          data-testid="login-submit-btn"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <div className="text-xs text-neutral-500 mt-4 text-center">
          Don't have an account?{" "}
          <Link to="/register" className="underline" data-testid="login-to-register">
            Join the network
          </Link>
        </div>
      </form>
    </div>
  );
}
