# ARFlow Deployment Guide

Complete guide for deploying ARFlow to production on Vercel.

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Vercel Deployment](#vercel-deployment)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Post-Deployment](#post-deployment)
- [Troubleshooting](#troubleshooting)

## Pre-Deployment Checklist

Before deploying to production, ensure you have:

- [ ] PostgreSQL database (Vercel Postgres, Neon, or Supabase)
- [ ] Clerk account configured for production
- [ ] All environment variables ready
- [ ] Tested application locally
- [ ] All tests passing
- [ ] Git repository connected to Vercel

## Vercel Deployment

### Quick Deploy

1. **Connect Repository**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New" → "Project"
   - Import your Git repository (GitHub, GitLab, or Bitbucket)

2. **Configure Project**:
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `./` (default)
   - Build Command: Uses `vercel-build` script automatically
   - Output Directory: `.next` (default)

3. **Add Environment Variables** (see below)

4. **Deploy**: Click "Deploy"

### Build Process

Vercel automatically runs the `vercel-build` script which:

1. Deploys database migrations (`prisma migrate deploy`)
2. Generates Prisma client (`prisma generate`)
3. Builds the Next.js app (`next build`)
4. Runs unit tests before deployment

```bash
# package.json
"vercel-build": "prisma migrate deploy && prisma generate && next build"
```

## Environment Variables

### Required Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

#### Database
```env
DATABASE_URL="postgresql://user:password@host:5432/database"
```

#### Clerk Authentication
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
CLERK_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
```

#### Application
```env
COMPANY_NAME="Your Company Name"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"  # REQUIRED for Stripe payment redirects
```

**CRITICAL:** `NEXT_PUBLIC_APP_URL` must be set to your production domain for Stripe checkout to work properly. Without this, users will be redirected to localhost after completing payments.

### Optional Variables

#### Email Notifications
```env
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@yourdomain.com"
RESEND_REPLY_TO_EMAIL="support@yourdomain.com"
```

#### Acumatica Integration
```env
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
ENCRYPTION_KEY="your-base64-encryption-key"
```

**CRITICAL:** Use a different `ENCRYPTION_KEY` for production than development!

### Setting Environment Variables

1. Go to Vercel Dashboard → Your Project → Settings
2. Navigate to "Environment Variables"
3. Add each variable:
   - **Name**: Variable name
   - **Value**: Variable value
   - **Environments**: Select all (Production, Preview, Development)
4. Click "Save"

**Important:** After adding variables, redeploy for changes to take effect.

## Database Setup

### Option 1: Vercel Postgres (Recommended)

1. Go to Vercel Dashboard → Storage
2. Click "Create Database"
3. Select "Postgres"
4. Name your database
5. Select region (same as your app for best performance)
6. Click "Create"
7. Copy `DATABASE_URL` to environment variables

### Option 2: External Database

**Neon:**
1. Create account at [neon.tech](https://neon.tech)
2. Create project
3. Copy connection string
4. Add to Vercel as `DATABASE_URL`

**Supabase:**
1. Create account at [supabase.com](https://supabase.com)
2. Create project
3. Get connection string from Settings → Database
4. Add to Vercel as `DATABASE_URL`

### Database Migrations

Migrations run automatically during deployment via `vercel-build` script.

To manually run migrations:

```bash
# Set DATABASE_URL to production database
DATABASE_URL="your-production-url" npx prisma migrate deploy
```

## Post-Deployment

### 1. Verify Deployment

Visit your deployed URL and check:

- [ ] Homepage loads
- [ ] Sign-in/sign-up works
- [ ] Dashboard accessible after authentication
- [ ] Database connection working
- [ ] No console errors (F12)

### 2. Configure Clerk for Production

1. Go to Clerk Dashboard → Your Application
2. Navigate to "Domains"
3. Add your production domain
4. Update redirect URLs:
   - Sign-in redirect: `https://yourdomain.com/dashboard`
   - Sign-out redirect: `https://yourdomain.com`
   - Home URL: `https://yourdomain.com`

### 3. Set Up Email Domain (if using Resend)

1. Go to Resend Dashboard → Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Add DNS records to your domain provider:
   - SPF record
   - DKIM records
   - DMARC record (optional but recommended)
5. Verify domain

### 4. Configure Stripe Webhooks (if using Stripe payments)

**CRITICAL:** Stripe webhooks are required for payment processing to work correctly.

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Developers → Webhooks
2. Click "Add endpoint"
3. Set endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)
7. Add to your Stripe integration settings in the app:
   - Go to your ARFlow app → Settings → Payment Gateway
   - Configure Stripe integration
   - Paste the webhook secret

**Important:** Without webhooks configured, payments will appear as "Processing" indefinitely even though the charge succeeded on Stripe.

### 5. Test Critical Features

- [ ] User registration and login
- [ ] Organization creation
- [ ] Customer creation
- [ ] Invoice import
- [ ] PDF generation
- [ ] Email notifications (if configured)
- [ ] Acumatica integration (if configured)
- [ ] Stripe payment flow (if configured)

### 6. Set Up Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Configure DNS:
   - Add CNAME record pointing to `cname.vercel-dns.com`
   - Or add A records for root domain
4. Wait for DNS propagation (can take up to 48 hours)
5. Vercel automatically provisions SSL certificate

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing locally
- [ ] Environment variables documented
- [ ] Database migrations tested
- [ ] Git repository up to date
- [ ] Production credentials ready

### During Deployment
- [ ] Database created
- [ ] Environment variables added to Vercel
- [ ] Repository connected
- [ ] Initial deployment successful
- [ ] No build errors

### Post-Deployment
- [ ] Application accessible
- [ ] Authentication working
- [ ] Database connected
- [ ] Clerk configured for production domain
- [ ] Email domain verified (if applicable)
- [ ] Custom domain configured (if applicable)
- [ ] Critical features tested
- [ ] Monitoring set up

## Continuous Deployment

Vercel automatically deploys when you push to your repository:

### Main Branch (Production)
```bash
git add .
git commit -m "your message"
git push origin main
```

Vercel will:
1. Run tests
2. Build application
3. Deploy to production (if tests pass)

### Preview Deployments

Every pull request gets a unique preview URL:

```bash
git checkout -b feature/new-feature
# Make changes
git push origin feature/new-feature
# Create PR on GitHub
```

Vercel creates preview deployment for testing before merging.

## Monitoring and Logs

### View Logs

1. Go to Vercel Dashboard → Your Project
2. Click "Deployments"
3. Select a deployment
4. View logs in "Build Logs" or "Runtime Logs"

### Log Levels

Vercel shows:
- Build logs (during deployment)
- Runtime logs (application errors)
- Function logs (API routes, server actions)

### Common Log Patterns

**Successful deployment:**
```
✓ Generated Prisma Client
✓ Compiled successfully
✓ Creating an optimized production build
✓ Deployment Ready
```

**Migration issues:**
```
Error: Migration failed
```
See [Troubleshooting](#troubleshooting) below.

## Troubleshooting

### Build Fails with "ENCRYPTION_KEY environment variable is not set"

**Solution:** Add `ENCRYPTION_KEY` to Vercel environment variables:

```bash
# Generate key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Add to Vercel → Settings → Environment Variables
```

### Build Fails with "Property 'acumaticaIntegration' does not exist"

**Solution:** Prisma client wasn't regenerated.

1. Check that `vercel-build` script is being used
2. Clear Vercel build cache:
   - Settings → General → Clear Build Cache
   - Click "Clear Build Cache"
   - Redeploy

### Migration Fails with "type already exists"

**Solution:** Migration was partially applied.

1. Get `DATABASE_URL` from Vercel
2. Run locally:
   ```bash
   npx prisma migrate resolve --applied MIGRATION_NAME
   ```
3. Push to trigger redeployment

### Database Connection Issues

**Solution:** Verify `DATABASE_URL` is correct:

1. Check environment variable in Vercel
2. Test connection string locally
3. Ensure database is accessible from Vercel's region
4. Check database firewall rules (allow Vercel IPs)

### Tests Failing During Build

**Solution:** Tests run before deployment and block if they fail.

1. Run tests locally: `npm run test:all`
2. Fix failing tests
3. Commit and push again

To temporarily skip tests (not recommended):
- Remove test step from `vercel-build` script

### Application Loads but Shows Errors

**Check:**
1. Browser console (F12) for client-side errors
2. Vercel logs for server-side errors
3. Environment variables are set correctly
4. Database migrations applied successfully

### Email Notifications Not Working

**Check:**
1. `RESEND_API_KEY` is set in Vercel
2. Domain is verified in Resend
3. DNS records are configured
4. Emails not going to spam
5. Check Resend dashboard for delivery logs

### Clerk Authentication Issues

**Check:**
1. Production domain added to Clerk
2. Redirect URLs updated for production
3. API keys are for correct Clerk instance
4. Users added to organization

### Stripe Payment Issues

**Problem:** Users redirected to localhost after payment
**Solution:**
1. Set `NEXT_PUBLIC_APP_URL` to your production domain in Vercel environment variables
2. Redeploy the application
3. Verify the variable is set correctly in deployment logs

**Problem:** Payments stuck in "Processing" status
**Solution:**
1. Verify webhook is configured in Stripe Dashboard
2. Check webhook endpoint URL matches your domain: `https://yourdomain.com/api/webhooks/stripe`
3. Ensure webhook secret is saved in your Stripe integration settings
4. Check Vercel function logs for webhook errors
5. In Stripe Dashboard, view webhook delivery attempts to see if they're failing

**Problem:** Webhook signature verification failed
**Solution:**
1. Verify you're using the correct webhook secret for your environment (test vs live)
2. Check that the webhook secret in ARFlow matches the one in Stripe Dashboard
3. Ensure the webhook endpoint is accessible (not behind authentication)

## Performance Optimization

### Enable Analytics

1. Go to Vercel Dashboard → Your Project
2. Navigate to "Analytics"
3. Enable "Web Analytics" and "Speed Insights"

### Configure Caching

Vercel automatically caches static assets. For API routes:

```typescript
// app/api/route.ts
export const revalidate = 60 // Revalidate every 60 seconds
```

### Database Optimization

1. Enable connection pooling:
   ```env
   DATABASE_URL="postgresql://...?connection_limit=10"
   ```

2. Use Prisma connection pool:
   ```typescript
   // lib/db.ts - already configured
   ```

## Rollback

If a deployment has issues:

1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

Or revert git commit and push:

```bash
git revert HEAD
git push origin main
```

## Security Checklist

- [ ] All environment variables set correctly
- [ ] Production encryption key is unique
- [ ] Database credentials secure
- [ ] Clerk webhook secret set (if using webhooks)
- [ ] CORS configured properly
- [ ] Rate limiting enabled (if applicable)
- [ ] DNS records have DMARC/SPF/DKIM (for email)

## Support

For deployment issues:

1. Check [Troubleshooting](#troubleshooting) above
2. Review Vercel logs
3. Check [Vercel Documentation](https://vercel.com/docs)
4. Contact repository owner

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)
- [Clerk Production Checklist](https://clerk.com/docs/deployments/production)
- [Resend Domain Setup](https://resend.com/docs/dashboard/domains/introduction)
