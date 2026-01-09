# 🔗 Integration Guide: Email Notifications

## How to Add Notifications to Your Existing Code

### Option 1: Approve Commission with Notification

When approving a commission in your existing code, add notification:

```typescript
// Your existing approve function
import { sendCommissionApprovedNotification } from '@/app/actions/email-notifications'

async function approveCommission(calculationId: string) {
  // Your existing approval logic
  const result = await prisma.commissionCalculation.update({
    where: { id: calculationId },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
    },
  })

  // ADD THIS: Send notification (async, don't wait)
  sendCommissionApprovedNotification(calculationId)
    .then((notifResult) => {
      if (notifResult.success) {
        console.log('Approval notification sent')
      }
    })
    .catch((error) => {
      console.error('Failed to send notification:', error)
    })

  return result
}
```

### Option 2: Pay Single Commission with Notification

When marking a single commission as paid:

```typescript
import { sendCommissionPaidNotification } from '@/app/actions/email-notifications'

async function markAsPaid(calculationId: string) {
  // Your existing payment logic
  const result = await prisma.commissionCalculation.update({
    where: { id: calculationId },
    data: {
      status: 'PAID',
      paidAt: new Date(),
    },
  })

  // ADD THIS: Send notification
  sendCommissionPaidNotification(calculationId)
    .then((notifResult) => {
      if (notifResult.success) {
        console.log('Payment notification sent')
      }
    })
    .catch((error) => {
      console.error('Failed to send notification:', error)
    })

  return result
}
```

### Option 3: Update Your Bulk Payout

**Easy Way:** Replace your bulk-payout.ts with bulk-payout-with-notifications.ts

```bash
# Backup current version
cp src/app/actions/bulk-payout.ts src/app/actions/bulk-payout.backup.ts

# Replace with notification-enabled version
cp bulk-payout-with-notifications.ts src/app/actions/bulk-payout.ts
```

Notifications will be sent automatically!

---

## Where to Integrate Notifications

### 1. Commission Approval Flow

**File:** Your commission approval action (e.g., `commission-calculations.ts`)

**Function:** `approveCommission` or similar

**Add after:** Status update to APPROVED

**Code:**
```typescript
sendCommissionApprovedNotification(calculationId).catch(console.error)
```

### 2. Bulk Payout Flow

**File:** `bulk-payout.ts`

**Function:** `bulkMarkAsPaid`

**Already integrated** if you use the updated version!

### 3. Individual Payout Flow (if you have one)

**File:** Commission management actions

**Function:** Single commission payment

**Add after:** Status update to PAID

**Code:**
```typescript
sendCommissionPaidNotification(calculationId).catch(console.error)
```

---

## Notification Settings

### Enable/Disable Notifications

Notifications automatically disable if `RESEND_API_KEY` is not configured.

To manually check status:

```typescript
import { areNotificationsEnabled } from '@/app/actions/email-notifications'

const status = await areNotificationsEnabled()
console.log('Notifications enabled:', status.data.enabled)
```

### Disable for Specific Action

```typescript
// In bulk payout dialog
await bulkMarkAsPaid({
  calculationIds,
  sendNotifications: false  // Disable for this batch
})
```

---

## Testing Notifications

### Test Email Setup

1. **Use Test Email:**
```env
RESEND_FROM_EMAIL=onboarding@resend.dev
```

2. **Send to Your Email:**
Update Resend dashboard to deliver test emails to your personal email

### Test Individual Notification

```typescript
// In your dev environment
import { sendCommissionApprovedNotification } from '@/app/actions/email-notifications'

// Replace with real calculation ID from your database
const result = await sendCommissionApprovedNotification('clxxx...')
console.log(result)
```

### Test Bulk Notification

```typescript
import { sendBulkPayoutNotifications } from '@/app/actions/email-notifications'

// Replace with real calculation IDs
const result = await sendBulkPayoutNotifications(['clxxx1', 'clxxx2'])
console.log(result)
```

---

## Email Template Customization

### Change Colors

**File:** `lib/email-templates.ts`

Find the gradient in the header:

```css
/* Current purple gradient */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Change to blue gradient */
background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);

/* Change to green gradient */
background: linear-gradient(135deg, #10b981 0%, #059669 100%);
```

### Change Company Name

**File:** `.env.local`

```env
COMPANY_NAME=Your Company Name
```

### Change Email Footer

**File:** `lib/email-templates.ts`

Update the `getEmailWrapper` function's footer section.

---

## Troubleshooting

### No Emails Being Sent

**Check:**
1. Is `RESEND_API_KEY` set in `.env.local`?
2. Is Resend API key valid?
3. Check server logs for errors
4. Is `from` email verified in Resend?

**Debug:**
```typescript
const status = await areNotificationsEnabled()
console.log(status)
```

### Emails Going to Spam

**Solutions:**
1. Verify your domain in Resend
2. Add SPF/DKIM records
3. Use a verified sending domain
4. Don't use generic domains for testing

### Wrong Email Template

**Check:**
1. Correct function called? (approved vs paid)
2. Data passed correctly?
3. Template HTML rendering properly?

**Debug:**
```typescript
// Log the HTML before sending
console.log(emailHtml)
```

### Notifications Slow

**Normal:** Emails are sent async and don't block the response

**If truly slow:**
1. Check Resend API status
2. Review network logs
3. Consider background job queue for large batches

---

## Production Checklist

- [ ] Resend account created
- [ ] API key added to Vercel
- [ ] Domain verified in Resend
- [ ] DNS records configured (SPF, DKIM)
- [ ] FROM_EMAIL set to verified domain
- [ ] Tested with real email addresses
- [ ] Templates reviewed and approved
- [ ] Company name/branding updated
- [ ] Reply-to email configured
- [ ] Spam test passed

---

## Environment Variables Summary

```env
# Required
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Recommended
RESEND_FROM_EMAIL=noreply@yourdomain.com
COMPANY_NAME=Your Company Name
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Optional
RESEND_REPLY_TO_EMAIL=support@yourdomain.com
```

---

**Ready to send notifications!** 📧
