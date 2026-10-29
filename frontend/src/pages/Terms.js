import { Link } from "react-router-dom";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="max-w-[1000px] mx-auto px-6 md:px-10 py-16" data-testid="terms-page">
      <Link
        to="/"
        className="text-xs text-neutral-500 inline-flex items-center gap-1 hover:text-[#0D1117] mb-8"
      >
        <ArrowLeft size={14} /> Back to home
      </Link>

      <div className="eyebrow flex items-center gap-1.5 text-neutral-500 mb-2">
        <ShieldCheck size={14} /> NearVita Platform Policy
      </div>
      <h1 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tighter mb-4">
        Terms of <em style={{ fontStyle: "italic" }}>Service</em>.
      </h1>
      <p className="text-xs text-neutral-500 mb-10">
        Effective Date: October 2026 · Governed under the Laws of India
      </p>

      <div className="space-y-8 text-sm text-neutral-700 leading-relaxed hairline bg-white p-8 rounded-xl">
        <section className="space-y-2">
          <h2 className="font-display text-2xl text-neutral-900">1. Nature of the Platform</h2>
          <p>
            NearVita is an open, non-commercial peer-to-peer facilitation network designed to bridge
            the gap between holders of unexpired surplus medicines (pharmacies, medical suppliers, hospitals,
            and authorized individuals) and verified healthcare recipients (NGOs, charitable clinics, community
            dispensaries, and needy patients).
          </p>
          <p>
            NearVita does <strong>not</strong> buy, sell, warehouse, re-label, or repackage pharmaceuticals.
            NearVita is not an online pharmacy, medical store, or drug manufacturer as defined under the Drugs and
            Cosmetics Act, 1940.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-2xl text-neutral-900">2. Strict Zero-Resale Policy</h2>
          <p>
            All medicines, surgical items, and healthcare consumables listed on NearVita are strictly offered on a
            <strong>100% free donation basis</strong>. Commercial sale, retail pricing, unauthorized markups, or
            reselling of any item obtained through the NearVita platform is strictly illegal and will result in
            immediate account termination and reporting to relevant statutory authorities.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-2xl text-neutral-900">3. Receiver Verification and Credentialing</h2>
          <p>
            To prevent diversion of medications and ensure proper chain-of-custody, any entity registering as a
            Receiver must undergo administrative verification. Receivers must submit valid identification, NGO trust
            registration (e.g. 12A/80G, DARPAN), or clinical establishment credentials. Unverified accounts cannot
            reserve or claim prescription-grade medicines.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-2xl text-neutral-900">4. Donor Warranties and Safety Standards</h2>
          <p>
            By listing medicines on NearVita, each Donor represents, warrants, and agrees that:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-neutral-600">
            <li>The medicine is in its original manufacturer blister/strip or uncompromised factory seal.</li>
            <li>The medicine has at least <strong>30 days of shelf life remaining</strong> prior to expiration.</li>
            <li>The medicine has been stored in accordance with the manufacturer's temperature and humidity specifications.</li>
            <li>No expired, adulterated, contaminated, damaged, or recalled items will be listed.</li>
            <li>Controlled substances under the NDPS Act (narcotics/psychotropics) are strictly banned from the platform.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-2xl text-neutral-900">5. Limitation of Liability</h2>
          <p>
            Users acknowledge that NearVita acts solely as a technical matching service. NearVita makes no express or
            implied warranties regarding the efficacy, fitness for purpose, or therapeutic suitability of any donated
            item. Handover, clinical inspection, and dispensing must always be performed under the supervision of a
            qualified Registered Medical Practitioner (RMP) or licensed pharmacist.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-2xl text-neutral-900">6. Contact and Inquiries</h2>
          <p>
            For compliance questions or reporting safety concerns, contact our team at:{" "}
            <a href="mailto:compliance@nearvita.health" className="underline font-medium text-neutral-900">
              compliance@nearvita.health
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}

