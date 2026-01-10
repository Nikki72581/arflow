"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getPaymentTermTypes() {
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

  const terms = await prisma.paymentTermType.findMany({
    where: {
      organizationId: user.organizationId,
    },
    orderBy: {
      displayOrder: "asc",
    },
  });

  // Create defaults if none exist
  if (terms.length === 0) {
    const defaults = [
      {
        organizationId: user.organizationId,
        name: "Net 30",
        code: "NET_30",
        description: "Payment due within 30 days",
        daysDue: 30,
        hasDiscount: false,
        enabled: true,
        displayOrder: 1,
        isDefault: true,
      },
      {
        organizationId: user.organizationId,
        name: "Net 15",
        code: "NET_15",
        description: "Payment due within 15 days",
        daysDue: 15,
        hasDiscount: false,
        enabled: true,
        displayOrder: 2,
        isDefault: false,
      },
      {
        organizationId: user.organizationId,
        name: "2% 10 Net 30",
        code: "2_10_NET_30",
        description: "2% discount if paid within 10 days, otherwise net 30",
        daysDue: 30,
        hasDiscount: true,
        discountDays: 10,
        discountPercentage: 2.0,
        enabled: true,
        displayOrder: 3,
        isDefault: false,
      },
    ];

    await prisma.paymentTermType.createMany({ data: defaults });

    return await prisma.paymentTermType.findMany({
      where: {
        organizationId: user.organizationId,
      },
      orderBy: {
        displayOrder: "asc",
      },
    });
  }

  return terms;
}

export async function getEnabledPaymentTermTypes() {
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

  return await prisma.paymentTermType.findMany({
    where: {
      organizationId: user.organizationId,
      enabled: true,
    },
    orderBy: {
      displayOrder: "asc",
    },
  });
}

export async function upsertPaymentTermType(data: {
  id?: string;
  name: string;
  code: string;
  description?: string;
  daysDue: number;
  hasDiscount: boolean;
  discountDays?: number | null;
  discountPercentage?: number | null;
  enabled: boolean;
  displayOrder: number;
  isDefault: boolean;
}) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || user.role !== "ADMIN") {
    throw new Error("Unauthorized - Admin access required");
  }

  // Validate discount fields
  if (data.hasDiscount) {
    if (!data.discountDays || !data.discountPercentage) {
      throw new Error("Discount days and percentage are required when discount is enabled");
    }
    if (data.discountDays >= data.daysDue) {
      throw new Error("Discount days must be less than payment due days");
    }
    if (data.discountPercentage <= 0 || data.discountPercentage > 100) {
      throw new Error("Discount percentage must be between 0 and 100");
    }
  }

  // If setting as default, unset other defaults first
  if (data.isDefault) {
    await prisma.paymentTermType.updateMany({
      where: {
        organizationId: user.organizationId,
        ...(data.id && { id: { not: data.id } }),
      },
      data: { isDefault: false },
    });
  }

  let term;
  if (data.id) {
    // Update existing
    term = await prisma.paymentTermType.update({
      where: { id: data.id },
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        daysDue: data.daysDue,
        hasDiscount: data.hasDiscount,
        discountDays: data.hasDiscount ? data.discountDays : null,
        discountPercentage: data.hasDiscount ? data.discountPercentage : null,
        enabled: data.enabled,
        displayOrder: data.displayOrder,
        isDefault: data.isDefault,
      },
    });
  } else {
    // Create new
    term = await prisma.paymentTermType.create({
      data: {
        organizationId: user.organizationId,
        name: data.name,
        code: data.code,
        description: data.description,
        daysDue: data.daysDue,
        hasDiscount: data.hasDiscount,
        discountDays: data.hasDiscount ? data.discountDays : null,
        discountPercentage: data.hasDiscount ? data.discountPercentage : null,
        enabled: data.enabled,
        displayOrder: data.displayOrder,
        isDefault: data.isDefault,
      },
    });
  }

  revalidatePath("/dashboard/administration/payment-terms");
  revalidatePath("/dashboard/clients");

  return { success: true, data: term };
}

export async function deletePaymentTermType(id: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || user.role !== "ADMIN") {
    throw new Error("Unauthorized - Admin access required");
  }

  // Check if term is in use by any customers
  const customersUsingTerm = await prisma.customer.count({
    where: { paymentTermId: id },
  });

  if (customersUsingTerm > 0) {
    throw new Error(
      `Cannot delete payment term: ${customersUsingTerm} customer(s) are currently using it`
    );
  }

  await prisma.paymentTermType.delete({ where: { id } });

  revalidatePath("/dashboard/administration/payment-terms");
  revalidatePath("/dashboard/clients");

  return { success: true };
}
