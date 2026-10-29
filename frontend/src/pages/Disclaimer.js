import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft, HeartPulse } from "lucide-react";

export default function Disclaimer() {
  return (
    <div className="max-w-[1000px] mx-auto px-6 md:px-10 py-16" data-testid="disclaimer-page">
      <Link
        to="/"
        className="text-xs text-neutral-500 inline-flex items-center gap-1 hover:text-[#0D1117] mb-8"
      >
        <ArrowLeft size={14} /> Back to home
      </Link>

      <div className="eyebrow flex items-center gap-1.5 text-amber-700 mb-2">
        <AlertTriangle size={14} /> Medical & Regulatory Compliance Notice
      </div>
      <h1 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tighter mb-4">
        Medical <em style={{ fontStyle: "italic" }}>Disclaimer</em>.
      </h1>
      <p className="text-xs text-neutral-500 mb-10">
        Statutory notice regarding pharmaceutical safety and Indian healthcare regulations
      </p>

      <div className="space-y-8 text-sm text-neutral-700 leading-relaxed hairline bg-white p-8 rounded-xl">
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-red-700 font-bold text-base mb-1">
            <HeartPulse size={18} />
            Important Medical Notice
          </div>
          <p>
            NearVita is a technological facilitation platform, <strong>not</strong> a medical consultation
            service, physician, hospital, or registered pharmacy. The information on this website does not
            constitute medical advice, diagnosis, treatment, or pharmaceutical consultation.
          </p>
          <p>
            Patients must always consult a qualified Registered Medical Practitioner (RMP) regarding any medical
            condition, drug dosage, contraindications, or prescription treatment. Never self-medicate or alter
            prescribed dosages based on inventory availability on NearVita.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-2xl text-neutral-900">
            2. Compliance with the Drugs and Cosmetics Act, 1940
          </h2>
          <p>
            In accordance with the Drugs and Cosmetics Act, 1940 and Drugs and Cosmetics Rules, 1945:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-neutral-600">
            <li>
              <strong>Schedule H, H1 & X Medications:</strong> Any medicine classified as Schedule H, Schedule H1,
              or prescription-only must only be claimed, transferred, and dispensed upon presentation of a valid
              original prescription authored by a registered physician.
            </li>
            <li>
              <strong>Prohibition of Expired Drugs:</strong> NearVita strictly prohibits the listing, donation, or
              transfer of expired medicines. All listed items must have at least <strong>30 days of shelf life</strong>
              remaining. Any expired medicine must be safely disposed of in accordance with the Bio-Medical Waste
              Management Rules.
            </li>
            <li>
              <strong>Storage and Chain of Custody:</strong> Donors are legally obligated to maintain required cold-chain
              or storage conditions (e.g. insulin, biologics) up until physical handover.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-2xl text-neutral-900">3. Non-Commercial Facilitation</h2>
          <p>
            Every transaction on NearVita is strictly non-commercial and free of charge. No monetary payment, fee,
            surcharge, or consideration may be demanded or accepted for donated medications.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-2xl text-neutral-900">4. Adverse Drug Reaction Reporting</h2>
          <p>
            If any patient experiences an unexpected side effect or adverse reaction from any medication, seek
            immediate emergency medical care and report the incident to the Pharmacovigilance Programme of India
            (PvPI) via the toll-free helpline: <strong>1800-180-3024</strong>.
          </p>
        </section>
      </div>
    </div>
  );
}

