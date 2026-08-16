import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function Register() {
  const [form, setForm] = useState({
    role: "donor",
    email: "",
    password: "",
    name: "",
    organization: "",
    location: "",
    phone: "",
  });
  const [busy, setBusy] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const r = await register(form);
    setBusy(false);
    if (r.ok) {
      toast.success(`Welcome to NearVita, ${r.user.name.split(" ")[0]}`);
      navigate(r.user.role === "donor" ? "/donor" : "/receiver");
    } else {
      toast.error(r.error);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 grid grid-cols-1 md:grid-cols-12 gap-10" data-testid="register-page">
      <div className="md:col-span-5">
        <div className="eyebrow">Join · Issue 001</div>
        <h1 className="font-display text-6xl md:text-7xl leading-[0.9] tracking-tighter mt-4">
          Two roles. <em style={{ fontStyle: "italic" }}>One mission.</em>
        </h1>
        <p className="mt-6 text-neutral-600 max-w-md">
          Choose whether you'll donate medicines you no longer need, or receive
          them on behalf of a patient or NGO. Verification for pharmacies and
          clinics happens after signup.
        </p>
      </div>
      <form
        onSubmit={submit}
        className="md:col-span-7 max-w-2xl w-full ml-auto bg-white hairline p-8"
        data-testid="register-form"
      >
        <div className="eyebrow mb-4">Pick your role</div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { id: "donor", title: "Donor", sub: "I have unused medicine" },
            { id: "receiver", title: "Receiver", sub: "I / my NGO need medicine" },
          ].map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setF("role", r.id)}
              className={`p-4 text-left border transition-colors ${
                form.role === r.id
                  ? "border-[#E05A47] bg-[#E05A47]/5"
                  : "border-[hsl(var(--border))] bg-white"
              }`}
              data-testid={`role-${r.id}-btn`}
            >
              <div className="font-display text-2xl">{r.title}</div>
              <div className="text-xs text-neutral-500 mt-1">{r.sub}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Full name" required value={form.name} onChange={(v) => setF("name", v)} testId="reg-name" />
          <Field label="Email" type="email" required value={form.email} onChange={(v) => setF("email", v)} testId="reg-email" />
          <Field label="Password" type="password" required value={form.password} onChange={(v) => setF("password", v)} testId="reg-password" hint="Min 6 characters" />
          <Field label="Phone (optional)" value={form.phone} onChange={(v) => setF("phone", v)} testId="reg-phone" />
          <Field label={form.role === "donor" ? "Pharmacy / Org" : "NGO / Clinic"} value={form.organization} onChange={(v) => setF("organization", v)} testId="reg-org" />
          <Field label="City" value={form.location} onChange={(v) => setF("location", v)} testId="reg-location" />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="btn-primary mt-8 w-full justify-center"
          data-testid="register-submit-btn"
        >
          {busy ? "Creating account…" : "Create account"}
        </button>
        <div className="text-xs text-neutral-500 mt-4 text-center">
          Already registered?{" "}
          <Link to="/login" className="underline" data-testid="register-to-login">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, hint, testId }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 px-3 border border-[hsl(var(--border))] bg-white text-sm"
        data-testid={`${testId}-input`}
      />
      {hint && <div className="text-[10px] text-neutral-400 mt-1">{hint}</div>}
    </div>
  );
}
