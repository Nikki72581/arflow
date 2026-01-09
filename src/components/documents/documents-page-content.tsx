"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DocumentType } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentsTable } from "./documents-table";

interface EnabledType {
  documentType: DocumentType;
  displayName: string;
  displayOrder: number;
}

interface DocumentsPageContentProps {
  searchParams: { [key: string]: string | string[] | undefined };
  enabledTypes: EnabledType[];
}

export function DocumentsPageContent({
  searchParams,
  enabledTypes,
}: DocumentsPageContentProps) {
  const router = useRouter();
  const params = useSearchParams();

  // Get the active tab from URL or default to first enabled type
  const activeTab = (params.get("type") as DocumentType) || enabledTypes[0]?.documentType;

  const handleTabChange = (value: string) => {
    const newParams = new URLSearchParams(params.toString());
    newParams.set("type", value);
    newParams.delete("page"); // Reset to page 1 when changing tabs
    router.push(`/dashboard/documents?${newParams.toString()}`);
  };

  if (enabledTypes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/10">
        <div className="text-center">
          <p className="text-muted-foreground">
            No document types are enabled.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Contact your administrator to enable document types.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList className="grid w-full max-w-md" style={{ gridTemplateColumns: `repeat(${enabledTypes.length}, 1fr)` }}>
        {enabledTypes.map((type) => (
          <TabsTrigger key={type.documentType} value={type.documentType}>
            {type.displayName}
          </TabsTrigger>
        ))}
      </TabsList>

      {enabledTypes.map((type) => (
        <TabsContent key={type.documentType} value={type.documentType}>
          <DocumentsTable
            documentType={type.documentType}
            displayName={type.displayName}
            searchParams={searchParams}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
