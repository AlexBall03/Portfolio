const block = 'bg-fg/[0.06] motion-safe:animate-pulse';

/** Content-area skeleton: a page header and two panels. */
export function AdminContentLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-8">
      <span className="sr-only">Loading…</span>
      <div aria-hidden="true" className="flex flex-col gap-3 border-b border-line pb-6">
        <div className={`${block} h-3 w-24 rounded-md`} />
        <div className={`${block} h-9 w-56 rounded-md`} />
      </div>
      <div aria-hidden="true" className="grid gap-4 md:grid-cols-2">
        <div className={`${block} h-48 rounded-lg`} />
        <div className={`${block} h-48 rounded-lg`} />
      </div>
    </div>
  );
}

/**
 * Placeholder while the session is verified. It shows the console's shape
 * only: no navigation, identity, or data until `requireAdmin()` succeeds.
 */
export function AdminLoading() {
  return (
    <div className="relative z-[1] flex min-h-svh flex-col lg:flex-row">
      <div aria-hidden="true" className="admin-rail sticky top-0 hidden h-svh w-64 shrink-0 lg:block">
        <div className="h-16 border-b border-line" />
      </div>
      <div aria-hidden="true" className="chrome-bar h-16 lg:hidden" data-scrolled />
      <div className="mx-auto flex w-full max-w-[72rem] flex-1 flex-col px-gutter py-8 lg:px-10 lg:py-10">
        <AdminContentLoading />
      </div>
    </div>
  );
}
