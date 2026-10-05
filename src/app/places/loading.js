import { Search, SlidersHorizontal } from 'lucide-react';

export default function PlacesLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <div className="h-16 border-b border-border bg-white" />
      
      <main className="flex-1">
        <header className="border-b border-border bg-surface-alt py-6 sm:py-10">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)] lg:items-start lg:gap-12">
            <div className="pt-3">
              <div className="h-4 w-32 bg-surface-alt/60 rounded animate-pulse" />
              <div className="mt-4 space-y-3">
                <div className="h-8 w-48 bg-surface-alt/60 rounded animate-pulse" />
                <div className="h-8 w-40 bg-surface-alt/60 rounded animate-pulse" />
              </div>
            </div>
            <div className="lg:pt-3 space-y-3">
              <div className="h-4 w-full bg-surface-alt/60 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-surface-alt/60 rounded animate-pulse" />
            </div>
          </div>
        </header>

        <section className="mx-auto w-full max-w-6xl px-4 pt-8 pb-16 sm:px-6 md:pb-24">
          <div className="places-search mb-8">
            <Search size={22} className="text-content-secondary shrink-0" />
            <div className="h-6 flex-1 bg-surface-alt rounded animate-pulse" />
            <div className="h-10 w-24 bg-surface-alt rounded animate-pulse" />
          </div>

          <div className="places-explorer">
            <aside className="places-filters">
              <h2 className="font-semibold text-base flex items-center gap-2 mb-5">
                <SlidersHorizontal size={17} /> เลือกสไตล์การเดินทาง
              </h2>
              <div className="category-list space-y-2">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="h-10 bg-surface-alt rounded-lg animate-pulse" />
                ))}
              </div>
            </aside>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-5 border-b border-border">
                <div className="h-4 w-32 bg-surface-alt rounded animate-pulse" />
                <div className="h-9 w-36 bg-surface-alt rounded animate-pulse" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-border overflow-hidden animate-pulse">
                    <div className="aspect-[4/3] bg-surface-alt" />
                    <div className="p-5 space-y-4">
                      <div className="h-5 bg-surface-alt rounded w-3/4" />
                      <div className="h-4 bg-surface-alt rounded w-1/2" />
                      <div className="space-y-2">
                        <div className="h-3 bg-surface-alt rounded w-full" />
                        <div className="h-3 bg-surface-alt rounded w-5/6" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="border-t border-border bg-surface py-8" />
    </div>
  );
}
