import { PageHeader } from "@/src/components/layout/PageHeader";

export default function AdminPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Admin"
        description="Only admins can see this page."
        breadcrumbs={[
          { label: "App", href: "/app" },
          { label: "Admin" },
        ]}
      />
    </div>
  );
}
