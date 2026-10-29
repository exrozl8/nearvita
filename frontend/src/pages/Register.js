import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

export default function Register() {
  const [form, setForm] = useState({
    role: "donor",
    email: "",
    password: "",
    name: "",
    organization: "",
    location: "",
    phone: "",
    verification_details: "",
  });
  const [busy, setBusy] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    const r = await register(form);
    setBusy(false);
    if (r.ok) {
      toast.success(`Welcome to NearVita, ${r.user.name.split(" ")[0]}!`);
      if (form.role === "receiver") {
        toast.info(
          "Your receiver account has been registered! An administrator will review your credentials for claim access."
        );
      }
      navigate(r.user.role === "donor" ? "/donor" : "/receiver");
    } else {
      toast.error(r.error);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 grid grid-cols-1 md:grid-cols-12 gap-10" data-testid="register-page">
      <div className="md:col-span-5 space-y-4">
        <div className="eyebrow">Join the Network · Issue 001</div>
        <h1 className="font-display text-6xl md:text-7xl leading-[0.9] tracking-tighter mt-4">
          Two roles. <em style={{ fontStyle: "italic" }}>One mission.</em>
        </h1>
        <p className="mt-6 text-neutral-600 max-w-md leading-relaxed text-sm">
          NearVita is a zero-resale network. Choose whether you will donate unused unexpired
          medicines, or receive them on behalf of a charitable clinic, NGO, or patient.
        </p>

        <div className="p-4 rounded-lg bg-neutral-50 hairline border border-neutral-200 text-xs text-neutral-600 space-y-2 max-w-md">
          <div className="flex items-center gap-1.5 font-bold text-neutral-900">
            <ShieldCheck size={16} className="text-emerald-700" /> Statutory Compliance
          </div>
          <p>
            Under the Drugs and Cosmetics Act, 1940, receiver accounts are administratively vetted
            to ensure medicines reach legitimate community healthcare facilities.
          </p>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="md:col-span-7 max-w-2xl w-full ml-auto bg-white hairline p-8 rounded-xl shadow-sm"
        data-testid="register-form"
      >
        <div className="eyebrow mb-4">Pick your role</div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { id: "donor", title: "Donor", sub: "I have unused unexpired medicine" },
            { id: "receiver", title: "Receiver", sub: "NGO, dispensary or clinic" },
          ].map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setF("role", r.id)}
              className={`p-4 text-left border rounded-lg transition-colors ${
                form.role === r.id
                  ? "border-[#E05A47] bg-[#E05A47]/5"
                  : "border-[hsl(var(--border))] bg-white hover:border-neutral-400"
              }`}
              data-testid={`role-${r.id}-btn`}
            >
              <div className="font-display text-2xl">{r.title}</div>
              <div className="text-xs text-neutral-500 mt-1">{r.sub}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Full name*" required value={form.name} onChange={(v) => setF("name", v)} testId="reg-name" />
          <Field label="Email address*" type="email" required value={form.email} onChange={(v) => setF("email", v)} testId="reg-email" />
          <Field label="Password*" type="password" required value={form.password} onChange={(v) => setF("password", v)} testId="reg-password" hint="Min 8 characters" minLength={8} />
          <Field label="Contact Phone*" required value={form.phone} onChange={(v) => setF("phone", v)} testId="reg-phone" />
          <Field label={form.role === "donor" ? "Pharmacy / Hospital / Org Name" : "NGO / Charitable Clinic Name*"} required={form.role === "receiver"} value={form.organization} onChange={(v) => setF("organization", v)} testId="reg-org" />
          <Field label="City / Location*" required value={form.location} onChange={(v) => setF("location", v)} testId="reg-location" />

          {form.role === "receiver" && (
            <div className="md:col-span-2">
              <Field
                label="Healthcare Credential / Registration (NGO 12A/80G, Clinic License, or RMP ID)*"
                required
                value={form.verification_details}
                onChange={(v) => setF("verification_details", v)}
                testId="reg-verification"
                hint="Used by NearVita compliance administrators to approve claiming permissions."
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={busy}
          className="btn-primary mt-8 w-full justify-center !py-3 shadow-sm"
          data-testid="register-submit-btn"
        >
          {busy ? "Creating account…" : "Create Account"}
        </button>

        <div className="text-xs text-neutral-500 mt-4 text-center">
          Already registered?{" "}
          <Link to="/login" className="underline font-semibold text-[#E05A47]" data-testid="register-to-login">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, hint, testId, minLength }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5 text-neutral-700">{label}</label>
      <input
        type={type}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 px-3 border border-[hsl(var(--border))] bg-white text-sm rounded focus:outline-none focus:border-neutral-900"
        data-testid={`${testId}-input`}
      />
      {hint && <div className="text-[10px] text-neutral-400 mt-1">{hint}</div>}
    </div>
  );
}
