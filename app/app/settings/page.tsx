import { PageHeader } from "@/src/components/layout/PageHeader";

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Settings"
        description="Settings UI is coming soon."
        breadcrumbs={[
          { label: "App", href: "/app" },
          { label: "Settings" },
        ]}
      />
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
        Account and workspace settings will be added here.
      </div>
    </div>
  );
}
