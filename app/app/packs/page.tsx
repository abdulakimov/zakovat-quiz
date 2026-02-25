import { PageHeader } from "@/src/components/layout/PageHeader";
import { getMyPacks } from "@/src/actions/packs";
import { PacksListClient } from "@/src/components/packs/PacksListClient";

export default async function PacksPage() {
  const { packs } = await getMyPacks();

  const items = packs.map((pack) => ({
    id: pack.id,
    title: pack.title,
    description: pack.description,
    visibility: pack.visibility,
    roundsCount: pack._count.rounds,
    updatedAtLabel: pack.updatedAt.toLocaleDateString(),
  }));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Packs"
        description="Create and manage quiz packs, rounds, and question sets."
        breadcrumbs={[
          { label: "App", href: "/app" },
          { label: "Packs" },
        ]}
      />
      <PacksListClient packs={items} />
    </div>
  );
}
