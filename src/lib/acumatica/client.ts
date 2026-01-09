import {
  AcumaticaConnectionConfig,
  AcumaticaInvoice,
  AcumaticaSalesperson,
  AcumaticaBranch,
  AcumaticaItemClass,
  AcumaticaCustomer,
  AcumaticaProject,
  AcumaticaCompany,
  AcumaticaErrorResponse,
  InvoiceQueryFilters,
} from './types';

/**
 * Acumatica API Client
 *
 * IMPORTANT: This integration was developed and tested against Acumatica version 2025 R1 (25.101.0153.5).
 * Other versions may have different data structures, available fields, or API behaviors.
 *
 * Known version-specific considerations:
 * - Email field availability on Salesperson endpoint may vary
 * - IsActive field filtering support may differ
 * - OData query capabilities may change between versions
 * - Field names and data structures may be modified in different releases
 *
 * If connecting to a different Acumatica version, verify:
 * 1. Available fields on each endpoint (Salesperson, SalesInvoice, Customer, etc.)
 * 2. OData filter and select query support
 * 3. Authentication and session management behavior
 * 4. Response data structures match expected types
 */

export class AcumaticaAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: AcumaticaErrorResponse
  ) {
    super(message);
    this.name = 'AcumaticaAPIError';
  }
}

export class AcumaticaClient {
  private config: AcumaticaConnectionConfig;
  private baseUrl: string;
  private cookies: string[] = [];
  public readonly apiVersion: string;
  public readonly instanceUrl: string;

  constructor(config: AcumaticaConnectionConfig) {
    this.config = config;
    this.apiVersion = config.apiVersion;
    // Ensure instanceUrl doesn't have trailing slash
    const instanceUrl = config.instanceUrl.replace(/\/$/, '');
    this.instanceUrl = instanceUrl;
    this.baseUrl = `${instanceUrl}/entity/Default/${config.apiVersion}`;
  }

  /**
   * Build full URL for an endpoint
   */
  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    let url = `${this.baseUrl}/${endpoint}`;

    if (params) {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
      url += `?${queryString}`;
    }

