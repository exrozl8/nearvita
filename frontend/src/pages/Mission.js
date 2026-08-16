export default function Mission() {
  return (
    <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-20" data-testid="mission-page">
      <div className="eyebrow">Manifesto · Issue 001</div>
      <h1 className="font-display text-6xl md:text-8xl leading-[0.9] tracking-tighter mt-6">
        Medicine is <em style={{ fontStyle: "italic" }} className="text-[#E05A47]">not</em>
        <br />
        a disposable good.
      </h1>
      <div className="mt-16 grid grid-cols-1 md:grid-cols-12 gap-10">
        <p className="md:col-span-8 text-lg text-neutral-700 leading-relaxed">
          NearVita began as a question: what happens to the box of antibiotics
          left on a kitchen shelf when the patient recovers early? For most
          households, it ends in a bin. For pharmacies, it ends in a
          regulatory incinerator. Somewhere, at the same moment, a mother is
          rationing her child's inhaler.
        </p>
        <div className="md:col-span-4">
          <div className="eyebrow mb-3">Founders' note</div>
          <p className="text-sm text-neutral-600">
            We believe expiry dates are safety windows, not calendar
            countdowns. Within that window, medicine should move — not
            disappear.
          </p>
        </div>
      </div>
      <div className="mt-16 border-t border-[hsl(var(--border))] pt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          ["Zero resale", "Every gram of medicine on NearVita is donated. No commerce, no cash."],
          ["Verified receivers", "NGOs and clinics are credentialed before they can claim."],
          ["Chain of custody", "Every listing has an auditable trail from shelf to patient."],
        ].map(([t, d]) => (
          <div key={t}>
            <h4 className="font-display text-3xl">{t}</h4>
            <p className="mt-3 text-sm text-neutral-600">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
