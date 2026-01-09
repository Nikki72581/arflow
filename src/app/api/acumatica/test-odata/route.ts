/**
 * Diagnostic endpoint to test OData connectivity
 * This helps debug Generic Inquiry discovery issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createAuthenticatedClient } from '@/lib/acumatica/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { integrationId } = await request.json();

    if (!integrationId) {
      return NextResponse.json(
        { error: 'Integration ID is required' },
        { status: 400 }
      );
    }

    const integration = await prisma.acumaticaIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || integration.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    const client = await createAuthenticatedClient(integration);

    const results = {
      timestamp: new Date().toISOString(),
      instanceUrl: integration.instanceUrl,
      apiVersion: integration.apiVersion,
      endpoints: [] as Array<{
        url: string;
        status: number;
        statusText: string;
        success: boolean;
        contentPreview?: string;
        contentLength?: number;
        entitySetsFound?: string[];
        entitySetCount?: number;
        error?: string;
      }>,
    };

    // Test different OData endpoints
    const endpointsToTest = [
      '/api/odata/gi/$metadata',
      '/odata/$metadata',
      '/odatav4/$metadata',
    ];

    for (const endpoint of endpointsToTest) {
      try {
        console.log(`[OData Test] Testing endpoint: ${endpoint}`);
        console.log(`[OData Test] Full URL will be: ${integration.instanceUrl}${endpoint}`);

        const response = await client.makeRequest('GET', endpoint);

        const contentText = await response.text();
        console.log(`[OData Test] Response content type: ${response.headers.get('content-type')}`);

        // Check if response is HTML instead of XML
        const isHtml = contentText.trim().toLowerCase().startsWith('<!doctype html') ||
                       contentText.trim().toLowerCase().startsWith('<html');

        // Parse EntitySet names from the metadata (only if it's XML)
        const entitySetRegex = /<EntitySet Name="([^"]+)"/g;
        const entitySets: string[] = [];
        let match;

        if (!isHtml) {
          while ((match = entitySetRegex.exec(contentText)) !== null) {
            entitySets.push(match[1]);
          }
        }

        results.endpoints.push({
          url: endpoint,
          status: response.status,
          statusText: response.statusText,
          success: response.ok && !isHtml,
          contentLength: contentText.length,
          contentPreview: contentText.substring(0, 1000),
          entitySetsFound: entitySets,
          entitySetCount: entitySets.length,
          error: isHtml ? 'Received HTML instead of XML metadata (possible authentication issue or endpoint not found)' : undefined,
        });

        console.log(`[OData Test] ${endpoint} - Status: ${response.status}, Length: ${contentText.length}, EntitySets: ${entitySets.length}`);
        if (entitySets.length > 0) {
          console.log(`[OData Test] EntitySets found: ${entitySets.join(', ')}`);
        }
      } catch (error) {
        console.error(`[OData Test] Error testing ${endpoint}:`, error);
        results.endpoints.push({
          url: endpoint,
          status: 0,
          statusText: 'Error',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    await client.logout();

    return NextResponse.json(results);
  } catch (error) {
    console.error('[OData Test] Unexpected error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
