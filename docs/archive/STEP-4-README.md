# CommissionFlow - Step 4: Sales Data & Calculations

## Summary

Step 4 brings **everything together** - this is where your commission plans come to life! You can now record sales and automatically calculate commissions.

**What was built:**
- ✅ Sales transaction entry (manual)
- ✅ Automatic commission calculation
- ✅ Commission review & approval workflow
- ✅ Status tracking (Pending → Approved → Paid)
- ✅ Bulk actions
- ✅ Stats and filtering

---

## Files Created (8 new files)

### **Server Layer**
1. **`lib/validations/sales-transaction.ts`** - Validation schemas
2. **`app/actions/sales-transactions.ts`** - Sales CRUD + calculation
3. **`app/actions/commission-calculations.ts`** - Approval workflow

### **UI Components**
4. **`components/sales/sales-transaction-form-dialog.tsx`** - Record sale form
5. **`components/commissions/commission-actions.tsx`** - Approve/reject/paid buttons

### **Pages**
6. **`app/dashboard/sales/page.tsx`** - Sales list & entry
7. **`app/dashboard/commissions/page.tsx`** - Commission review

---

## Installation Steps

### 1. Copy Files to Your Project

```bash
# In your commissionflow directory

# Copy validation
cp lib/validations/sales-transaction.ts [your-project]/lib/validations/

# Copy actions
cp app/actions/sales-transactions.ts [your-project]/app/actions/
cp app/actions/commission-calculations.ts [your-project]/app/actions/

# Copy components
cp -r components/sales [your-project]/components/
cp -r components/commissions [your-project]/components/

# Copy pages
cp -r app/dashboard/sales [your-project]/app/dashboard/
cp -r app/dashboard/commissions [your-project]/app/dashboard/
```

### 2. Verify Database Schema

Your Prisma schema should already have:
- `SalesTransaction`
- `CommissionCalculation`

If you need to update:
```bash
npx prisma generate
npx prisma db push
```

### 3. Start Dev Server

```bash
npm run dev
```

### 4. Test the Features

Visit:
- **Sales:** http://localhost:3000/dashboard/sales
- **Commissions:** http://localhost:3000/dashboard/commissions

---

## How It Works

### The Complete Flow

```
1. Record Sale
   ↓
2. Auto-Calculate Commission (if plan exists)
   ↓
3. Commission Status: PENDING
   ↓
4. Admin Reviews & Approves
   ↓
5. Commission Status: APPROVED
   ↓
6. Admin Marks as Paid
   ↓
7. Commission Status: PAID
```

### Key Concepts

#### Status Lifecycle

**PENDING** → **APPROVED** → **PAID**

- **PENDING**: Just calculated, awaiting review
- **APPROVED**: Reviewed and approved, ready to pay
- **PAID**: Payment has been processed

#### Automatic Calculation

When you record a sale:
1. System checks if the project has an active commission plan
2. If yes, applies the plan's rules to calculate commission
3. Creates CommissionCalculation with status PENDING
4. Links to the sale and salesperson

---

## Features Explained

### 1. Recording Sales

**Manual Entry:**
1. Click "New Sale" on Sales page
2. Enter:
   - Sale amount
   - Sale date
   - Project (required - determines commission plan)
   - Salesperson (required - who gets commission)
   - Description (optional)
3. Commission calculates automatically!

**What Happens:**
- Sale is recorded
- If project has active plan → commission calculated
- Calculation appears in Commissions page as PENDING

### 2. Reviewing Commissions

Navigate to `/dashboard/commissions` to see:
- All commission calculations
- Summary cards (Total, Pending, Approved, Paid)
- Filter by status
- Search by salesperson, project, client, or plan
- Details for each:
  - Sale amount
  - Commission amount
  - Commission % of sale
  - Which plan was used
  - Current status

### 3. Approval Workflow

**For PENDING commissions:**
- Click "Approve" to review and approve
- Click "Reject" to delete if incorrect

**For APPROVED commissions:**
- Click "Mark as Paid" after processing payment
- Click "Reject" if you need to cancel

**For PAID commissions:**
- No actions available (final state)
- Cannot be modified or deleted

### 4. Commission Calculation Logic

The system:
1. Gets the project's active commission plan
2. Gets all rules in that plan
3. Applies each rule to the sale amount
4. Stacks the results (multiple rules add up)
5. Enforces min/max caps per rule
6. Stores the final commission amount

**Example:**
```
Sale: $15,000
Project: "Enterprise Deal"
Plan: "Standard Sales Commission"

Rules:
1. 5% of all sales → $750
2. Flat $500 if > $10k → $500
Total Commission: $1,250
```

---

## Using the Interface

### Sales Page

**Record a Sale:**
1. Go to `/dashboard/sales`
2. Click "New Sale"
3. Fill in form:
   - Amount: $10,000.00
   - Date: Today
   - Project: Select from dropdown
   - Salesperson: Select from dropdown
   - Description: "Q4 Enterprise deal"
4. Click "Record Sale"
5. See confirmation - commission calculated!

**View Sales:**
- Table shows all sales with:
  - Date
  - Amount
  - Project & Client
  - Salesperson
  - Commission (if calculated)
  - Status badge
- Search by any field
- Click project/client names to navigate

### Commissions Page

**Summary Cards:**
- **Total**: All commissions combined
- **Pending**: Awaiting approval
- **Approved**: Ready to pay
- **Paid**: Already processed

