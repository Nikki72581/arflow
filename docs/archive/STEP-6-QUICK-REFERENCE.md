# Step 6: Quick Reference Guide

Fast reference for all Step 6 features, commands, and usage patterns.

---

## Phase 1: Salesperson Portal

### What It Does
Self-service portal for salespeople to view their own commissions.

### Key Files
```
app/actions/my-commissions.ts
app/dashboard/my-commissions/page.tsx
app/dashboard/my-commissions/client-page.tsx
```

### Quick Install
```bash
# Download 3 files and place in correct locations
npm run dev
# Visit: /dashboard/my-commissions
```

### Server Actions
```typescript
// Get my commissions
const result = await getMyCommissions(dateRange?)

// Get my stats
const stats = await getMyCommissionStats(dateRange?)

// Get export data
const data = await getMyCommissionExportData(dateRange?)
```

### Features
- Personal commission history
- Stats: Total earned, pending, approved, paid
- Date range filtering (11 presets)
- CSV export
- Status tracking

### Security
- Users only see their own data
- Filtered by authenticated user ID
- No access to other users' commissions

---

## Phase 2: Bulk Payout Processing

### What It Does
Process multiple commission payments at once.

### Key Files
```
app/actions/bulk-payout.ts
components/commissions/bulk-payout-dialog.tsx
components/commissions/bulk-actions-toolbar.tsx
components/commissions/commissions-table-with-bulk.tsx
```

### Quick Install
```bash
# 1. Install checkbox
npx shadcn@latest add checkbox

# 2. Download 4 files and place in project

# 3. Update commissions page
import { CommissionsTableWithBulk } from '@/components/commissions/commissions-table-with-bulk'

<CommissionsTableWithBulk
  commissions={calculations}
  onRefresh={fetchCalculations}
/>
```

### Server Actions
```typescript
// Process bulk payout
const result = await bulkMarkAsPaid({
  calculationIds: ['id1', 'id2', 'id3'],
  paidDate: new Date()
})

// Get preview
const summary = await getPayoutSummary(['id1', 'id2'])

// View history
const history = await getPayoutHistory()
```

### Features
- Bulk selection with checkboxes
- Select all (approved only)
- Floating toolbar with count/total
- Detailed confirmation dialog
- Transaction safety
- Auto-refresh

### User Flow
1. Check approved commissions
2. Click "Mark as Paid"
3. Review summary
4. Confirm payout
5. Done!

---

## Phase 3: Email Notifications

### What It Does
Automatic email alerts when commissions are approved or paid.

### Key Files
```
lib/email.ts
lib/email-templates.ts
app/actions/email-notifications.ts
app/actions/bulk-payout.ts (updated)
```

### Quick Install
```bash
# 1. Install Resend
npm install resend

# 2. Get API key from resend.com

# 3. Add to .env.local
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
COMPANY_NAME=YourCompany
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 4. Download 4 files
# 5. Restart server
npm run dev
```

### Integration
```typescript
import { sendCommissionApprovedNotification } from '@/app/actions/email-notifications'

// After approving:
sendCommissionApprovedNotification(calculationId).catch(console.error)

// After paying:
sendCommissionPaidNotification(calculationId).catch(console.error)
```

### Email Types

**1. Commission Approved**
- Sent: When status → APPROVED
- Shows: Amount, client, project, rate

**2. Commission Paid**
- Sent: When status → PAID
- Shows: Amount, payment date

**3. Bulk Payout Summary**
- Sent: After bulk payout
- Shows: Total, list of commissions

### Environment Variables
```env
# Required
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Recommended
COMPANY_NAME=YourCompany
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Troubleshooting
- No emails? Check RESEND_API_KEY is set
- Going to spam? Verify domain in Resend, add DNS records
- Wrong template? Check correct function called

---

## Phase 4: Audit Logs

### What It Does
Track all important actions for compliance and debugging.

### Key Files
```
lib/audit-log.ts
app/actions/audit-logs.ts
app/dashboard/audit-logs/page.tsx
app/dashboard/audit-logs/client-page.tsx
```

### Quick Install
```bash
# 1. Add AuditLog model to schema.prisma
# 2. Run migration
npx prisma migrate dev --name add_audit_logs

