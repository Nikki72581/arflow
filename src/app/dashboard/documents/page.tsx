import { Suspense } from "react";
import { getEnabledDocumentTypes } from "@/app/actions/document-type-settings";
import { DocumentsPageContent } from "@/components/documents/documents-page-content";
import { DocumentFormDialog } from "@/components/documents/document-form-dialog";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Documents | ARFlow",
  description: "Manage your documents",
};

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const enabledTypes = await getEnabledDocumentTypes();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            View and manage all your documents
          </p>
        </div>
        <DocumentFormDialog />
      </div>

      <Suspense fallback={<DocumentsLoadingSkeleton />}>
        <DocumentsPageContent
          searchParams={searchParams}
          enabledTypes={enabledTypes}
        />
      </Suspense>
    </div>
  );
}

function DocumentsLoadingSkeleton() {
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
