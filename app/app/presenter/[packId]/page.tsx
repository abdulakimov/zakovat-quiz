import Link from "next/link";
import { getLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { getPresenterPackData } from "@/src/actions/presenter";
import { getTranslations } from "@/src/i18n/server";
import { localizeHref, type AppLocale } from "@/src/i18n/config";
import { PageHeader } from "@/src/components/layout/PageHeader";
import { PresenterPlayer } from "@/src/components/presenter/PresenterPlayer";
import { ArrowRightIcon } from "@/src/ui/icons";

function NotAuthorized({ locale, tCommon, tPacks, tPresenter }: { locale: AppLocale; tCommon: Awaited<ReturnType<typeof getTranslations>>; tPacks: Awaited<ReturnType<typeof getTranslations>>; tPresenter: Awaited<ReturnType<typeof getTranslations>> }) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <PageHeader
        title={tCommon("notAuthorized")}
        description={tPresenter("notAuthorizedDescription")}
        backHref={localizeHref(locale, "/app/packs")}
        breadcrumbs={[
          { label: tCommon("app"), href: localizeHref(locale, "/app") },
          { label: tPacks("title"), href: localizeHref(locale, "/app/packs") },
          { label: tPresenter("title") },
        ]}
      />
      <Link href={localizeHref(locale, "/app/packs")} className="text-sm font-medium text-slate-900 underline">
        {tPacks("backToPacks")}
      </Link>
    </div>
  );
}

function EmptyPresenterState({
  packId,
  locale,
  tCommon,
  tPacks,
  tPresenter,
}: {
  packId: string;
  locale: AppLocale;
  tCommon: Awaited<ReturnType<typeof getTranslations>>;
  tPacks: Awaited<ReturnType<typeof getTranslations>>;
  tPresenter: Awaited<ReturnType<typeof getTranslations>>;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title={<span data-testid="presenter-heading">{tPresenter("title")}</span>}
        description={tPresenter("description")}
        backHref={localizeHref(locale, `/app/packs/${packId}`)}
        breadcrumbs={[
          { label: tCommon("app"), href: localizeHref(locale, "/app") },
          { label: tPacks("title"), href: localizeHref(locale, "/app/packs") },
          { label: tPresenter("title") },
        ]}
      />
      <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">{tPresenter("emptyTitle")}</h2>
        <p className="mt-2 text-sm text-slate-600">
          {tPresenter("emptyDescription")}
        </p>
        <Button asChild className="mt-5">
          <Link href={localizeHref(locale, `/app/packs/${packId}`)}>
            <ArrowRightIcon className="mr-2 h-4 w-4" aria-hidden />
            {tPresenter("openPackBuilder")}
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
  const locale = (await getLocale()) as AppLocale;
  const [tCommon, tPacks, tPresenter] = await Promise.all([
    getTranslations("common"),
    getTranslations("packs"),
    getTranslations("presenter"),
  ]);

  const resolved = await params;
  const packId = Array.isArray(resolved.packId) ? resolved.packId[0] : resolved.packId;
  if (!packId) return <NotAuthorized locale={locale} tCommon={tCommon} tPacks={tPacks} tPresenter={tPresenter} />;

  const { pack, slides } = await getPresenterPackData(packId);
  if (!pack) return <NotAuthorized locale={locale} tCommon={tCommon} tPacks={tPacks} tPresenter={tPresenter} />;

  const hasQuestionSlides = slides.some((s) => s.kind === "question");
  if (!hasQuestionSlides) {
    return <EmptyPresenterState packId={packId} locale={locale} tCommon={tCommon} tPacks={tPacks} tPresenter={tPresenter} />;
  }

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
