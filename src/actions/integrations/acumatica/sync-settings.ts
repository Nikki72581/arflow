'use server';

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export interface SyncSettingsData {
  // Date Range Filtering
  invoiceStartDate: string;
  invoiceEndDate: string | null;

  // Branch Filtering
  branchFilterMode: 'ALL' | 'SELECTED';
  selectedBranches?: string[];

  // Document Type Filtering
  includeInvoices: boolean;
  includeCreditMemos: boolean;
  includeDebitMemos: boolean;

  // Customer Handling
  customerHandling: 'AUTO_CREATE' | 'SKIP';
  customerIdSource: 'CUSTOMER_CD' | 'BACCOUNT_ID';

  // Project Handling
  projectAutoCreate: boolean;
  noProjectHandling: 'NO_PROJECT' | 'DEFAULT_PROJECT';

  // Invoice Import Settings
  importLevel: 'INVOICE_TOTAL' | 'LINE_LEVEL';
  invoiceAmountField: 'DOC_TOTAL' | 'AMOUNT' | 'LINES_TOTAL';
  lineAmountField: 'EXTENDED_PRICE' | 'AMOUNT';
  lineFilterMode: 'ALL' | 'ITEM_CLASS' | 'GL_ACCOUNT';
  lineFilterValues?: string[];

  // Additional Line Data Storage
  storeItemId: boolean;
  storeItemDescription: boolean;
  storeItemClass: boolean;
  storeGLAccount: boolean;
  storeQtyAndPrice: boolean;

  // Sync Schedule
  syncFrequency: 'MANUAL' | 'HOURLY' | 'DAILY' | 'WEEKLY';
  syncTime?: string | null;
  syncDayOfWeek?: number | null;
}

/**
 * Get the current sync settings for the organization's Acumatica integration
 */
export async function getSyncSettings() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get user and organization from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return { success: false, error: 'Organization not found' };
    }

    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { organizationId: user.organizationId },
      select: {
        invoiceStartDate: true,
        invoiceEndDate: true,
        branchFilterMode: true,
        selectedBranches: true,
        includeInvoices: true,
        includeCreditMemos: true,
        includeDebitMemos: true,
        customerHandling: true,
        customerIdSource: true,
        projectAutoCreate: true,
        noProjectHandling: true,
        importLevel: true,
        invoiceAmountField: true,
        lineAmountField: true,
        lineFilterMode: true,
        lineFilterValues: true,
        storeItemId: true,
        storeItemDescription: true,
        storeItemClass: true,
        storeGLAccount: true,
        storeQtyAndPrice: true,
        syncFrequency: true,
        syncTime: true,
        syncDayOfWeek: true,
      },
    });

    if (!integration) {
      // Return default values if integration doesn't exist yet
      return {
        success: true,
        settings: {
          invoiceStartDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
          invoiceEndDate: null,
          branchFilterMode: 'ALL' as const,
          selectedBranches: [],
          includeInvoices: true,
          includeCreditMemos: false,
          includeDebitMemos: false,
          customerHandling: 'AUTO_CREATE' as const,
          customerIdSource: 'CUSTOMER_CD' as const,
          projectAutoCreate: true,
          noProjectHandling: 'NO_PROJECT' as const,
          importLevel: 'INVOICE_TOTAL' as const,
          invoiceAmountField: 'AMOUNT' as const,
          lineAmountField: 'EXTENDED_PRICE' as const,
          lineFilterMode: 'ALL' as const,
          lineFilterValues: [],
          storeItemId: true,
          storeItemDescription: true,
          storeItemClass: false,
          storeGLAccount: false,
          storeQtyAndPrice: false,
          syncFrequency: 'MANUAL' as const,
          syncTime: null,
          syncDayOfWeek: null,
        },
      };
    }

    return {
      success: true,
      settings: {
        invoiceStartDate: integration.invoiceStartDate?.toISOString().split('T')[0] || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        invoiceEndDate: integration.invoiceEndDate?.toISOString().split('T')[0] || null,
        branchFilterMode: (integration.branchFilterMode ?? 'ALL') as 'ALL' | 'SELECTED',
        selectedBranches: (integration.selectedBranches as string[]) || [],
        includeInvoices: integration.includeInvoices ?? true,
        includeCreditMemos: integration.includeCreditMemos ?? false,
        includeDebitMemos: integration.includeDebitMemos ?? false,
        customerHandling: (integration.customerHandling ?? 'AUTO_CREATE') as 'AUTO_CREATE' | 'SKIP',
        customerIdSource: (integration.customerIdSource ?? 'CUSTOMER_CD') as 'CUSTOMER_CD' | 'BACCOUNT_ID',
        projectAutoCreate: integration.projectAutoCreate ?? false,
        noProjectHandling: (integration.noProjectHandling ?? 'NO_PROJECT') as 'NO_PROJECT' | 'DEFAULT_PROJECT',
        importLevel: (integration.importLevel ?? 'INVOICE_TOTAL') as 'INVOICE_TOTAL' | 'LINE_LEVEL',
        invoiceAmountField: (integration.invoiceAmountField ?? 'DOC_TOTAL') as 'DOC_TOTAL' | 'AMOUNT' | 'LINES_TOTAL',
        lineAmountField: (integration.lineAmountField ?? 'EXTENDED_PRICE') as 'EXTENDED_PRICE' | 'AMOUNT',
        lineFilterMode: (integration.lineFilterMode ?? 'ALL') as 'ALL' | 'ITEM_CLASS' | 'GL_ACCOUNT',
        lineFilterValues: (integration.lineFilterValues as string[]) || [],
        storeItemId: integration.storeItemId ?? false,
        storeItemDescription: integration.storeItemDescription ?? false,
        storeItemClass: integration.storeItemClass ?? false,
        storeGLAccount: integration.storeGLAccount ?? false,
        storeQtyAndPrice: integration.storeQtyAndPrice ?? false,
        syncFrequency: (integration.syncFrequency ?? 'MANUAL') as 'MANUAL' | 'HOURLY' | 'DAILY' | 'WEEKLY',
        syncTime: integration.syncTime ?? null,
        syncDayOfWeek: integration.syncDayOfWeek ?? null,
      },
    };
  } catch (error) {
    console.error('[getSyncSettings] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load sync settings',
    };
  }
}

