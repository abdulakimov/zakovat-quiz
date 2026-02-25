import Link from "next/link";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { getQuestionEditorData } from "@/src/actions/questions";
import { QuestionEditor } from "@/src/components/packs/QuestionEditor";

function NotAuthorized() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <PageHeader
        title="Not authorized"
        description="You do not have access to this question."
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

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ packId?: string | string[]; roundId?: string | string[]; questionId?: string | string[] }>;
}) {
  const resolved = await params;
  const packId = Array.isArray(resolved.packId) ? resolved.packId[0] : resolved.packId;
  const roundId = Array.isArray(resolved.roundId) ? resolved.roundId[0] : resolved.roundId;
  const questionId = Array.isArray(resolved.questionId) ? resolved.questionId[0] : resolved.questionId;
  if (!packId || !roundId || !questionId) return <NotAuthorized />;

  const { round, pack, question, mediaAssets } = await getQuestionEditorData(packId, roundId, questionId);
  if (!round || !pack || !question) return <NotAuthorized />;

  return (
    <QuestionEditor
      mode="edit"
      packId={packId}
      packTitle={pack.title}
      packDefaultQuestionTimerPresetSec={pack.defaultQuestionTimerPresetSec ?? null}
      round={{
        id: round.id,
        order: round.order,
        title: round.title,
        description: round.description,
        defaultTimerSec: round.defaultTimerSec,
        defaultQuestionType: round.defaultQuestionType,
      }}
      question={question}
      mediaAssets={mediaAssets}
      backHref={`/app/packs/${packId}/rounds/${roundId}`}
    />
  );
}
