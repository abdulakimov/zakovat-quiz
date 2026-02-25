import Link from "next/link";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { getRoundQuestionBuilderData } from "@/src/actions/questions";
import { RoundQuestionsBuilder } from "@/src/components/packs/RoundQuestionsBuilder";

function NotAuthorized() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <PageHeader
        title="Not authorized"
        description="You do not have access to this round."
        backHref="/app/packs"
        breadcrumbs={[
          { label: "App", href: "/app" },
          { label: "Packs", href: "/app/packs" },
          { label: "Not authorized" },
        ]}
      />
      <Link href="/app/packs" className="text-sm font-medium text-slate-900 underline">
        Back to packs
      </Link>
    </div>
  );
}

export default async function RoundQuestionsPage({
  params,
}: {
  params: Promise<{ packId?: string | string[]; roundId?: string | string[] }>;
}) {
  const resolved = await params;
  const packId = Array.isArray(resolved.packId) ? resolved.packId[0] : resolved.packId;
  const roundId = Array.isArray(resolved.roundId) ? resolved.roundId[0] : resolved.roundId;
  if (!packId || !roundId) return <NotAuthorized />;

  const { round, pack } = await getRoundQuestionBuilderData(packId, roundId);
  if (!round || !pack) return <NotAuthorized />;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title={round.title}
        description="Build questions for this round. Question type is selected per question."
        backHref={`/app/packs/${pack.id}`}
        breadcrumbs={[
          { label: "App", href: "/app" },
          { label: "Packs", href: "/app/packs" },
          { label: pack.title, href: `/app/packs/${pack.id}` },
          { label: round.title },
        ]}
      />
      <RoundQuestionsBuilder
        packId={packId}
        round={{
          id: round.id,
          order: round.order,
          title: round.title,
          description: round.description,
          defaultTimerSec: round.defaultTimerSec,
          defaultQuestionType: round.defaultQuestionType,
        }}
        questions={round.questions}
      />
    </div>
  );
}