    return url;
  }

  /**
   * Authenticate with Acumatica using cookie-based session authentication
   */
  async authenticate(): Promise<void> {
    if (this.config.credentials.type !== 'password') {
      throw new Error('Only password authentication is currently supported');
    }

    const { username, password } = this.config.credentials;
    const loginUrl = `${this.config.instanceUrl}/entity/auth/login`;

    try {
      console.log('[Acumatica Client] Attempting session login...');
      console.log('[Acumatica Client] Login URL:', loginUrl);
      console.log('[Acumatica Client] Username:', username);
      console.log('[Acumatica Client] Company ID:', this.config.companyId);

      const loginResponse = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: username,
          password: password,
          company: this.config.companyId,
        }),
      });

      console.log('[Acumatica Client] Login response status:', loginResponse.status);

      if (!loginResponse.ok) {
        const errorText = await loginResponse.text();
        console.error('[Acumatica Client] Session login failed:', {
          status: loginResponse.status,
          statusText: loginResponse.statusText,
          responseBody: errorText,
        });

        let error: AcumaticaErrorResponse;
        try {
          error = JSON.parse(errorText) as AcumaticaErrorResponse;
        } catch {
          error = { message: errorText || 'Login failed' };
        }

        // Provide helpful error messages based on status code and error details
        let helpMessage = '';
        const exceptionMsg = error.exceptionMessage || '';

        if (exceptionMsg.includes('concurrent API logins')) {
          helpMessage = ' Your user has too many active API sessions. Log out of Acumatica or wait for old sessions to expire, or ask your admin to increase the API login limit in Users (SM201010).';
        } else if (loginResponse.status === 400) {
          helpMessage = ' Possible issues: Wrong username/password, or company ID not found.';
        } else if (loginResponse.status === 401) {
          helpMessage = ' Check username and password are correct.';
        } else if (loginResponse.status === 403) {
          helpMessage = ' User may not have permissions or account is locked.';
        } else if (loginResponse.status === 500 && exceptionMsg) {
          helpMessage = ` ${exceptionMsg}`;
        }

        const displayMessage = error.exceptionMessage || error.message || errorText || 'Authentication failed';

        throw new AcumaticaAPIError(
          `Login failed (${loginResponse.status}): ${displayMessage}.${helpMessage}`,
          loginResponse.status,
          error
        );
      }

      console.log('[Acumatica Client] Session login successful');

      // Store cookies for subsequent requests
      const cookies = loginResponse.headers.get('set-cookie');
      if (cookies) {
        this.cookies = cookies.split(',').map((c) => c.split(';')[0].trim());
        console.log('[Acumatica Client] Cookies stored:', this.cookies.length);
      } else {
        console.warn('[Acumatica Client] No cookies received from login response');
      }
    } catch (error) {
      if (error instanceof AcumaticaAPIError) {
        console.error('[Acumatica Client] AcumaticaAPIError thrown:', error.message);
        throw error;
      }
      console.error('[Acumatica Client] Unexpected authentication error:', error);
      throw new AcumaticaAPIError(
        `Authentication error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Make an authenticated GET request to the API
   */
  private async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(endpoint, params);

    console.log('[Acumatica Client] GET request:', url);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.cookies.length > 0) {
      headers['Cookie'] = this.cookies.join('; ');
      console.log('[Acumatica Client] Using cookies:', this.cookies.length, 'cookies');
    } else {
      console.warn('[Acumatica Client] No cookies available for request');
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    console.log('[Acumatica Client] GET response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Acumatica Client] GET request failed:', {
        url,
        status: response.status,
        statusText: response.statusText,
        responseBody: errorText,
      });

      let error: AcumaticaErrorResponse;
      try {
        error = JSON.parse(errorText) as AcumaticaErrorResponse;
      } catch {
        error = { message: errorText || `API request failed: ${response.statusText}` };
      }

      const errorMessage = error.message || error.exceptionMessage || `API request failed: ${response.statusText}`;
      console.error('[Acumatica Client] Error details:', errorMessage);

      throw new AcumaticaAPIError(
        errorMessage,
        response.status,
        error
      );
    }

    return response.json();
  }

  /**
   * Authenticate without a specific company to list available companies
   */
  async authenticateWithoutCompany(): Promise<void> {
    if (this.config.credentials.type !== 'password') {
      throw new Error('Only password authentication is currently supported');
    }

    const { username, password } = this.config.credentials;
    const loginUrl = `${this.config.instanceUrl}/entity/auth/login`;

    try {
      console.log('[Acumatica Client] Attempting login without company to list available companies...');

      const loginResponse = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: username,
          password: password,
          // Omit company to login to default/list companies
        }),
      });

      console.log('[Acumatica Client] Login response status:', loginResponse.status);

      if (!loginResponse.ok) {
        const errorText = await loginResponse.text();
        console.error('[Acumatica Client] Login without company failed:', {
          status: loginResponse.status,
          statusText: loginResponse.statusText,
          responseBody: errorText,
          responseHeaders: Object.fromEntries(loginResponse.headers.entries()),
        });

        let errorDetails = '';
        try {
          const parsed = JSON.parse(errorText);
          errorDetails = parsed.message || parsed.error || errorText;
        } catch {
          errorDetails = errorText;
        }

        throw new AcumaticaAPIError(
          `Login failed (${loginResponse.status}): ${errorDetails || 'Unable to authenticate without company. Your Acumatica instance may require a company ID to be specified.'}`,
          loginResponse.status
        );
      }

      // Store cookies for subsequent requests
      const cookies = loginResponse.headers.get('set-cookie');
      if (cookies) {
        this.cookies = cookies.split(',').map((c) => c.split(';')[0].trim());
        console.log('[Acumatica Client] Cookies stored:', this.cookies.length);
      }
    } catch (error) {
      if (error instanceof AcumaticaAPIError) {
        throw error;
      }
      throw new AcumaticaAPIError(
        `Authentication error: ${(error as Error).message}`
      );
    }
  }

  /**
   * List available companies (tenants) in the Acumatica instance
   * Note: This may not work on all Acumatica instances as the Company endpoint may not be available
   */
  async listCompanies(): Promise<AcumaticaCompany[]> {
    await this.authenticateWithoutCompany();
    try {
      return await this.get<AcumaticaCompany[]>('Company', {
        $select: 'CompanyID,CompanyName',
      });
    } catch (error) {
      console.error('[Acumatica Client] Company endpoint not available:', error);
      throw new AcumaticaAPIError(
        'Company endpoint not available. This Acumatica instance may not expose company information via API.',
        404
      );
    }
  }

  /**
   * Test the connection by attempting authentication and a simple API call
   */
  async testConnection(): Promise<void> {
    console.log('[Acumatica Client] testConnection: Starting authentication...');
    await this.authenticate();
    console.log('[Acumatica Client] testConnection: Authentication successful');

    // Try to fetch a simple entity to verify API access
    // Using Salesperson as it's commonly available and needed for the integration
    console.log('[Acumatica Client] testConnection: Verifying API access with Salesperson endpoint...');
    try {
      await this.get<AcumaticaSalesperson[]>('Salesperson', {
        $select: 'SalespersonID',
        $top: '1',
      });
      console.log('[Acumatica Client] testConnection: API access verified successfully');
    } catch (error) {
      console.error('[Acumatica Client] testConnection: Failed to access Salesperson endpoint:', error);
      throw new AcumaticaAPIError(
        'Authentication succeeded but API access failed. Verify user has permissions to access Salesperson endpoint.',
        403
      );
    }
  }

  /**
   * Fetch all active salespeople
   */
  async fetchSalespeople(): Promise<AcumaticaSalesperson[]> {
    console.log('[Acumatica Client] fetchSalespeople: Fetching active salespeople...');

    try {
      // Try with Email and IsActive fields first, filtering for active only
      const salespeople = await this.get<AcumaticaSalesperson[]>('Salesperson', {
        $select: 'SalespersonID,Name,Email,IsActive',
        $filter: 'IsActive eq true',
      });

      console.log('[Acumatica Client] fetchSalespeople: Fetched', salespeople.length, 'active salespeople');
      return salespeople;
    } catch (error) {
      console.warn('[Acumatica Client] fetchSalespeople: Failed with Email/IsActive fields, retrying without Email...', error);

      // If that fails (Email field might not be available), try without Email but keep IsActive filter
      try {
        const salespeople = await this.get<AcumaticaSalesperson[]>('Salesperson', {
          $select: 'SalespersonID,Name,IsActive',
          $filter: 'IsActive eq true',
        });

        // Add empty email to match expected type
        return salespeople.map(sp => ({
          ...sp,
          Email: { value: null },
        }));
      } catch (retryError) {
        console.warn('[Acumatica Client] fetchSalespeople: Failed with IsActive filter, trying without filter...', retryError);

        // Last resort: fetch all salespeople without filter and filter locally
        try {
          const allSalespeople = await this.get<AcumaticaSalesperson[]>('Salesperson', {
            $select: 'SalespersonID,Name,IsActive',
          });

          // Filter to active only
          const activeSalespeople = allSalespeople.filter(sp => sp.IsActive?.value === true);

          console.log('[Acumatica Client] fetchSalespeople: Filtered', activeSalespeople.length, 'active from', allSalespeople.length, 'total');

          // Add empty email to match expected type
          return activeSalespeople.map(sp => ({
            ...sp,
            Email: { value: null },
          }));
        } catch (finalError) {
          console.error('[Acumatica Client] fetchSalespeople: All attempts failed:', finalError);
          throw finalError;
        }
      }
    }
  }

  /**
   * Fetch all branches
   */
  async fetchBranches(): Promise<AcumaticaBranch[]> {
    return this.get<AcumaticaBranch[]>('Branch', {
      $select: 'BranchID,BranchName',
    });
  }

  /**
   * Fetch all item classes (for line filtering)
   */
  async fetchItemClasses(): Promise<AcumaticaItemClass[]> {
    return this.get<AcumaticaItemClass[]>('ItemClass', {
      $select: 'ClassID,Description',
    });
  }

  /**
   * Fetch customer by ID
   */
  async fetchCustomer(customerId: string): Promise<AcumaticaCustomer> {
    const results = await this.get<AcumaticaCustomer[]>(`Customer/${customerId}`, {
      $select: 'CustomerID,CustomerName,CustomerCD',
    });

    if (!results || results.length === 0) {
      throw new AcumaticaAPIError(`Customer ${customerId} not found`, 404);
    }

    return results[0];
  }

  /**
   * Fetch project by ID
   */
  async fetchProject(projectId: string): Promise<AcumaticaProject> {
    const results = await this.get<AcumaticaProject[]>(`Project/${projectId}`, {
      $select: 'ProjectID,ProjectCD,Description',
    });

    if (!results || results.length === 0) {
      throw new AcumaticaAPIError(`Project ${projectId} not found`, 404);
    }

    return results[0];
  }

  /**
   * Fetch a single invoice by reference number
   */
  async fetchInvoiceByRef(referenceNbr: string): Promise<AcumaticaInvoice | null> {
    const params: Record<string, string> = {
      $filter: `ReferenceNbr eq '${referenceNbr}'`,
      $expand: 'Details,Commissions,FinancialDetails',
      $top: '1',
    };

    const invoices = await this.get<AcumaticaInvoice[]>('SalesInvoice', params);
    return invoices.length > 0 ? invoices[0] : null;
  }

  /**
   * Fetch invoices with filters
   */
  async fetchInvoices(filters: InvoiceQueryFilters): Promise<AcumaticaInvoice[]> {
    const filterParts: string[] = [];

    // Status filter - only released invoices (Open or Closed)
    filterParts.push("(Status eq 'Open' or Status eq 'Closed')");

    // Date range filter
    const startDateStr = filters.startDate.toISOString();
    filterParts.push(`Date ge datetimeoffset'${startDateStr}'`);

    if (filters.endDate) {
      const endDateStr = filters.endDate.toISOString();
      filterParts.push(`Date le datetimeoffset'${endDateStr}'`);
    }

    // Document type filter
    const docTypes: string[] = [];
    if (filters.includeInvoices) docTypes.push("Type eq 'Invoice'");
    if (filters.includeCreditMemos) docTypes.push("Type eq 'Credit Memo'");
    if (filters.includeDebitMemos) docTypes.push("Type eq 'Debit Memo'");

    if (docTypes.length > 0) {
      filterParts.push(`(${docTypes.join(' or ')})`);
    }

    // Branch filter - disabled because Branch field is not available in the SalesInvoice endpoint
    // Note: If you need branch filtering, you may need to filter the results after fetching them
    // or check if your Acumatica version has a different field name for branch filtering
    // if (filters.branches && filters.branches.length > 0) {
    //   const branchFilters = filters.branches
    //     .map((b) => `Branch eq '${b}'`)
    //     .join(' or ');
    //   filterParts.push(`(${branchFilters})`);
    // }

    const params: Record<string, string> = {
      // Remove $select to get ALL fields
      $expand:
        'Details,Commissions,FinancialDetails',
      $filter: filterParts.join(' and '),
    };

    return this.get<AcumaticaInvoice[]>('SalesInvoice', params);
  }

  /**
   * Make a generic authenticated request to Acumatica
   * This is used by the schema discovery service for flexible API access
   */
  async makeRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any
  ): Promise<Response> {
    // Handle full URLs or relative paths
    let url: string;
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      url = endpoint;
    } else {
      // Remove leading slash if present
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
      url = `${this.instanceUrl}/${cleanEndpoint}`;
    }

    console.log(`[Acumatica Client] makeRequest: ${method} ${url}`);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.cookies.length > 0) {
      headers['Cookie'] = this.cookies.join('; ');
      console.log(`[Acumatica Client] Using ${this.cookies.length} cookies for request`);
    } else {
      console.warn(`[Acumatica Client] No cookies available for request to ${url}`);
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    console.log(`[Acumatica Client] Response: ${response.status} ${response.statusText}`);

    return response;
  }

  /**
   * Make a request using Basic Authentication (required for OData endpoints)
   */
  async makeBasicAuthRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any
  ): Promise<Response> {
    if (this.config.credentials.type !== 'password') {
      throw new Error('Basic Auth requires password credentials');
    }

    // Handle full URLs or relative paths
    let url: string;
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      url = endpoint;
    } else {
      // Remove leading slash if present
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
      url = `${this.instanceUrl}/${cleanEndpoint}`;
    }

    console.log(`[Acumatica Client] makeBasicAuthRequest: ${method} ${url}`);

    // Create Basic Auth header
    const { username, password } = this.config.credentials;
    const authString = Buffer.from(`${username}:${password}`).toString('base64');

    const headers: HeadersInit = {
      'Authorization': `Basic ${authString}`,
      'Accept': 'application/xml, application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, options);

    console.log(`[Acumatica Client] Basic Auth Response: ${response.status} ${response.statusText}`);

    return response;
  }

  /**
   * Logout from Acumatica
   */
  async logout(): Promise<void> {
    if (this.cookies.length === 0) return;

    const logoutUrl = `${this.config.instanceUrl}/entity/auth/logout`;

    try {
      await fetch(logoutUrl, {
        method: 'POST',
        headers: {
          Cookie: this.cookies.join('; '),
        },
      });
    } catch (error) {
      // Ignore logout errors
      console.error('Logout error:', error);
    } finally {
      this.cookies = [];
    }
  }
}

/**
 * Create a new Acumatica client instance
 */
export function createAcumaticaClient(
  config: AcumaticaConnectionConfig
): AcumaticaClient {
  return new AcumaticaClient(config);
}
