import { Card, CardContent } from "@/components/ui/card";

export default function PackDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-80 animate-pulse rounded bg-slate-100" />
      </div>
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={`pack-settings-skel-${idx}`} className="h-10 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
          <div className="h-24 animate-pulse rounded bg-slate-100" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex items-center justify-between">
            <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-9 w-36 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={`round-skel-${idx}`} className="h-16 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
