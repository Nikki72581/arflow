"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { DocumentType } from "@prisma/client";

export async function getDocumentTypeSettings() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const settings = await prisma.documentTypeSetting.findMany({
    where: {
      organizationId: user.organizationId,
    },
    orderBy: {
      displayOrder: "asc",
    },
  });

  // If no settings exist, create defaults for the main document types
  if (settings.length === 0) {
    const defaultSettings = [
      {
        organizationId: user.organizationId,
        documentType: DocumentType.INVOICE,
        displayName: "Invoice",
        enabled: true,
        displayOrder: 1,
      },
      {
        organizationId: user.organizationId,
        documentType: DocumentType.QUOTE,
        displayName: "Quote",
        enabled: true,
        displayOrder: 2,
      },
      {
        organizationId: user.organizationId,
        documentType: DocumentType.ORDER,
        displayName: "Order",
        enabled: true,
        displayOrder: 3,
      },
    ];

    const createdSettings = await prisma.documentTypeSetting.createMany({
      data: defaultSettings,
    });

    return await prisma.documentTypeSetting.findMany({
      where: {
        organizationId: user.organizationId,
      },
      orderBy: {
        displayOrder: "asc",
      },
    });
  }

  return settings;
}

export async function getEnabledDocumentTypes() {
  const { userId } = await auth();
  if (!userId) {
    return [];
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    return [];
  }

  const settings = await prisma.documentTypeSetting.findMany({
    where: {
      organizationId: user.organizationId,
      enabled: true,
    },
    orderBy: {
      displayOrder: "asc",
    },
  });

  // If no settings exist yet, return defaults
  if (settings.length === 0) {
    return [
      { documentType: DocumentType.INVOICE, displayName: "Invoice", displayOrder: 1 },
      { documentType: DocumentType.QUOTE, displayName: "Quote", displayOrder: 2 },
      { documentType: DocumentType.ORDER, displayName: "Order", displayOrder: 3 },
    ];
  }

  return settings;
}

export async function updateDocumentTypeSetting(
  documentType: DocumentType,
  data: {
    enabled?: boolean;
    displayName?: string;
    displayOrder?: number;
  }
) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  // Find or create the setting
  const existing = await prisma.documentTypeSetting.findUnique({
    where: {
      organizationId_documentType: {
        organizationId: user.organizationId,
        documentType,
      },
    },
  });

  let setting;
  if (existing) {
    setting = await prisma.documentTypeSetting.update({
      where: {
        id: existing.id,
      },
      data,
    });
  } else {
    setting = await prisma.documentTypeSetting.create({
      data: {
        organizationId: user.organizationId,
        documentType,
        enabled: data.enabled ?? true,
        displayName: data.displayName ?? documentType,
        displayOrder: data.displayOrder ?? 0,
      },
    });
  }

  revalidatePath("/dashboard/documents");
  revalidatePath("/dashboard/administration/document-types");

  return setting;
}

export async function updateDocumentTypeSettings(
  settings: Array<{
    documentType: DocumentType;
    enabled: boolean;
    displayName: string;
    displayOrder: number;
  }>
) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  // Update or create each setting
  const promises = settings.map(async (setting) => {
    return await prisma.documentTypeSetting.upsert({
      where: {
        organizationId_documentType: {
          organizationId: user.organizationId,
          documentType: setting.documentType,
        },
      },
      update: {
        enabled: setting.enabled,
        displayName: setting.displayName,
        displayOrder: setting.displayOrder,
      },
      create: {
        organizationId: user.organizationId,
        documentType: setting.documentType,
        enabled: setting.enabled,
        displayName: setting.displayName,
        displayOrder: setting.displayOrder,
      },
    });
  });

  await Promise.all(promises);

  revalidatePath("/dashboard/documents");
  revalidatePath("/dashboard/administration/document-types");

  return { success: true };
}
