# Step 6: Comprehensive Installation and Usage Guide

Complete guide for all 5 phases of Step 6 enhancements.

---

## Table of Contents

1. [Phase 1: Salesperson Portal](#phase-1-salesperson-portal)
2. [Phase 2: Bulk Payout Processing](#phase-2-bulk-payout-processing)
3. [Phase 3: Email Notifications](#phase-3-email-notifications)
4. [Phase 4: Audit Logs](#phase-4-audit-logs)
5. [Phase 5: Final Polish](#phase-5-final-polish)

---

# Phase 1: Salesperson Portal

## Overview

A self-service portal where salespeople can view their own commissions without admin access.

### Features
- Personal commission history (only their own data)
- Personal stats (total earned, pending, approved, paid)
- Date range filtering with 11 preset ranges
- CSV export of personal data
- Status tracking with approval/payment dates
- Average commission rate calculation

### Installation (5 minutes)

#### Files Created (3 files)

1. **`app/actions/my-commissions.ts`** - Server actions for personal data
2. **`app/dashboard/my-commissions/page.tsx`** - Server wrapper with metadata
3. **`app/dashboard/my-commissions/client-page.tsx`** - Client component with UI

#### Directory Structure

```
src/
├── app/
│   ├── actions/
│   │   └── my-commissions.ts          ✓ NEW
│   └── dashboard/
│       └── my-commissions/
│           ├── page.tsx               ✓ NEW
│           └── client-page.tsx        ✓ NEW
```

#### Server Actions API

**`getMyCommissions(dateRange?)`**
```typescript
const result = await getMyCommissions({
  from: new Date('2024-01-01'),
  to: new Date('2024-12-31')
})
// Returns: { success: true, data: CommissionCalculation[] }
```

**`getMyCommissionStats(dateRange?)`**
```typescript
const result = await getMyCommissionStats()
// Returns stats: totalEarned, pending, approved, paid, averageCommissionRate
```

**`getMyCommissionExportData(dateRange?)`**
```typescript
const result = await getMyCommissionExportData()
// Returns CSV-ready data with all personal commission details
```

#### Security

- Users can only see their own commissions
- Queries filtered by authenticated user ID from Clerk session
- Server-side authentication enforced
- No access to other users' data

#### Testing

1. Sign in as a non-admin user
2. Navigate to `/dashboard/my-commissions`
3. Verify stats cards load with personal totals
4. Check commission table shows only your commissions
5. Try date filtering and verify data updates
6. Test CSV export functionality
7. Sign in as different user and verify data isolation

---

# Phase 2: Bulk Payout Processing

## Overview

A comprehensive bulk payout system that allows admins to efficiently process multiple commission payments at once.

### Features
- Bulk selection with checkboxes
- Select all approved commissions
- Floating toolbar showing selection count and total
- Detailed confirmation dialog with salesperson breakdown
- Transaction safety (all-or-nothing updates)
- Auto-refresh after successful payout

### Installation (10 minutes)

#### Step 1: Install Checkbox Component

```bash
npx shadcn@latest add checkbox
```

#### Files Created (4 files)

1. **`app/actions/bulk-payout.ts`** - Bulk payout server actions
2. **`components/commissions/bulk-payout-dialog.tsx`** - Confirmation dialog
3. **`components/commissions/bulk-actions-toolbar.tsx`** - Floating action toolbar
4. **`components/commissions/commissions-table-with-bulk.tsx`** - Table with selection

#### Directory Structure

```
src/
├── app/
│   └── actions/
│       └── bulk-payout.ts          ✓ NEW
└── components/
    ├── commissions/
    │   ├── bulk-payout-dialog.tsx       ✓ NEW
    │   ├── bulk-actions-toolbar.tsx     ✓ NEW
    │   └── commissions-table-with-bulk.tsx  ✓ NEW
    └── ui/
        └── checkbox.tsx            ✓ REQUIRED
```

#### Integration

Replace your existing commissions table:

```typescript
import { CommissionsTableWithBulk } from '@/components/commissions/commissions-table-with-bulk'

// In your page component:
<CommissionsTableWithBulk
  commissions={calculations}
  onRefresh={fetchCalculations}
/>
```

#### Server Actions API

**`bulkMarkAsPaid(input)`**
```typescript
const result = await bulkMarkAsPaid({
  calculationIds: ['id1', 'id2', 'id3'],
  paidDate: new Date()  // Optional, defaults to now
})
// Returns: processedCount, totalAmount, salespeopleCount, calculations
```

**`getPayoutSummary(ids)`**
```typescript
const summary = await getPayoutSummary(['id1', 'id2'])
// Returns: totalAmount, salespeopleCount, breakdown by salesperson, date range
```

**`getPayoutHistory()`**
```typescript
const history = await getPayoutHistory()
// Returns: Past payout batches grouped by date
```

#### Selection Rules

- Only APPROVED commissions can be selected
- PENDING commissions: no checkbox (need approval first)
- PAID commissions: no checkbox (already paid)
- Select All: only selects APPROVED commissions

#### Testing

1. Create 3+ approved commissions
2. Visit `/dashboard/commissions`
3. Select commissions using checkboxes
4. Verify floating toolbar appears with count and total
5. Click "Mark as Paid"
6. Review confirmation dialog breakdown
7. Confirm payout
8. Verify all selected commissions updated to PAID
9. Verify page auto-refreshes

---

# Phase 3: Email Notifications

## Overview

A complete email notification system that automatically alerts salespeople when their commissions are approved or paid.

### Features
- Approval notifications (when commission approved)
- Payment notifications (when commission paid)
- Batch payout summaries (after bulk payouts)
- Professional HTML templates with branding
- Resend integration for reliable delivery
- Async sending (non-blocking)
- Graceful error handling

### Installation (15 minutes)

#### Step 1: Install Resend Package

```bash
npm install resend
```

#### Step 2: Create Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Sign up for free account (100 emails/day free)
3. Navigate to API Keys section
4. Create new API key
5. Copy the key (starts with `re_`)

#### Step 3: Configure Environment Variables

Add to `.env.local`:

```env
# Resend Configuration
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com

# App Configuration
COMPANY_NAME=YourCompany
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional
RESEND_REPLY_TO_EMAIL=support@yourdomain.com
```

For testing without a custom domain:
```env
RESEND_FROM_EMAIL=onboarding@resend.dev
```

#### Step 4: Add to Vercel

1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add all environment variables
3. Redeploy application

#### Files Created (4 files)

1. **`lib/email.ts`** - Email configuration and sending utility
2. **`lib/email-templates.ts`** - Professional HTML email templates
3. **`app/actions/email-notifications.ts`** - Notification server actions
4. **`app/actions/bulk-payout.ts`** - UPDATED with notifications

#### Directory Structure

```
src/
├── app/
│   └── actions/
│       ├── email-notifications.ts        ✓ NEW
│       └── bulk-payout.ts                ✓ UPDATED
└── lib/
    ├── email.ts                          ✓ NEW
    └── email-templates.ts                ✓ NEW
```

#### Integration into Approval Flow

```typescript
import { sendCommissionApprovedNotification } from '@/app/actions/email-notifications'

// After approving commission:
async function approveCommission(calculationId: string) {
  const result = await prisma.commissionCalculation.update({
    where: { id: calculationId },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
    },
  })

  // Send notification (async, non-blocking)
  sendCommissionApprovedNotification(calculationId).catch((error) => {
    console.error('Failed to send approval notification:', error)
  })

  return result
}
```

#### Email Templates

**1. Commission Approved Email**
- Subject: "Commission Approved - [Client Name]"
- Shows commission amount, client/project, sale details
- Includes "View My Commissions" button

**2. Commission Paid Email**
- Subject: "Commission Payment Processed - [Client Name]"
- Shows payment amount, payment date
- Includes "View Payment Details" button

**3. Bulk Payout Summary Email**
- Subject: "Batch Payment Processed - [N] Commissions"
- Lists all commissions paid to that salesperson
- Shows total amount and payment date

#### Email Design Features

- Professional purple gradient header
- Mobile responsive
- Inline CSS (email-safe)
- Clear typography and prominent CTAs
- Company branding integration

#### Testing

1. Approve a commission
2. Check email inbox (use personal email for testing)
3. Verify approval email received
4. Click "View My Commissions" button and verify link works
5. Process a payment
6. Verify payment email received
7. Process bulk payout and verify summary emails

#### Troubleshooting

**No emails being sent?**
- Verify RESEND_API_KEY in .env.local
- Check Resend dashboard for valid key
- Review server logs for errors

**Emails going to spam?**
- Verify domain in Resend
- Add DNS records (SPF, DKIM, DMARC)
- Use verified sending domain (not gmail/yahoo)

---

# Phase 4: Audit Logs

## Overview

A comprehensive audit logging system that tracks all important actions for compliance, debugging, and accountability.

### Features
- Complete audit trail of all actions
- Track who did what when
- Filterable view (user, action, entity type)
- CSV export for compliance
- Pagination for large datasets
- Activity dashboard with recent activity
- Entity history (all actions on specific items)
- IP address tracking

### Installation (20 minutes)

#### Step 1: Add Schema to Prisma

Open `prisma/schema.prisma` and add:

```prisma
model AuditLog {
  id             String   @id @default(cuid())
  createdAt      DateTime @default(now())

  // Who performed the action
  userId         String?
  userName       String?
  userEmail      String?

  // What action was performed
  action         String
  entityType     String
  entityId       String?

  // Details
  description    String
  metadata       Json?

  // Context
  organizationId String
  ipAddress      String?
  userAgent      String?

  // Relations
  user           User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([userId])
  @@index([action])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

Also add relations:

```prisma
// In User model:
model User {
  // ... existing fields ...
  auditLogs      AuditLog[]
}

// In Organization model:
model Organization {
  // ... existing fields ...
  auditLogs      AuditLog[]
}
```

#### Step 2: Run Migration

```bash
npx prisma generate
npx prisma migrate dev --name add_audit_logs
# Or for Vercel Postgres:
npx prisma db push
```

#### Files Created (4 files)

1. **`lib/audit-log.ts`** - Audit log service and utilities
2. **`app/actions/audit-logs.ts`** - Server actions for viewing logs
3. **`app/dashboard/audit-logs/page.tsx`** - Page wrapper
4. **`app/dashboard/audit-logs/client-page.tsx`** - Audit log viewer UI

#### Directory Structure

```
src/
├── app/
│   ├── actions/
│   │   └── audit-logs.ts                    ✓ NEW
│   └── dashboard/
│       └── audit-logs/
│           ├── page.tsx                     ✓ NEW
│           └── client-page.tsx              ✓ NEW
└── lib/
    └── audit-log.ts                         ✓ NEW
```

#### Integration Example

```typescript
import { logCommissionApproval } from '@/lib/audit-log'

async function approveCommission(calculationId: string) {
  const currentUser = await getCurrentUserInfo()

  const result = await prisma.commissionCalculation.update({
    where: { id: calculationId },
    data: { status: 'APPROVED', approvedAt: new Date() },
    include: { user: true },
  })

  // Create audit log (async, non-blocking)
  logCommissionApproval({
    commissionId: result.id,
    amount: result.amount,
    salespersonId: result.userId,
    salespersonName: `${result.user.firstName} ${result.user.lastName}`,
    approvedBy: {
      id: currentUser.id,
      name: `${currentUser.firstName} ${currentUser.lastName}`,
      email: currentUser.email,
    },
    organizationId: currentUser.organizationId,
  }).catch(console.error)

  return result
}
```

#### Actions Logged

**Commission Actions:**
- commission_created
- commission_approved
- commission_paid
- commission_rejected
- bulk_payout_processed

**Sale Actions:**
- sale_created
- sale_updated
- sale_deleted

**Plan Actions:**
- plan_created
- plan_updated
- plan_activated/deactivated

#### Viewer Features

- Timeline of all actions with icons
- Filter by user, action type, entity type
- 50 entries per page (configurable)
- CSV export for compliance
- Shows user, timestamp, IP address, description

#### Testing

1. Perform an action (approve commission, process payout)
2. Visit `/dashboard/audit-logs`
3. Verify log entry appears with correct details
4. Test filtering by user and action type
5. Test CSV export
6. Test pagination with 60+ entries

---

# Phase 5: Final Polish

## Overview

Production-ready polish with professional UX and accessibility features.

### Features
- Professional loading states
- Graceful error handling with error boundaries
- Beautiful empty states
- Mobile-responsive layouts
- Consistent toast notifications
- Full accessibility support (WCAG 2.1 AA)

### Installation (15 minutes)

#### Files Created (6 files)

1. **`components/ui/loading.tsx`** - Reusable loading states
2. **`components/ui/error-boundary.tsx`** - Error boundaries and error displays
3. **`components/shared/empty-states.tsx`** - Empty state components
4. **`components/shared/responsive-table.tsx`** - Mobile-friendly tables
5. **`hooks/use-app-toast.ts`** - Toast notification utilities
6. **`lib/accessibility.tsx`** - A11y helpers

#### Directory Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── loading.tsx              ✓ NEW
│   │   └── error-boundary.tsx       ✓ NEW
│   └── shared/
│       ├── empty-states.tsx         ✓ NEW
│       └── responsive-table.tsx     ✓ NEW
├── hooks/
│   └── use-app-toast.ts             ✓ NEW
└── lib/
    └── accessibility.tsx            ✓ NEW
```

#### Add CSS for Screen Readers

Add to `src/app/globals.css`:

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

#### Quick Integration Steps

**1. Add Error Boundaries (5 min)**

```tsx
import { ErrorBoundary } from '@/components/ui/error-boundary'

export default function CommissionsPage() {
  return (
    <ErrorBoundary>
      <CommissionsContent />
    </ErrorBoundary>
  )
}
```

**2. Replace Loading Skeletons (5 min)**

```tsx
import { TableSkeleton } from '@/components/ui/loading'

{isLoading ? <TableSkeleton rows={5} /> : <DataTable />}
```

**3. Add Empty States (5 min)**

```tsx
import { EmptyState } from '@/components/shared/empty-states'

if (items.length === 0) {
  return (
    <EmptyState
      title="No sales yet"
      description="Create your first sale to get started."
      action={{
        label: "Create Sale",
        onClick: () => router.push('/dashboard/sales/new')
      }}
    />
  )
}
```

**4. Switch to Toast Hook (2 min)**

```tsx
import { useAppToast } from '@/hooks/use-app-toast'

const toast = useAppToast()
toast.saved()
toast.commissionApproved()
```

**5. Add ARIA Labels (3 min)**

```tsx
import { ARIA_LABELS } from '@/lib/accessibility'

<button aria-label={ARIA_LABELS.approve('commission')}>
  <CheckIcon />
</button>
```

#### Testing Checklist

**Desktop:**
- Loading states appear correctly
- Error boundaries catch errors gracefully
- Empty states show when no data
- Toast notifications work
- Tables display properly

**Mobile (< 768px):**
- Tables convert to cards
- Buttons are large enough (min 44x44px)
- Forms easy to fill
- Navigation accessible

**Accessibility:**
- Tab through all interactive elements
- Test with screen reader
- Check color contrast (4.5:1 minimum)
- Verify ARIA labels on icon buttons

---

## Common Tasks Across All Phases

### Environment Variables Setup

```env
# Phase 3 - Email Notifications
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
COMPANY_NAME=YourCompany
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Migrations

```bash
# After adding any Prisma schema changes
npx prisma generate
npx prisma migrate dev --name description_of_changes
# Or for Vercel Postgres:
npx prisma db push
```

### Testing Development Server

```bash
npm run dev
# Visit: http://localhost:3000
```

### Deployment to Production

```bash
git add .
git commit -m "feat: add step 6 enhancements"
git push origin main
# Vercel auto-deploys
```

---

## Overall Progress Tracking

```
Phase 1: Salesperson Portal          ✅ 5 min install
Phase 2: Bulk Payout Processing      ✅ 10 min install
Phase 3: Email Notifications         ✅ 15 min install
Phase 4: Audit Logs                  ✅ 20 min install
Phase 5: Final Polish                ✅ 15 min install

Total: ~65 minutes for all phases
```

---

## Support and Troubleshooting

### Common Issues

**Database migrations failing:**
```bash
npx prisma format
npx prisma validate
npx prisma db push --skip-generate
npx prisma generate
```

**Environment variables not loading:**
```bash
# Restart dev server after adding .env.local
# For Vercel: Add in dashboard and redeploy
```

**Emails not sending:**
- Verify RESEND_API_KEY is set
- Check Resend dashboard for errors
- Review server console logs

**Audit logs not appearing:**
- Verify migration applied
- Check organizationId matches
- Review console for errors

### Getting Help

- Check individual phase INSTALL files for detailed steps
- Review QUICK reference files for quick lookups
- Check server console logs for errors
- Verify environment variables are set correctly

---

## Production Deployment Checklist

- [ ] All phases installed and tested locally
- [ ] Environment variables added to Vercel
- [ ] Database migrations applied to production
- [ ] Email domain verified in Resend (for Phase 3)
- [ ] Audit logs integrated in key actions (Phase 4)
- [ ] Error boundaries added to all pages (Phase 5)
- [ ] Mobile responsiveness tested
- [ ] Accessibility tested with keyboard and screen reader
- [ ] All features tested in production

---

**Complete installation guide for all Step 6 phases!** 🚀
