export function CatalogUnavailable() {
  return (
    <div className="border border-stone-300 bg-white/40 px-6 py-12 text-center">
      <p className="text-[10px] tracking-[0.2em] text-stone-500 uppercase">
        Catalog update in progress
      </p>
      <p className="mx-auto mt-4 max-w-lg font-serif text-2xl leading-snug">
        The latest collection could not be loaded. Please check back in a moment.
      </p>
    </div>
  );
}
