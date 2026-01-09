import { Suspense } from "react";
import { getDocumentTypeSettings } from "@/app/actions/document-type-settings";
import { DocumentTypeSettingsForm } from "@/components/administration/document-type-settings-form";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Document Types | ARFlow",
  description: "Manage document type settings",
};

export default async function DocumentTypesSettingsPage() {
  const settings = await getDocumentTypeSettings();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Types</h1>
          <p className="text-muted-foreground">
            Configure which document types are enabled and customize their display names
          </p>
        </div>
      </div>

      <Suspense fallback={<SettingsLoadingSkeleton />}>
        <DocumentTypeSettingsForm initialSettings={settings} />
      </Suspense>
    </div>
  );
}

function SettingsLoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-8 w-48" />
        </CardTitle>
      </CardHeader>
      <div className="p-6">
        <Skeleton className="h-64 w-full" />
      </div>
    </Card>
  );
}
