import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getDocument } from "@/app/actions/documents";
import { DocumentDetailView } from "@/components/documents/document-detail-view";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Document Details | ARFlow",
  description: "View document details",
};

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document = await getDocument(id);

  if (!document) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<DocumentDetailSkeleton />}>
        <DocumentDetailView document={document} />
      </Suspense>
    </div>
  );
}

function DocumentDetailSkeleton() {
  return (
    <Card className="p-6">
      <Skeleton className="h-64 w-full" />
    </Card>
  );
}
