import { Card, CardContent } from "@/components/ui/card";

export default function RoundLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-56 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-72 animate-pulse rounded bg-slate-100" />
      </div>
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
          <div className="flex items-center justify-between">
            <div className="h-9 w-40 animate-pulse rounded bg-slate-100" />
            <div className="h-9 w-32 animate-pulse rounded bg-slate-100" />
          </div>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={`question-skel-${idx}`}>
            <CardContent className="h-16 animate-pulse rounded bg-slate-100" />
          </Card>
        ))}
      </div>
    </div>
  );
}
