function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`.trim()} />;
}

export default function TeamDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div className="space-y-4 border-b border-border pb-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Bar className="h-8 w-56" />
              <Bar className="h-6 w-24 rounded-full" />
              <Bar className="h-8 w-8 rounded-md" />
            </div>
            <Bar className="h-4 w-52" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Bar className="h-9 w-28" />
            <Bar className="h-9 w-36" />
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <Bar className="h-6 w-24" />
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Bar className="h-9 w-9 rounded-full" />
                  <div className="space-y-2">
                    <Bar className="h-4 w-40" />
                    <Bar className="h-3 w-64 max-w-[60vw]" />
                  </div>
                </div>
                <Bar className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <Bar className="h-6 w-28" />
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <Bar className="mb-3 h-10 w-full" />
          <div className="flex justify-end">
            <Bar className="h-9 w-28" />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <Bar className="h-6 w-32" />
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border/60 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Bar className="h-9 w-9 rounded-full" />
                    <div className="space-y-2">
                      <Bar className="h-4 w-40" />
                      <Bar className="h-3 w-56" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Bar className="h-8 w-20" />
                    <Bar className="h-8 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
