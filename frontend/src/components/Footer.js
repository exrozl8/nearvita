export default function Footer() {
  return (
    <footer
      className="border-t border-[hsl(var(--border))] mt-24"
      data-testid="site-footer"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-12 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <div className="font-display text-3xl leading-none">NearVita</div>
          <p className="mt-3 text-sm text-neutral-600 max-w-md">
            A network to redirect near-expiry medicines from those who have
            them to those who urgently need them — before another dose goes to
            waste.
          </p>
        </div>
        <div>
          <div className="eyebrow mb-3">Platform</div>
          <ul className="space-y-2 text-sm text-neutral-700">
            <li>Browse medicines</li>
            <li>Become a donor</li>
            <li>Verified receivers</li>
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-3">Contact</div>
          <ul className="space-y-2 text-sm text-neutral-700">
            <li>hello@nearvita.health</li>
            <li>Bengaluru · India</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[hsl(var(--border))]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-xs text-neutral-500">
          <div>© {new Date().getFullYear()} NearVita — Every dose counts.</div>
          <div className="font-mono-alt tracking-wider">v1.0.0 · ISSUE 001</div>
        </div>
      </div>
    </footer>
  );
}
