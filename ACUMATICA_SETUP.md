# Acumatica Integration - Setup Instructions

## What's Been Implemented

The foundation for the Acumatica integration has been successfully implemented:

### 1. Database Schema ✅
- New Prisma models for integration management
- Support for connection settings, salesperson mappings, and sync logs
- Integration tracking fields added to Client, Project, and SalesTransaction models

### 2. Core Library ✅
- **Encryption**: AES-256-GCM encryption for secure credential storage
- **API Client**: Full Acumatica REST API client with authentication
- **Type Safety**: Complete TypeScript type definitions

### 3. Server Actions ✅
- Connection testing (validates credentials without saving)
- Connection saving (encrypts and stores credentials)
- Integration retrieval

### 4. User Interface ✅
- Updated integrations page to show real Acumatica status
- Step 1 connection configuration wizard
- Beautiful, user-friendly form with validation

## Setup Instructions

### Step 1: Add Encryption Key

Add the following to your `.env.local` file:

```bash
# Acumatica Integration - Encryption Key for credentials
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
ENCRYPTION_KEY=yWIbfcIuVyoWfvLTYDAmidBMNZyFlnLZ2+l/PSu7SMI=
```

**IMPORTANT**:
- Use a unique key for production! Generate a new one with the command above
- **You MUST restart your dev server after adding this**

### Step 2: Run Database Migration

Apply the new database schema:

```bash
npx prisma migrate dev --name add_acumatica_integration
```

**If you get errors about unique constraints:**
```sql
-- Your existing data conflicts with new unique constraints
-- Option 1: Reset database (WARNING: loses all data)
npx prisma migrate reset

-- Option 2: Fix constraints manually (run in database)
UPDATE clients SET external_id = NULL WHERE external_system IS NULL;
UPDATE projects SET external_id = NULL WHERE external_system IS NULL;
UPDATE sales_transactions SET external_id = NULL WHERE external_system IS NULL;
-- Then run migrate dev again
```

This will create the necessary tables:
- `acumatica_integrations`
- `acumatica_salesperson_mappings`
- `integration_sync_logs`

And add integration tracking fields to existing tables.

### Step 3: Regenerate Prisma Client

**CRITICAL:** You must regenerate the Prisma client after migration:

```bash
npx prisma generate
```

### Step 4: Restart Development Server

**CRITICAL:** You must restart your dev server:

```bash
# Press Ctrl+C to stop the current server
# Then restart:
npm run dev
```

### Step 5: Test the Connection

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/dashboard/integrations`

3. Click "Connect" on the Acumatica card

4. You'll be taken to the setup wizard at: `/dashboard/integrations/acumatica/setup`

5. Enter your Acumatica credentials:
   - **Instance URL**: Your Acumatica URL (e.g., `https://yourcompany.acumatica.com`)
   - **API Version**: Select the version matching your instance
   - **Company ID**: Your tenant/company identifier
   - **Username**: API user credentials
   - **Password**: API user password

6. Click "Test Connection" to validate the credentials

7. Once successful, click "Save & Continue"

## Files Created

### Library Files
- `src/lib/acumatica/encryption.ts` - Credential encryption utilities
- `src/lib/acumatica/types.ts` - TypeScript type definitions
- `src/lib/acumatica/client.ts` - Acumatica API client
- `src/lib/acumatica/auth.ts` - Authentication helpers
- `src/lib/acumatica/index.ts` - Main exports

### Server Actions
- `src/actions/integrations/acumatica/connection.ts` - Connection testing and saving

### UI Components
- `src/app/dashboard/integrations/acumatica/setup/page.tsx` - Connection wizard (Step 1)
- Updated: `src/app/dashboard/integrations/page.tsx` - Shows real integration status

### Database Schema
- Updated: `prisma/schema.prisma` - New models and enums

## Testing Your Acumatica Connection

To test the connection, you'll need:

1. **Access to an Acumatica instance** with:
   - Contract-Based REST API enabled
   - API version 23.200.001 or later

2. **API User Credentials** with permissions to:
   - SalesInvoice endpoint (read)
   - Salesperson endpoint (read)
   - Customer endpoint (read)
   - Project endpoint (read)
   - Branch endpoint (read)
   - Company endpoint (read)

3. **Connection Details**:
   - Instance URL (must be HTTPS)
   - API version
   - Company/Tenant ID
   - Username and password

## Next Steps

Once the connection is tested successfully, the remaining steps are:

1. **Step 2**: Salesperson Mapping - Map Acumatica salespeople to CommissionFlow users
2. **Step 3**: Customer & Project Settings - Configure how customers and projects are handled
3. **Step 4**: Invoice Configuration - Set up invoice import rules
4. **Step 5**: Sync Schedule - Configure automated sync frequency
5. **Step 6**: Review & Activate - Review settings and activate the integration
6. **Sync Engine**: Build the actual sync logic to import invoices
7. **Dashboard**: Create management UI for viewing sync history
8. **Cron Job**: Set up scheduled syncs

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface (Next.js)                 │
│  - Setup Wizard                                             │
│  - Integration Dashboard                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Server Actions (Next.js)                  │
│  - testAcumaticaConnection()                                │
│  - saveAcumaticaConnection()                                │
│  - getAcumaticaIntegration()                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Acumatica Client Library                   │
│  - Authentication (OAuth/Password)                          │
│  - API Endpoints (Invoices, Salespeople, etc.)             │
│  - Error Handling                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Acumatica REST API                         │
│  - Contract-Based API                                       │
│  - OData Filtering                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Database (PostgreSQL)                    │
│  - acumatica_integrations                                   │
│  - acumatica_salesperson_mappings                           │
│  - integration_sync_logs                                    │
│  - clients, projects, sales_transactions (updated)          │
└─────────────────────────────────────────────────────────────┘
```

## Security Features

1. **Credential Encryption**: All credentials encrypted at rest using AES-256-GCM
2. **PBKDF2 Key Derivation**: 100,000 iterations for additional security
3. **HTTPS Required**: Instance URLs must use HTTPS
4. **Admin-Only Access**: Only organization admins can configure integrations
5. **Secure Session Management**: Cookie-based authentication with Acumatica

## Troubleshooting

### "ENCRYPTION_KEY environment variable is not set"
- Add `ENCRYPTION_KEY` to your `.env.local` file
- Restart your development server

### "Property 'acumaticaIntegration' does not exist on type 'PrismaClient'"
- Run `npx prisma generate` to regenerate the Prisma client
- Restart your TypeScript server in VS Code

### "Connection test failed"
- Verify your Acumatica instance URL is correct and accessible
- Ensure the API version matches your Acumatica instance
- Check that the username and password are correct
- Verify the API user has necessary permissions
- Check that the Company ID matches exactly

### Database migration issues
- Ensure your database is accessible
- Run `npx prisma migrate dev` to apply pending migrations
- Check that there are no conflicting data (unique constraints)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the implementation guide document
3. Verify all environment variables are set correctly
4. Ensure database migrations have been applied
