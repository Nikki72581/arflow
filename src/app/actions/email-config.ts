"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getEmailConfigStatus as getEmailStatus } from "@/lib/email";

/**
 * Get email configuration status (admin only)
 */
export async function getEmailConfigStatus(): Promise<{
  success: boolean;
  error?: string;
  data?: {
    configured: boolean;
    apiKeyPresent: boolean;
    fromEmail: string;
    replyToEmail?: string;
    missingConfig: string[];
  };
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user || user.role !== "ADMIN") {
      return { success: false, error: "Only admins can view email configuration" };
    }

    const status = getEmailStatus();

    return {
      success: true,
      data: status,
    };
  } catch (error: any) {
    console.error("Error getting email config status:", error);
    return { success: false, error: error.message || "Failed to get email configuration status" };
  }
}
