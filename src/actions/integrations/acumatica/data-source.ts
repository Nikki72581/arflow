/**
 * Acumatica Data Source Discovery Actions
 *
 * Server actions for discovering and selecting data sources
 * (REST API entities, Generic Inquiries, etc.)
 */

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { UserRole, DataSourceType } from "@prisma/client";
import { createAuthenticatedClient } from "@/lib/acumatica/auth";
import { SchemaDiscoveryService } from "@/lib/acumatica/schema-discovery";
import { EntityInfo, InquiryInfo, DiscoveredSchema } from "@/lib/acumatica/config-types";
import { revalidatePath } from "next/cache";

/**
 * Discover available REST API entities
 */
export async function discoverRestApiEntities(integrationId: string): Promise<EntityInfo[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    throw new Error("Only administrators can discover data sources");
  }

  try {
    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || integration.organizationId !== user.organizationId) {
      throw new Error("Integration not found");
    }

    const client = await createAuthenticatedClient(integration);

    try {
      return await SchemaDiscoveryService.discoverRestApiEntities(client);
    } finally {
      await client.logout();
    }
  } catch (error) {
    console.error("[Discover REST API Entities] Error:", error);
    throw error;
  }
}

/**
 * Discover available Generic Inquiries
 */
export async function discoverGenericInquiries(integrationId: string): Promise<InquiryInfo[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    throw new Error("Only administrators can discover data sources");
  }

  try {
    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || integration.organizationId !== user.organizationId) {
      throw new Error("Integration not found");
    }

    const client = await createAuthenticatedClient(integration);

    try {
      const inquiries = await SchemaDiscoveryService.discoverGenericInquiries(client);

      if (inquiries.length === 0) {
        console.warn(
          "[Discover Generic Inquiries] No Generic Inquiries found. " +
          "Please ensure Generic Inquiry OData is enabled and at least one Generic Inquiry is published."
        );
      } else {
        console.log(`[Discover Generic Inquiries] Found ${inquiries.length} Generic Inquiries`);
      }

      return inquiries;
    } finally {
      await client.logout();
    }
  } catch (error) {
    console.error("[Discover Generic Inquiries] Error:", error);

    // Provide helpful error message based on the error type
    if (error instanceof Error) {
      // Log the full error for debugging
      console.error("[Discover Generic Inquiries] Full error details:", {
        message: error.message,
        stack: error.stack,
      });
    }

    // Return empty array on error (GI might not be configured)
    // The UI will handle displaying appropriate messages to the user
    return [];
  }
}

/**
 * Select a data source and fetch its schema
 */
export async function selectDataSource(
  integrationId: string,
  dataSourceType: DataSourceType,
  entityName: string
): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    throw new Error("Only administrators can configure data sources");
  }

  try {
    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || integration.organizationId !== user.organizationId) {
      throw new Error("Integration not found");
    }

    const client = await createAuthenticatedClient(integration);

    try {
      // Build the discovered schema
      const schema = await SchemaDiscoveryService.buildDiscoveredSchema(
        client,
        dataSourceType,
        entityName
      );

      // Fetch sample data to enrich schema with examples
      const sampleData = await SchemaDiscoveryService.getSampleData(
        client,
        { type: dataSourceType, entity: entityName },
        5
      );

      // Enrich fields with sample values
      const enrichedSchema = {
        ...schema,
        fields: SchemaDiscoveryService.enrichFieldsWithSamples(schema.fields, sampleData),
      };

      // Update the integration
      await prisma.acumaticaIntegration.update({
        where: { id: integrationId },
        data: {
          dataSourceType,
          dataSourceEntity: entityName,
          dataSourceEndpoint: schema.endpoint,
          discoveredSchema: enrichedSchema as any,
          schemaLastUpdated: new Date(),
        },
      });

      revalidatePath("/dashboard/integrations/acumatica/setup");
    } finally {
      await client.logout();
    }
  } catch (error) {
    console.error("[Select Data Source] Error:", error);
    throw error;
  }
}

/**
 * Refresh the schema for the current data source
 */
export async function refreshSchema(integrationId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    throw new Error("Only administrators can refresh schemas");
  }

  try {
    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || integration.organizationId !== user.organizationId) {
      throw new Error("Integration not found");
    }

    if (!integration.dataSourceType || !integration.dataSourceEntity) {
      throw new Error("No data source selected");
    }

    // Re-select the same data source to refresh the schema
    await selectDataSource(
      integrationId,
      integration.dataSourceType,
      integration.dataSourceEntity
    );
  } catch (error) {
    console.error("[Refresh Schema] Error:", error);
    throw error;
  }
}

/**
 * Get the discovered schema for an integration
 */
export async function getDiscoveredSchema(integrationId: string): Promise<DiscoveredSchema | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    throw new Error("Only administrators can view schemas");
  }

  const integration = await prisma.acumaticaIntegration.findUnique({
    where: { id: integrationId },
    select: {
      organizationId: true,
      discoveredSchema: true,
      schemaLastUpdated: true,
    },
  });

  if (!integration || integration.organizationId !== user.organizationId) {
    throw new Error("Integration not found");
  }

  return integration.discoveredSchema as DiscoveredSchema | null;
}

/**
 * Get current data source configuration
 */
export async function getDataSourceConfig(integrationId: string): Promise<{
  dataSourceType: DataSourceType;
  dataSourceEntity: string;
  dataSourceEndpoint: string | null;
  schemaLastUpdated: Date | null;
} | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    throw new Error("Only administrators can view data source configuration");
  }

  const integration = await prisma.acumaticaIntegration.findUnique({
    where: { id: integrationId },
    select: {
      organizationId: true,
      dataSourceType: true,
      dataSourceEntity: true,
      dataSourceEndpoint: true,
      schemaLastUpdated: true,
    },
  });

  if (!integration || integration.organizationId !== user.organizationId) {
    throw new Error("Integration not found");
  }

  if (!integration.dataSourceEntity) {
    return null;
  }

  return {
    dataSourceType: integration.dataSourceType,
    dataSourceEntity: integration.dataSourceEntity,
    dataSourceEndpoint: integration.dataSourceEndpoint,
    schemaLastUpdated: integration.schemaLastUpdated,
  };
}
