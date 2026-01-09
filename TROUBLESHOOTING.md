# Acumatica Integration - Troubleshooting

## Issue: "Test Connection" button does nothing

If the Test Connection button doesn't respond or show any errors, follow these steps:

### Step 1: Check Browser Console

1. Open Developer Tools (F12 or Right-click → Inspect)
2. Go to the **Console** tab
3. Click "Test Connection" button
4. Look for errors in the console

**Common errors:**
- `Server action failed` - Server-side error
- `TypeError` - Missing function or data
- Network errors - Check Network tab

### Step 2: Check Server Logs

1. Look at your terminal where `npm run dev` is running
2. Click "Test Connection" again
3. Look for `[Server]` prefixed log messages

**You should see:**
```
[Server] testAcumaticaConnection called
[Server] Auth userId: authenticated
[Server] Validating inputs: { hasInstanceUrl: true, ... }
```

**If you see nothing**, the server action isn't being called.

### Step 3: Verify Database Migration

The most common issue is that the database migration hasn't been run.

**Run this command:**
```bash
npx prisma migrate dev --name add_acumatica_integration
```

**Expected output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database...

Applying migration `20240101000000_add_acumatica_integration`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20240101000000_add_acumatica_integration/
    └─ migration.sql

✔ Generated Prisma Client
```

**If you see errors about unique constraints:**
Your database already has data that conflicts with the new unique constraints. This is expected if you're adding integration tracking to existing records.

**Solution:**
```sql
-- Option 1: If you have no important data, reset the database
npx prisma migrate reset

-- Option 2: Manually fix the constraint issues
-- Connect to your database and run:
UPDATE clients SET external_id = NULL WHERE external_system IS NULL;
UPDATE projects SET external_id = NULL WHERE external_system IS NULL;
UPDATE sales_transactions SET external_id = NULL WHERE external_system IS NULL;
```

### Step 4: Verify ENCRYPTION_KEY

Check that `ENCRYPTION_KEY` is set in your `.env.local`:

```bash
# .env.local
ENCRYPTION_KEY=yWIbfcIuVyoWfvLTYDAmidBMNZyFlnLZ2+l/PSu7SMI=
```

**Test it:**
```bash
# In terminal:
node -e "console.log(process.env.ENCRYPTION_KEY || 'NOT SET')"
```

### Step 5: Restart Development Server

After adding ENCRYPTION_KEY or running migrations:

```bash
# Stop the dev server (Ctrl+C)
# Then restart it:
npm run dev
```

### Step 6: Clear Next.js Cache

Sometimes Next.js caches old code:

```bash
# Stop the dev server
rm -rf .next
npm run dev
```

### Step 7: Test with Debug Page

Visit: http://localhost:3000/dashboard/integrations/acumatica/debug

This simplified page will help isolate the issue.

Click "Test Server Action" and check the output.

## Common Issues & Solutions

### Issue: TypeScript errors about `acumaticaIntegration`

**Problem:** Prisma client hasn't been regenerated after schema changes.

**Solution:**
```bash
npx prisma generate
# Restart dev server
```

### Issue: "Property 'acumaticaIntegration' does not exist"

**Problem:** Migration hasn't been applied or Prisma client is outdated.

**Solution:**
```bash
# 1. Apply migration
npx prisma migrate dev

# 2. Regenerate client
npx prisma generate

# 3. Restart dev server
npm run dev
```

### Issue: "ENCRYPTION_KEY environment variable is not set"

**Problem:** Missing or incorrect environment variable.

**Solution:**
1. Add to `.env.local`:
   ```
   ENCRYPTION_KEY=yWIbfcIuVyoWfvLTYDAmidBMNZyFlnLZ2+l/PSu7SMI=
   ```
2. Restart dev server

### Issue: "Unauthorized" error

**Problem:** Not logged in or not an admin.

**Solution:**
1. Make sure you're logged in to CommissionFlow
2. Verify your user has ADMIN role in the database:
   ```sql
   SELECT email, role FROM users WHERE clerk_id = 'your_clerk_id';
   ```

### Issue: Network error / CORS

**Problem:** Can't reach Acumatica instance.

**Solution:**
1. Verify the Acumatica URL is correct and accessible
2. Check that it uses HTTPS
3. Try accessing it in your browser
4. Check firewall settings

### Issue: "Connection test failed" with no error message

**Problem:** Acumatica API returned an error.

**Check server logs for:**
```
[Server] Test connection result: { success: false, error: "..." }
```

**Common Acumatica errors:**
- Invalid credentials
- Wrong company ID
- API version mismatch
- User doesn't have required permissions

## Debugging Checklist

Run through this checklist in order:

- [ ] ENCRYPTION_KEY is in `.env.local`
- [ ] Dev server restarted after adding ENCRYPTION_KEY
- [ ] Database migration applied (`npx prisma migrate dev`)
- [ ] Prisma client regenerated (`npx prisma generate`)
- [ ] No TypeScript errors in VSCode
- [ ] Browser console shows no errors
- [ ] Server logs show `[Server]` messages
- [ ] User is logged in as ADMIN
- [ ] Debug page works (`/dashboard/integrations/acumatica/debug`)

## Still Not Working?

### Get Detailed Logs

1. Check browser console (F12 → Console)
2. Check network tab (F12 → Network)
3. Check server terminal logs
4. Visit debug page and share the output

### Check Database State

```bash
npx prisma studio
```

This opens a GUI to view your database. Check:
- Organizations table exists
- Your user has correct `organizationId` and `role: ADMIN`
- `acumatica_integrations` table exists

### Manual Test

Try calling the server action directly in browser console:

```javascript
// Open browser console on the setup page
const result = await testAcumaticaConnection({
  instanceUrl: 'https://test.acumatica.com',
  apiVersion: '24.200.001',
  companyId: 'TEST',
  username: 'test',
  password: 'test'
});
console.log(result);
```

## Contact Information

If you're still stuck, provide:
1. Browser console errors (screenshot)
2. Server terminal output (last 50 lines)
3. Output from debug page
4. Result of `npx prisma migrate status`
