import { AcumaticaConnectionConfig, AcumaticaCompany } from './types';
import { decryptPasswordCredentials, decryptOAuthCredentials } from './encryption';
import { createAcumaticaClient } from './client';
import type { AcumaticaIntegration } from '@prisma/client';

/**
 * Create an Acumatica client from integration configuration
 */
export async function createAuthenticatedClient(
  integration: AcumaticaIntegration
): Promise<ReturnType<typeof createAcumaticaClient>> {
  // Decrypt credentials
  const credentials = decryptPasswordCredentials(integration.encryptedCredentials);

  const config: AcumaticaConnectionConfig = {
    instanceUrl: integration.instanceUrl,
    apiVersion: integration.apiVersion,
    companyId: integration.companyId,
    credentials: {
      type: 'password',
      username: credentials.username,
      password: credentials.password,
    },
  };

  const client = createAcumaticaClient(config);

  // Authenticate
  await client.authenticate();

  return client;
}

/**
 * List available companies (tenants) from Acumatica instance
 */
export async function listAvailableCompanies(
  instanceUrl: string,
  apiVersion: string,
  username: string,
  password: string
): Promise<{ success: boolean; companies?: AcumaticaCompany[]; error?: string }> {
  console.log('[Auth] listAvailableCompanies called with:', {
    instanceUrl,
    apiVersion,
    username,
  });

  const client = createAcumaticaClient({
    instanceUrl,
    apiVersion,
    companyId: '', // Not needed for listing companies
    credentials: {
      type: 'password',
      username,
      password,
    },
  });

  try {
    console.log('[Auth] Fetching available companies...');
    const companies = await client.listCompanies();
    console.log('[Auth] Companies retrieved:', companies.length);

    return { success: true, companies };
  } catch (error) {
    console.error('[Auth] Failed to list companies:', error);

    if (error instanceof Error) {
      console.error('[Auth] Error details:', {
        name: error.name,
        message: error.message,
      });
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve companies',
    };
  } finally {
    // CRITICAL: Always logout to clean up the session, even if there was an error
    try {
      console.log('[Auth] Attempting logout to clean up session...');
      await client.logout();
      console.log('[Auth] Logged out successfully');
    } catch (logoutError) {
      console.error('[Auth] Failed to logout (session may remain open):', logoutError);
    }
  }
}

/**
 * Test connection with provided credentials without saving
 */
export async function testConnection(
  instanceUrl: string,
  apiVersion: string,
  companyId: string,
  username: string,
  password: string
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  console.log('[Auth] testConnection called with:', {
    instanceUrl,
    apiVersion,
    companyId,
    username,
  });

  const client = createAcumaticaClient({
    instanceUrl,
    apiVersion,
    companyId,
    credentials: {
      type: 'password',
      username,
      password,
    },
  });

  try {
    console.log('[Auth] Testing connection...');
    await client.testConnection();
    console.log('[Auth] Connection test successful');

    return { success: true };
  } catch (error) {
    console.error('[Auth] Connection test failed:', error);

    // Preserve detailed error information
    if (error instanceof Error) {
      console.error('[Auth] Error name:', error.name);
      console.error('[Auth] Error message:', error.message);
      console.error('[Auth] Error stack:', error.stack);
    }

    // Check if it's an AcumaticaAPIError with additional details
    const statusCode = (error as any).statusCode;
    const response = (error as any).response;

    if (statusCode || response) {
      console.error('[Auth] API Error details:', {
        statusCode,
        response: JSON.stringify(response),
      });
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      statusCode: statusCode,
    };
  } finally {
    // CRITICAL: Always logout to clean up the session, even if there was an error
    try {
      console.log('[Auth] Attempting logout to clean up session...');
      await client.logout();
      console.log('[Auth] Logged out successfully');
    } catch (logoutError) {
      console.error('[Auth] Failed to logout (session may remain open):', logoutError);
    }
  }
}
