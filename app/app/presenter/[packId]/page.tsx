import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getPresenterPackData } from "@/src/actions/presenter";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { PresenterPlayer } from "@/src/components/presenter/PresenterPlayer";
import { ArrowRightIcon } from "@/src/ui/icons";

function NotAuthorized() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <PageHeader
        title="Not authorized"
        description="You do not have access to run this presenter."
        backHref="/app/packs"
        breadcrumbs={[
          { label: "App", href: "/app" },
          { label: "Packs", href: "/app/packs" },
          { label: "Presenter" },
        ]}
      />
      <Link href="/app/packs" className="text-sm font-medium text-slate-900 underline">
        Back to packs
      </Link>
    </div>
  );
}

function EmptyPresenterState({ packId }: { packId: string }) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Presenter"
        description="Prepare to run the live presentation."
        backHref={`/app/packs/${packId}`}
        breadcrumbs={[
          { label: "App", href: "/app" },
          { label: "Packs", href: "/app/packs" },
          { label: "Presenter" },
        ]}
      />
      <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Nothing to present yet</h2>
        <p className="mt-2 text-sm text-slate-600">
          This pack has no rounds or questions. Build the pack first, then run presenter mode.
        </p>
        <Button asChild className="mt-5">
          <Link href={`/app/packs/${packId}`}>
            <ArrowRightIcon className="mr-2 h-4 w-4" aria-hidden />
            Open pack builder
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default async function PresenterPage({
  params,
}: {
  params: Promise<{ packId?: string | string[] }>;
}) {
  const resolved = await params;
  const packId = Array.isArray(resolved.packId) ? resolved.packId[0] : resolved.packId;
  if (!packId) return <NotAuthorized />;

  const { pack, slides } = await getPresenterPackData(packId);
  if (!pack) return <NotAuthorized />;

  const hasQuestionSlides = slides.some((s) => s.kind === "question");
  if (!hasQuestionSlides) return <EmptyPresenterState packId={packId} />;

  return (
    <PresenterPlayer
      pack={{
        id: pack.id,
        title: pack.title,
        breakTimerSec: pack.breakTimerSec,
        breakMusicUrl: pack.breakMusicUrl,
        timerMusicUrl: pack.timerMusicUrl,
      }}
      slides={slides}
    />
  );
}
