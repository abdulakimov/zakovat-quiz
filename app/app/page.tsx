import Link from "next/link";
import { PageHeader } from "@/src/components/layout/PageHeader";

export default function AppHomePage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Your workspace"
        description="You are signed in. Start building your first quiz."
        breadcrumbs={[{ label: "App" }]}
      />
      <div className="flex flex-wrap gap-4 text-sm">
        <Link className="font-medium text-slate-900 underline" href="/app/teams">
          Teams
        </Link>
        <Link className="font-medium text-slate-900 underline" href="/app/profile">
          Profile
        </Link>
      </div>
    </div>
  );
}
