"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { DocumentType, DocumentStatus } from "@prisma/client";

export async function getDocuments({
  page = 1,
  pageSize = 25,
  documentType,
  status,
  customerId,
  search,
}: {
  page?: number;
  pageSize?: number;
  documentType?: DocumentType;
  status?: DocumentStatus;
  customerId?: string;
  search?: string;
}) {
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

  const skip = (page - 1) * pageSize;

  const where: any = {
    organizationId: user.organizationId,
  };

  if (documentType) {
    where.documentType = documentType;
  }

  if (status) {
    where.status = status;
  }

  if (customerId) {
    where.customerId = customerId;
  }

  if (search) {
    where.OR = [
      { documentNumber: { contains: search, mode: "insensitive" } },
      { referenceNumber: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      {
        customer: {
          companyName: { contains: search, mode: "insensitive" },
        },
      },
    ];
  }

  const [documents, total] = await Promise.all([
    prisma.arDocument.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            customerNumber: true,
          },
        },
      },
      orderBy: {
        documentDate: "desc",
      },
      skip,
      take: pageSize,
    }),
    prisma.arDocument.count({ where }),
  ]);

  return {
    documents,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getDocument(id: string) {
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

  const document = await prisma.arDocument.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    include: {
      customer: true,
      paymentApplications: {
        include: {
          payment: true,
        },
      },
    },
  });

  return document;
}

export async function getDocumentTypeCounts() {
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

  const counts = await prisma.arDocument.groupBy({
    by: ["documentType"],
    where: {
      organizationId: user.organizationId,
    },
    _count: {
      id: true,
    },
  });

  return counts.reduce(
    (acc, item) => {
      acc[item.documentType] = item._count.id;
      return acc;
    },
    {} as Record<DocumentType, number>
  );
}

export async function createDocument(data: {
  customerId: string;
  documentType: DocumentType;
  documentNumber: string;
  referenceNumber?: string;
  documentDate: Date;
  dueDate?: Date;
  subtotal: number;
  taxAmount?: number;
  totalAmount: number;
  description?: string;
  notes?: string;
  customerNotes?: string;
}) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user || user.role !== "ADMIN") {
      return { success: false, error: "Only admins can create documents" };
    }

    // Fetch customer with payment term to auto-calculate due date and discounts
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
      include: { paymentTerm: true },
    });

    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    // Calculate due date and discount info from payment term
    let calculatedDueDate = data.dueDate;
    let earlyPaymentDeadline: Date | undefined;
    let discountPercentage: number | undefined;
    let discountAvailable: number | undefined;
    let paymentTermSnapshot: any = null;

    if (customer.paymentTerm && !data.dueDate) {
      const term = customer.paymentTerm;

      // Calculate due date
      calculatedDueDate = new Date(data.documentDate);
      calculatedDueDate.setDate(calculatedDueDate.getDate() + term.daysDue);

      // Calculate discount info if applicable
      if (term.hasDiscount && term.discountDays && term.discountPercentage) {
        earlyPaymentDeadline = new Date(data.documentDate);
        earlyPaymentDeadline.setDate(
          earlyPaymentDeadline.getDate() + term.discountDays
        );
        discountPercentage = term.discountPercentage;
        discountAvailable = (data.totalAmount * term.discountPercentage) / 100;
      }

      // Store payment term snapshot for audit trail
      paymentTermSnapshot = {
        id: term.id,
        name: term.name,
        code: term.code,
        daysDue: term.daysDue,
        hasDiscount: term.hasDiscount,
        discountDays: term.discountDays,
        discountPercentage: term.discountPercentage,
      };
    }

    const document = await prisma.arDocument.create({
      data: {
        organizationId: user.organizationId,
        customerId: data.customerId,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        referenceNumber: data.referenceNumber,
        documentDate: data.documentDate,
        dueDate: calculatedDueDate,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount || 0,
        totalAmount: data.totalAmount,
        balanceDue: data.totalAmount,
        description: data.description,
        notes: data.notes,
        customerNotes: data.customerNotes,
        sourceType: "MANUAL",
        status: "OPEN",
        // Payment term tracking
        paymentTermId: customer.paymentTermId,
        appliedPaymentTerm: paymentTermSnapshot,
        earlyPaymentDeadline,
        discountPercentage,
        discountAvailable,
        discountTaken: 0,
        hasPaymentSchedule: false,
      },
      include: {
        customer: true,
      },
    });

    revalidatePath("/dashboard/documents");
    revalidatePath(`/dashboard/clients/${data.customerId}`);

    return {
      success: true,
      data: document,
      message: "Document created successfully",
    };
  } catch (error: any) {
    console.error("Error creating document:", error);
    return { success: false, error: error.message || "Failed to create document" };
  }
}

export async function updateDocument(
  id: string,
  data: {
    referenceNumber?: string;
    dueDate?: Date;
    description?: string;
    notes?: string;
    customerNotes?: string;
    status?: DocumentStatus;
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

  const document = await prisma.arDocument.update({
    where: {
      id,
      organizationId: user.organizationId,
    },
    data,
    include: {
      customer: true,
    },
  });

  revalidatePath("/dashboard/documents");
  revalidatePath(`/dashboard/clients/${document.customerId}`);
  revalidatePath(`/dashboard/documents/${id}`);

  return document;
}

export async function deleteDocument(id: string) {
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

  const document = await prisma.arDocument.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
  });

  if (!document) {
    throw new Error("Document not found");
  }

  // Only allow deletion of manual documents
  if (document.sourceType !== "MANUAL") {
    throw new Error(
      "Cannot delete documents created from integrations. Please delete from the source system."
    );
  }

  await prisma.arDocument.delete({
    where: { id },
  });

  revalidatePath("/dashboard/documents");
  revalidatePath(`/dashboard/clients/${document.customerId}`);

  return { success: true };
}
