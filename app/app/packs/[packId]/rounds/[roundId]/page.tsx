import Link from "next/link";
import { getLocale } from "next-intl/server";
import { getRoundQuestionBuilderData } from "@/src/actions/questions";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { RoundQuestionsBuilder } from "@/src/components/packs/RoundQuestionsBuilder";
import { localizeHref, type AppLocale } from "@/src/i18n/config";
import { getTranslations } from "@/src/i18n/server";

async function NotAuthorized({ locale }: { locale: AppLocale }) {
  const [tCommon, tPacks] = await Promise.all([getTranslations("common"), getTranslations("packs")]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <PageHeader
        title={tCommon("notAuthorized")}
        description={tPacks("roundNotAuthorizedDescription")}
        backHref={localizeHref(locale, "/app/packs")}
        breadcrumbs={[
          { label: tCommon("app"), href: localizeHref(locale, "/app") },
          { label: tPacks("title"), href: localizeHref(locale, "/app/packs") },
          { label: tCommon("notAuthorized") },
        ]}
      />
      <Link href={localizeHref(locale, "/app/packs")} className="text-sm font-medium text-foreground underline">
        {tPacks("backToPacks")}
      </Link>
    </div>
  );
}

export default async function RoundQuestionsPage({
  params,
}: {
  params: Promise<{ packId?: string | string[]; roundId?: string | string[] }>;
}) {
  const locale = (await getLocale()) as AppLocale;
  const [tCommon, tPacks] = await Promise.all([getTranslations("common"), getTranslations("packs")]);

  const resolved = await params;
  const packId = Array.isArray(resolved.packId) ? resolved.packId[0] : resolved.packId;
  const roundId = Array.isArray(resolved.roundId) ? resolved.roundId[0] : resolved.roundId;
  if (!packId || !roundId) return <NotAuthorized locale={locale} />;

  const { round, pack } = await getRoundQuestionBuilderData(packId, roundId);
  if (!round || !pack) return <NotAuthorized locale={locale} />;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title={round.title}
        description={tPacks("roundBuilderDescription")}
        backHref={localizeHref(locale, `/app/packs/${pack.id}`)}
        breadcrumbs={[
          { label: tCommon("app"), href: localizeHref(locale, "/app") },
          { label: tPacks("title"), href: localizeHref(locale, "/app/packs") },
          { label: pack.title, href: localizeHref(locale, `/app/packs/${pack.id}`) },
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
