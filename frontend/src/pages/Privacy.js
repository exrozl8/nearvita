import { Link } from "react-router-dom";
import { Lock, ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="max-w-[1000px] mx-auto px-6 md:px-10 py-16" data-testid="privacy-page">
      <Link
        to="/"
        className="text-xs text-neutral-500 inline-flex items-center gap-1 hover:text-[#0D1117] mb-8"
      >
        <ArrowLeft size={14} /> Back to home
      </Link>

      <div className="eyebrow flex items-center gap-1.5 text-neutral-500 mb-2">
        <Lock size={14} /> Privacy & Data Protection
      </div>
      <h1 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tighter mb-4">
        Privacy <em style={{ fontStyle: "italic" }}>Policy</em>.
      </h1>
      <p className="text-xs text-neutral-500 mb-10">
        In compliance with the Digital Personal Data Protection Act, 2023 (DPDPA)
      </p>

      <div className="space-y-8 text-sm text-neutral-700 leading-relaxed hairline bg-white p-8 rounded-xl">
        <section className="space-y-2">
          <h2 className="font-display text-2xl text-neutral-900">1. Information We Collect</h2>
          <p>
            NearVita collects only the minimal information strictly required to facilitate the safe and
            transparent donation of surplus medical supplies:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-neutral-600">
            <li><strong>Account Information:</strong> Full name, institutional email address, hashed credentials, and organization name.</li>
            <li><strong>Verification Records:</strong> Clinic registration numbers, NGO trust certificates (e.g. 12A/80G), or pharmacy license IDs.</li>
            <li><strong>Listing & Coordination Data:</strong> Medicine details (batch, expiry, manufacturer), pickup cities, and private coordination messages between donor and recipient.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-2xl text-neutral-900">2. How Your Data Is Used</h2>
          <p>
            Your data is used solely to:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-neutral-600">
            <li>Verify receiver eligibility to prevent illicit drug distribution.</li>
            <li>Enable direct communication between matched donors and receivers for logistics and collection.</li>
            <li>Maintain statutory safety audit trails as required by pharmaceutical regulatory guidelines.</li>
          </ul>
          <p>
            NearVita does <strong>not</strong> sell, rent, or monetize personal or institutional contact data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-2xl text-neutral-900">3. Data Security & Storage</h2>
          <p>
            All network communication is encrypted using TLS. Authentication tokens are digitally signed with
            cryptographic keys. Access to internal system endpoints is restricted to authenticated administrators
            via role-based access controls.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-2xl text-neutral-900">4. User Rights</h2>
          <p>
            Under applicable Indian data protection regulations, users may request review, modification, or
            deletion of their account and non-statutory records by emailing{" "}
            <a href="mailto:privacy@nearvita.health" className="underline font-medium text-neutral-900">
              privacy@nearvita.health
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}