**Filter by Status:**
- All Statuses (default)
- Pending only
- Approved only
- Paid only

**Take Actions:**
- **Pending** → Approve or Reject
- **Approved** → Mark as Paid or Reject
- **Paid** → No actions (final)

**Search:**
- By salesperson name
- By project name
- By client name
- By commission plan name

---

## API Examples

### Record a Sale

```typescript
import { createSalesTransaction } from '@/app/actions/sales-transactions'

const result = await createSalesTransaction({
  amount: 10000,
  transactionDate: '2024-01-15',
  description: 'Q4 Enterprise deal',
  projectId: 'project-123',
  userId: 'user-456', // Salesperson
})

if (result.success) {
  console.log('Sale recorded:', result.data.transaction)
  if (result.data.calculation) {
    console.log('Commission calculated:', result.data.calculation.amount)
  }
}
```

### Approve Commission

```typescript
import { approveCalculation } from '@/app/actions/commission-calculations'

const result = await approveCalculation(calculationId)

if (result.success) {
  console.log('Commission approved!')
}
```

### Mark as Paid

```typescript
import { markCalculationPaid } from '@/app/actions/commission-calculations'

const result = await markCalculationPaid(calculationId)

if (result.success) {
  console.log('Marked as paid!')
}
```

### Get All Commissions

```typescript
import { getCommissionCalculations } from '@/app/actions/commission-calculations'

const result = await getCommissionCalculations()

if (result.success) {
  const pending = result.data.filter(c => c.status === 'PENDING')
  console.log(`${pending.length} pending commissions`)
}
```

---

## Component Usage

### Sales Transaction Form

```typescript
import { SalesTransactionFormDialog } from '@/components/sales/sales-transaction-form-dialog'

// Record new sale
<SalesTransactionFormDialog 
  projects={projects} 
  users={users} 
/>

// Edit existing sale
<SalesTransactionFormDialog 
  transaction={existingSale}
  projects={projects} 
  users={users} 
/>
```

### Commission Actions

```typescript
import { CommissionActions } from '@/components/commissions/commission-actions'

<CommissionActions
  calculationId={calculation.id}
  status={calculation.status}
  amount={calculation.amount}
/>
```

---

## Validation

### Sales Transaction
- ✅ Amount must be > 0
- ✅ Date is required
- ✅ Project must exist and belong to org
- ✅ User must exist and belong to org
- ✅ Description is optional

### Commission Actions
- ✅ Can't approve already paid
- ✅ Can't mark pending as paid (must approve first)
- ✅ Can't mark already paid as paid
- ✅ Can't reject paid commissions

---

## Security

All operations are organization-scoped:
- ✅ Sales belong to organizations
- ✅ Calculations belong to organizations
- ✅ Users can only access their org's data
- ✅ Projects validated before use

---

## Business Rules

### Deletion Rules
- ❌ Cannot delete sale with PAID commissions
- ✅ Can delete sale with PENDING commissions (cascades)
- ✅ Can delete sale with APPROVED commissions (cascades)

### Status Rules
- **PENDING** can become:
  - APPROVED (via approval)
  - Deleted (via rejection)
  
- **APPROVED** can become:
  - PAID (via mark as paid)
  - Deleted (via rejection)
  
- **PAID** is final:
  - Cannot change status
  - Cannot be deleted
  - Sale cannot be deleted

### Calculation Rules
- If project has NO active plan → No calculation created
- If project has active plan → Calculation automatic
- Calculation uses plan's rules at time of sale
- Editing sale doesn't recalculate (preserves history)

---

## Troubleshooting

### "No commission calculated"

**Check:**
1. Does the project have a commission plan attached?
2. Is the plan active (isActive = true)?
3. Does the plan have at least one rule?
4. Are there any errors in browser console?

### "Cannot approve calculation"

**Check:**
1. Is status currently PENDING?
2. Has it already been paid?
3. Do you have the correct permissions?

### "Cannot mark as paid"

**Check:**
1. Is status currently APPROVED?
2. You must approve before marking paid
3. Already paid commissions show no actions

### Commission amount seems wrong

**Verify:**
1. Check the commission plan rules
2. Use the preview calculator on the plan page
3. Verify sale amount is correct
4. Check for min/max caps on rules

---

## What's Next?

With Step 4 complete, you now have:
- ✅ Full sales tracking
- ✅ Automatic commission calculations
- ✅ Approval workflow
- ✅ Status lifecycle management
- ✅ Filtering and search
- ✅ Summary statistics

**Next Steps:** Step 5 - Reporting & Dashboards
- Visual reports and charts
- Performance tracking
- Export capabilities
- Advanced analytics

---

## Testing Checklist

- [ ] Record a sale with a project that has a plan
- [ ] Verify commission calculates automatically
- [ ] See commission in Commissions page as PENDING
- [ ] Approve the commission
- [ ] Verify status changes to APPROVED
- [ ] Mark commission as paid
- [ ] Verify status changes to PAID
- [ ] Try filtering by status
- [ ] Try searching
- [ ] Record sale with project that has NO plan
- [ ] Verify no commission is calculated
- [ ] Try rejecting a PENDING commission

---

## Summary

With Step 4 complete, you now have a complete commission management system with sales tracking, automatic calculations, and approval workflows.
