# Acumatica Integration - Deployment Checklist ✅

## Pre-Deployment Checklist

- [x] Prisma schema updated with integration models
- [x] Migration created (`20260101073502_add_acumatica_integration`)
- [x] Migration applied locally
- [x] Prisma client regenerated
- [x] Encryption utilities implemented
- [x] Acumatica API client implemented
- [x] Server actions created
- [x] Setup wizard UI created
- [x] TypeScript errors resolved
- [x] `vercel-build` script added to package.json

## Deployment Steps

### 1. Add ENCRYPTION_KEY to Vercel

**CRITICAL - Do this first!**

```bash
# Generate a production encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Then:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add new variable:
   - Name: `ENCRYPTION_KEY`
   - Value: (paste the generated key)
   - Environments: Production, Preview, Development
3. Click Save

### 2. Commit and Push

```bash
git add .
git commit -m "Add Acumatica integration foundation

- Database schema with integration models
- Encryption utilities for credentials
- Acumatica REST API client
- Connection testing server actions
- Setup wizard UI (Step 1)
- Comprehensive logging for debugging"

git push
```

### 3. Monitor Deployment

Watch the Vercel deployment logs for:

✅ **Expected success messages:**
```
> Applying migration 20260101073502_add_acumatica_integration
> ✔ Generated Prisma Client
> Creating an optimized production build
> ✓ Compiled successfully
```

❌ **If you see errors:**

**"ENCRYPTION_KEY environment variable is not set"**
- Go back to Step 1 and add the environment variable

**"Migration failed"**
- Check the error message
- May need to manually resolve the migration (see TROUBLESHOOTING.md)

**"Property 'acumaticaIntegration' does not exist"**
- Prisma client wasn't generated
- Check that `vercel-build` script is running
- Clear Vercel build cache and redeploy

### 4. Verify Deployment

After successful deployment:

1. Visit your production URL
2. Navigate to `/dashboard/integrations`
3. Verify Acumatica card shows "Not Connected"
4. Click "Connect" button
5. Verify setup page loads at `/dashboard/integrations/acumatica/setup`

## Testing the Integration

### Test with Your Acumatica Instance

1. Navigate to the setup page
2. Fill in your Acumatica credentials:
   - Instance URL (must be HTTPS)
   - API Version
   - Company ID
   - Username
   - Password
3. Click "Test Connection"
4. Check browser console (F12) for detailed logs
5. Check Vercel logs for server-side logs

**Expected behavior:**
- Button shows "Testing Connection..." with spinner
- After a few seconds, shows success or error message
- Success: Green alert with "Connection successful!"
- Error: Red alert with specific error message

### Debug Logs

**Browser Console should show:**
```
[Client] handleTestConnection called
[Client] Testing connection with: { instanceUrl: ..., apiVersion: ..., ... }
[Client] Calling testAcumaticaConnection...
[Client] Test result received: { success: true }
[Client] Test result set in state
[Client] Setting testing to false
```

**Vercel Logs should show:**
```
[Server] testAcumaticaConnection called
[Server] Auth userId: authenticated
[Server] Validating inputs: { hasInstanceUrl: true, ... }
[Server] URL protocol: https:
[Server] Calling testConnection...
[Server] Test connection result: {"success":true}
[Server] Returning: {"success":true}
```

## Post-Deployment

### If Connection Test Works ✅

Great! The foundation is ready. Next steps:
1. Proceed with Step 2: Salesperson Mapping (future implementation)
2. Configure remaining wizard steps
3. Build the sync engine

### If Connection Test Fails ❌

1. Check browser console for client-side errors
2. Check Vercel logs for server-side errors
3. Refer to [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
4. Use the debug page: `/dashboard/integrations/acumatica/debug`

## Common Issues

### "Test Connection" button does nothing

**Cause:** Missing environment variable or migration not applied

**Fix:**
1. Verify `ENCRYPTION_KEY` is in Vercel
2. Check Vercel logs for errors
3. Verify migration was applied (check database)

### Connection test fails with "Invalid credentials"

**Cause:** Wrong Acumatica credentials

**Fix:**
1. Verify credentials work in Acumatica web interface
2. Check API version matches your instance
3. Verify Company ID is correct
4. Ensure user has API access permissions

### "HTTPS required" error

**Cause:** Instance URL is not using HTTPS

**Fix:**
1. Ensure URL starts with `https://`
2. Remove any trailing slashes
3. Verify the URL is correct

## Files Changed

### New Files
- `src/lib/acumatica/encryption.ts` - Credential encryption
- `src/lib/acumatica/types.ts` - TypeScript types
- `src/lib/acumatica/client.ts` - API client
- `src/lib/acumatica/auth.ts` - Authentication
- `src/lib/acumatica/index.ts` - Exports
- `src/actions/integrations/acumatica/connection.ts` - Server actions
- `src/app/dashboard/integrations/acumatica/setup/page.tsx` - Setup wizard
- `src/app/dashboard/integrations/acumatica/debug/page.tsx` - Debug page
- `prisma/migrations/20260101073502_add_acumatica_integration/` - Migration

### Modified Files
- `prisma/schema.prisma` - Added integration models
- `src/app/dashboard/integrations/page.tsx` - Show real status
- `package.json` - Added `vercel-build` script

### Documentation
- `ACUMATICA_SETUP.md` - Setup instructions
- `TROUBLESHOOTING.md` - Debugging guide
- `VERCEL_DEPLOYMENT.md` - Vercel-specific guide
- `DEPLOYMENT_CHECKLIST.md` - This file

## Support

If you encounter issues:

1. Check browser console for client errors
2. Check Vercel logs for server errors
3. Visit debug page: `/dashboard/integrations/acumatica/debug`
4. Review documentation in this repo
5. Share error logs for further assistance

---

**Status:** Ready for deployment! 🚀

Once deployed and tested, the Acumatica connection testing feature will be live and you can pause or continue with the remaining wizard steps.