# 3. Download 4 files
# 4. Visit /dashboard/audit-logs
```

### Prisma Schema
```prisma
model AuditLog {
  id             String   @id @default(cuid())
  createdAt      DateTime @default(now())
  userId         String?
  userName       String?
  userEmail      String?
  action         String
  entityType     String
  entityId       String?
  description    String
  metadata       Json?
  organizationId String
  ipAddress      String?
  userAgent      String?

  user           User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([userId])
  @@index([action])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

### Integration
```typescript
import { logCommissionApproval } from '@/lib/audit-log'

// After approving:
logCommissionApproval({
  commissionId: result.id,
  amount: result.amount,
  salespersonId: result.userId,
  salespersonName: `${result.user.firstName} ${result.user.lastName}`,
  approvedBy: { id, name, email },
  organizationId: currentUser.organizationId,
}).catch(console.error)
```

### Actions Logged
- commission_created, commission_approved, commission_paid
- bulk_payout_processed
- sale_created, sale_updated, sale_deleted
- plan_created, plan_updated, plan_activated

### Features
- Complete audit trail
- Filter by user, action, entity type
- CSV export
- Pagination (50 per page)
- IP tracking

---

## Phase 5: Final Polish

### What It Does
Production-ready polish with UX and accessibility.

### Key Files
```
components/ui/loading.tsx
components/ui/error-boundary.tsx
components/shared/empty-states.tsx
components/shared/responsive-table.tsx
hooks/use-app-toast.ts
lib/accessibility.tsx
```

### Quick Install
```bash
# 1. Download 6 files
# 2. Add sr-only CSS to globals.css
# 3. Integrate into pages (see below)
```

### Screen Reader CSS
```css
/* Add to globals.css */
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

### Usage Patterns

**Error Boundaries**
```tsx
import { ErrorBoundary } from '@/components/ui/error-boundary'

<ErrorBoundary>
  <CommissionsPage />
</ErrorBoundary>
```

**Loading States**
```tsx
import { TableSkeleton } from '@/components/ui/loading'

{isLoading ? <TableSkeleton rows={5} /> : <DataTable />}
```

**Empty States**
```tsx
import { EmptyState } from '@/components/shared/empty-states'

if (items.length === 0) {
  return (
    <EmptyState
      title="No sales yet"
      description="Create your first sale to get started."
      action={{ label: "Create Sale", onClick: createSale }}
    />
  )
}
```

**Toast Notifications**
```tsx
import { useAppToast } from '@/hooks/use-app-toast'

const toast = useAppToast()
toast.saved()
toast.commissionApproved()
toast.bulkPayoutProcessed(15, '$12,345.67')
```

**ARIA Labels**
```tsx
import { ARIA_LABELS } from '@/lib/accessibility'

<button aria-label={ARIA_LABELS.approve('commission')}>
  <CheckIcon />
</button>
```

### Features
- Professional loading states
- Graceful error handling
- Beautiful empty states
- Mobile-responsive tables
- Consistent toast notifications
- WCAG 2.1 AA accessibility

---

## Common Commands

### Development
```bash
# Start dev server
npm run dev

# Check TypeScript
npm run type-check

# Format code
npm run format
```

### Database
```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# Push schema (Vercel Postgres)
npx prisma db push

# Open Prisma Studio
npx prisma studio
```

### Deployment
```bash
# Deploy to production
git add .
git commit -m "feat: description"
git push origin main
```

---

## Quick Troubleshooting

### Phase 1 Issues
- No commissions showing? Check user has sales, verify date range filter
- Wrong commissions? Verify clerkId matches database user

### Phase 2 Issues
- Checkbox not showing? Install checkbox component
- Toolbar not appearing? Select commissions first, check z-index
- Payout failing? All must be APPROVED, check organization scope

### Phase 3 Issues
- No emails? Check RESEND_API_KEY, verify Resend dashboard
- Going to spam? Verify domain, add DNS records
- Slow sending? Use async (don't await)

### Phase 4 Issues
- Logs not appearing? Check migration applied, verify organizationId
- Migration fails? Run `npx prisma format`, then `npx prisma validate`
- Filters not working? Check console for errors, verify API calls

### Phase 5 Issues
- Error boundary not catching? Ensure 'use client' directive
- Toast not working? Check Toaster in layout
- Mobile not responsive? Test breakpoints, verify Tailwind classes

---

## Integration Timeline

| Phase | Time | Priority |
|-------|------|----------|
| Phase 1: Salesperson Portal | 5 min | High |
| Phase 2: Bulk Payout | 10 min | High |
| Phase 3: Email Notifications | 15 min | Medium |
| Phase 4: Audit Logs | 20 min | Medium |
| Phase 5: Final Polish | 15 min | High |
| **Total** | **65 min** | |

---

## Testing Checklist

### Quick Test: Phase 1
- [ ] Visit /dashboard/my-commissions
- [ ] Verify stats show
- [ ] Test date filter
- [ ] Export CSV

### Quick Test: Phase 2
- [ ] Select commissions
- [ ] Toolbar appears
- [ ] Process payout
- [ ] Verify all paid

### Quick Test: Phase 3
- [ ] Approve commission
- [ ] Check email received
- [ ] Click link works
- [ ] Test bulk payout emails

### Quick Test: Phase 4
- [ ] Perform action
- [ ] Visit /dashboard/audit-logs
- [ ] Verify log appears
- [ ] Test filters

### Quick Test: Phase 5
- [ ] Loading states work
- [ ] Error boundary catches errors
- [ ] Empty states show
- [ ] Toast notifications work
- [ ] Mobile responsive

---

## Routes Reference

| Route | Description | Phase |
|-------|-------------|-------|
| `/dashboard/my-commissions` | Personal commission portal | 1 |
| `/dashboard/commissions` | Admin view with bulk actions | 2 |
| `/dashboard/audit-logs` | Audit log viewer | 4 |

---

## API Quick Reference

### Phase 1
```typescript
getMyCommissions(dateRange?)
getMyCommissionStats(dateRange?)
getMyCommissionExportData(dateRange?)
```

### Phase 2
```typescript
bulkMarkAsPaid({ calculationIds, paidDate? })
getPayoutSummary(calculationIds)
getPayoutHistory()
```

### Phase 3
```typescript
sendCommissionApprovedNotification(calculationId)
sendCommissionPaidNotification(calculationId)
sendBulkPayoutNotifications(calculationIds)
```

### Phase 4
```typescript
createAuditLog({ action, entityType, description, ... })
logCommissionApproval(params)
logCommissionPayment(params)
logBulkPayout(params)
```

### Phase 5
```typescript
// Toast hook
const toast = useAppToast()
toast.saved() | toast.deleted() | toast.created()
toast.commissionApproved() | toast.commissionPaid()
toast.error() | toast.success() | toast.info()
```

---

## Performance Tips

1. **Database Indexes** - Already included in schemas
2. **Async Operations** - Use for emails and audit logs
3. **Pagination** - 50 entries per page for audit logs
4. **Date Filtering** - Always filter large datasets
5. **Loading States** - Show immediately for perceived performance

---

## Accessibility Quick Wins

- [ ] ARIA labels on all icon buttons
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Screen reader announcements
- [ ] Color contrast 4.5:1 minimum
- [ ] Focus indicators visible
- [ ] Skip to content link
- [ ] Semantic HTML

---

## Mobile Optimization

- [ ] Tables convert to cards (< 768px)
- [ ] Touch targets 44x44px minimum
- [ ] Font sizes 16px minimum
- [ ] Forms stack vertically
- [ ] No horizontal scroll

---

**Complete quick reference for all Step 6 phases!** ⚡
