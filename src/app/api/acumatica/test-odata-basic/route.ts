/**
 * Test OData with Basic Authentication
 * Some Acumatica versions require Basic Auth for OData instead of session cookies
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { decryptPasswordCredentials } from '@/lib/acumatica/encryption';

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

    // Decrypt credentials
    const { username, password } = decryptPasswordCredentials(integration.encryptedCredentials);

    // Create Basic Auth header
    const authString = Buffer.from(`${username}:${password}`).toString('base64');

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
        authMethod: string;
      }>,
    };

    const endpointsToTest = [
      '/api/odata/gi/$metadata',
      '/odata/$metadata',
      '/odatav4/$metadata',
    ];

    for (const endpoint of endpointsToTest) {
      try {
        const url = `${integration.instanceUrl}${endpoint}`;
        console.log(`[OData Basic Auth Test] Testing: ${url}`);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${authString}`,
            'Accept': 'application/xml',
          },
        });

        const contentText = await response.text();
        console.log(`[OData Basic Auth Test] ${endpoint} - Status: ${response.status}`);
        console.log(`[OData Basic Auth Test] Content-Type: ${response.headers.get('content-type')}`);

        // Check if response is HTML instead of XML
        const isHtml = contentText.trim().toLowerCase().startsWith('<!doctype html') ||
                       contentText.trim().toLowerCase().startsWith('<html');

        // Parse EntitySet names
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
          authMethod: 'Basic Authentication',
          error: isHtml ? 'Received HTML instead of XML' : undefined,
        });

        if (entitySets.length > 0) {
          console.log(`[OData Basic Auth Test] Found ${entitySets.length} EntitySets: ${entitySets.join(', ')}`);
        }
      } catch (error) {
        console.error(`[OData Basic Auth Test] Error testing ${endpoint}:`, error);
        results.endpoints.push({
          url: endpoint,
          status: 0,
          statusText: 'Error',
          success: false,
          authMethod: 'Basic Authentication',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('[OData Basic Auth Test] Unexpected error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
