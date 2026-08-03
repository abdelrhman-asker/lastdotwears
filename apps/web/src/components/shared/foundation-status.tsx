const capabilities = [
  'Next.js storefront boundary',
  'NestJS API boundary',
  'Validated runtime configuration',
  'PostgreSQL readiness checks',
];

export function FoundationStatus() {
  return (
    <main className="min-h-dvh bg-stone-50 px-6 py-12 text-stone-950 sm:px-10 lg:px-16">
      <div className="mx-auto flex min-h-[calc(100dvh-6rem)] max-w-7xl flex-col justify-between">
        <header className="flex items-center justify-between border-b border-stone-300 pb-5 text-xs tracking-[0.2em] uppercase">
          <span>Commerce Platform</span>
          <span className="text-stone-500">Foundation 01</span>
        </header>

        <section className="grid gap-12 py-20 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
          <div>
            <p className="mb-6 text-xs font-medium tracking-[0.25em] text-stone-500 uppercase">
              System status
            </p>
            <h1 className="max-w-4xl text-5xl leading-[0.95] font-medium tracking-[-0.05em] text-balance sm:text-7xl lg:text-8xl">
              The production foundation is ready.
            </h1>
            <p className="mt-8 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
              This temporary screen confirms that the web application is running. Storefront,
              catalog, customer, checkout, and administration experiences will replace it at their
              approved delivery stages.
            </p>
          </div>

          <div className="border-t border-stone-300 pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
            <p className="mb-5 text-xs tracking-[0.2em] text-stone-500 uppercase">Established</p>
            <ul className="space-y-4 text-sm">
              {capabilities.map((capability, index) => (
                <li key={capability} className="flex items-start gap-4">
                  <span className="mt-0.5 font-mono text-xs text-stone-400">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>{capability}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-stone-300 pt-5 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Egyptian market · EGP</span>
          <span>Next review gate: authentication and users</span>
        </footer>
      </div>
    </main>
  );
}
