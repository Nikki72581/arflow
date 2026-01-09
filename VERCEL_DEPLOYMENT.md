# Vercel Deployment Guide for Acumatica Integration

## Required Environment Variable

Before deploying, you **must** add the `ENCRYPTION_KEY` to your Vercel environment variables.

### Step 1: Generate an Encryption Key

Run this command to generate a secure key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Important:** Use a different key for production than your local development key!

### Step 2: Add to Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Click on **Settings**
3. Navigate to **Environment Variables**
4. Add a new variable:
   - **Name**: `ENCRYPTION_KEY`
   - **Value**: (paste the key you generated)
   - **Environments**: Select all (Production, Preview, Development)
5. Click **Save**

### Step 3: Redeploy

After adding the environment variable:

1. Go to the **Deployments** tab
2. Click the three dots (**...**) on the latest deployment
3. Click **Redeploy**

Or simply push a new commit:

```bash
git add .
git commit -m "Add Acumatica integration"
git push
```

## Build Process

Vercel will automatically:

1. Run `npm run vercel-build` which:
   - Deploys database migrations (`prisma migrate deploy`)
   - Generates Prisma client (`prisma generate`)
   - Builds the Next.js app (`next build`)

2. The migrations will create:
   - `acumatica_integrations` table
   - `acumatica_salesperson_mappings` table
   - `integration_sync_logs` table
   - Add integration tracking fields to existing tables

## Troubleshooting

### Build fails with "ENCRYPTION_KEY environment variable is not set"

**Solution:** Add `ENCRYPTION_KEY` to Vercel environment variables (see Step 2 above)

### Build fails with "Property 'acumaticaIntegration' does not exist"

**Solution:** The Prisma client wasn't regenerated. This should be fixed by the `vercel-build` script, but if it persists:

1. Check that `vercel-build` is being used (in Vercel Settings → General → Build & Development Settings)
2. Try clearing the Vercel build cache:
   - Go to Settings → General
   - Scroll to "Clear Build Cache"
   - Click "Clear Build Cache"
   - Redeploy

### Migration fails with "type already exists"

**Solution:** The migration was partially applied. Mark it as applied:

1. In your Vercel project, go to Settings → Environment Variables
2. Add `DATABASE_URL` to your local `.env` (copy from Vercel)
3. Run locally:
   ```bash
   npx prisma migrate resolve --applied 20260101073502_add_acumatica_integration
   ```
4. Push the updated migration state

### Database connection issues

**Solution:** Verify your `DATABASE_URL` environment variable is set correctly in Vercel

## Verification

After successful deployment:

1. Visit your deployed app
2. Navigate to `/dashboard/integrations`
3. You should see the Acumatica integration card
4. Click "Connect" to access the setup wizard
5. The database tables should exist (you can check in Prisma Studio or your database GUI)

## Security Notes

- ✅ `ENCRYPTION_KEY` is required and must be set in Vercel
- ✅ Use a unique key for production (don't reuse development keys)
- ✅ Never commit encryption keys to git
- ✅ Store the production key securely (password manager, secrets vault)
- ✅ Rotate the key periodically for security

## Next Steps

After deployment:

1. Add `ENCRYPTION_KEY` to Vercel environment variables
2. Commit and push your changes
3. Wait for Vercel to deploy
4. Test the connection feature with your Acumatica instance
5. Share any errors in the browser console or Vercel logs for debugging