/**
 * Save sync settings for the organization's Acumatica integration
 */
export async function saveSyncSettings(data: SyncSettingsData) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get user and organization from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return { success: false, error: 'Organization not found' };
    }

    // Validate required fields
    if (!data.invoiceStartDate) {
      return { success: false, error: 'Invoice start date is required' };
    }

    // Validate at least one document type is selected
    if (!data.includeInvoices && !data.includeCreditMemos && !data.includeDebitMemos) {
      return { success: false, error: 'At least one document type must be selected' };
    }

    // Validate branch selection
    if (data.branchFilterMode === 'SELECTED' && (!data.selectedBranches || data.selectedBranches.length === 0)) {
      return { success: false, error: 'At least one branch must be selected when using branch filtering' };
    }

    // Validate line filter values
    if ((data.lineFilterMode === 'ITEM_CLASS' || data.lineFilterMode === 'GL_ACCOUNT') && (!data.lineFilterValues || data.lineFilterValues.length === 0)) {
      return { success: false, error: 'At least one filter value must be provided when using item class or GL account filtering' };
    }

    // Validate sync schedule
    if (data.syncFrequency === 'DAILY' && !data.syncTime) {
      return { success: false, error: 'Sync time is required for daily sync' };
    }
    if (data.syncFrequency === 'WEEKLY' && (data.syncDayOfWeek === null || data.syncDayOfWeek === undefined)) {
      return { success: false, error: 'Sync day is required for weekly sync' };
    }

    // Update the integration
    await prisma.acumaticaIntegration.update({
      where: { organizationId: user.organizationId },
      data: {
        invoiceStartDate: new Date(data.invoiceStartDate),
        invoiceEndDate: data.invoiceEndDate ? new Date(data.invoiceEndDate) : null,
        branchFilterMode: data.branchFilterMode,
        selectedBranches: data.branchFilterMode === 'SELECTED' ? data.selectedBranches || [] : [],
        includeInvoices: data.includeInvoices,
        includeCreditMemos: data.includeCreditMemos,
        includeDebitMemos: data.includeDebitMemos,
        customerHandling: data.customerHandling,
        customerIdSource: data.customerIdSource,
        projectAutoCreate: data.projectAutoCreate,
        noProjectHandling: data.noProjectHandling,
        importLevel: data.importLevel,
        invoiceAmountField: data.invoiceAmountField,
        lineAmountField: data.lineAmountField,
        lineFilterMode: data.lineFilterMode,
        lineFilterValues: data.lineFilterMode !== 'ALL' ? data.lineFilterValues || [] : [],
        storeItemId: data.storeItemId,
        storeItemDescription: data.storeItemDescription,
        storeItemClass: data.storeItemClass,
        storeGLAccount: data.storeGLAccount,
        storeQtyAndPrice: data.storeQtyAndPrice,
        syncFrequency: data.syncFrequency,
        syncTime: data.syncFrequency === 'DAILY' || data.syncFrequency === 'WEEKLY' ? data.syncTime : null,
        syncDayOfWeek: data.syncFrequency === 'WEEKLY' ? data.syncDayOfWeek : null,
        updatedAt: new Date(),
      },
    });

    revalidatePath('/dashboard/integrations/acumatica');
    revalidatePath('/dashboard/integrations/acumatica/setup/sync-settings');

    return { success: true };
  } catch (error) {
    console.error('[saveSyncSettings] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save sync settings',
    };
  }
}
