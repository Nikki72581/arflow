# Quick Reference - Step 4

## Files Created

```
commissionflow/
│
├── lib/validations/
│   └── sales-transaction.ts        # ✅ Step 4 - Validation schemas
│
├── app/actions/
│   ├── sales-transactions.ts       # ✅ Step 4 - Sales CRUD
│   └── commission-calculations.ts  # ✅ Step 4 - Approval workflow
│
├── app/dashboard/
│   ├── sales/
│   │   └── page.tsx               # ✅ Step 4 - Sales list
│   └── commissions/
│       └── page.tsx               # ✅ Step 4 - Commission review
│
└── components/
    ├── sales/
    │   └── sales-transaction-form-dialog.tsx  # ✅ Step 4 - Sale entry
    └── commissions/
        └── commission-actions.tsx   # ✅ Step 4 - Approve/reject/paid
```

---

## Quick Commands

```bash
# Copy all Step 4 files
cp -r [downloaded-files]/* [your-project]/

# Generate Prisma
npx prisma generate

# Start dev
npm run dev

# Visit
open http://localhost:3000/dashboard/sales
open http://localhost:3000/dashboard/commissions
```

---

## Status Flow

```
PENDING → APPROVED → PAID
  ↓          ↓
REJECTED   REJECTED
```

Actions by status:
- **PENDING**: Approve or Reject
- **APPROVED**: Mark as Paid or Reject
- **PAID**: No actions (final)

---

## Key Server Actions

### Sales Transactions

```typescript
// Create sale (auto-calculates commission)
await createSalesTransaction({
  amount: 10000,
  transactionDate: '2024-01-15',
  projectId: 'project-id',
  userId: 'user-id',
  description: 'Optional'
})

// Get all sales
const result = await getSalesTransactions()

// Update sale
await updateSalesTransaction(id, { amount: 12000 })

// Delete sale (fails if has paid commissions)
await deleteSalesTransaction(id)

// Recalculate with different plan
await recalculateCommission(transactionId, planId)
```

### Commission Calculations

```typescript
// Get all calculations
const result = await getCommissionCalculations()

// Approve (PENDING → APPROVED)
await approveCalculation(calculationId)

// Mark as paid (APPROVED → PAID)
await markCalculationPaid(calculationId)

// Reject (deletes calculation)
await rejectCalculation(calculationId)

// Bulk approve
await bulkApproveCalculations({
  calculationIds: ['id1', 'id2', 'id3']
})

// Get user's calculations
await getUserCalculations(userId)
```

---

## Complete Workflow Example

```typescript
// 1. Record a sale
const sale = await createSalesTransaction({
  amount: 15000,
  transactionDate: '2024-01-15',
  projectId: 'proj-123',  // Has active commission plan
  userId: 'user-456'       // Salesperson
})

// Commission automatically calculated!
console.log(sale.data.calculation)
// { amount: 1500, status: 'PENDING', ... }

// 2. Get pending commissions
const pending = await getCommissionCalculations()
const pendingOnes = pending.data.filter(c => c.status === 'PENDING')

// 3. Approve
await approveCalculation(pendingOnes[0].id)

// 4. Mark as paid
await markCalculationPaid(pendingOnes[0].id)

// Done! Commission lifecycle complete
```

---

## Component Usage

### Sales Form

```typescript
import { SalesTransactionFormDialog } from '@/components/sales/sales-transaction-form-dialog'

<SalesTransactionFormDialog 
  projects={projects}
  users={users}
/>
```

### Commission Actions

```typescript
import { CommissionActions } from '@/components/commissions/commission-actions'

<CommissionActions
  calculationId={calc.id}
  status={calc.status}  // PENDING | APPROVED | PAID
  amount={calc.amount}
/>
```

---

## Routes After Step 4

- `/dashboard/sales` - Sales list & entry
- `/dashboard/commissions` - Commission review
- `/dashboard/commissions?status=pending` - Filter pending
- `/dashboard/commissions?status=approved` - Filter approved
- `/dashboard/commissions?status=paid` - Filter paid

---

## Business Rules

### Sales
- Amount must be > 0
- Project must have active plan for auto-calculation
- User must be in same organization
- Can edit sale without recalculating commission

### Commissions
- Auto-created when sale is recorded (if plan exists)
- Start as PENDING
- Must approve before marking paid
- Cannot modify PAID commissions
- Cannot delete sale with PAID commissions

### Status Transitions
```
PENDING:
  → APPROVED (via approveCalculation)
  → DELETED (via rejectCalculation)

APPROVED:
  → PAID (via markCalculationPaid)
  → DELETED (via rejectCalculation)

PAID:
  → No transitions (final state)
```

---

## Validation Rules

### Sales Transaction
- ✅ amount: number > 0 (required)
- ✅ transactionDate: string date (required)
- ✅ projectId: valid project ID (required)
- ✅ userId: valid user ID (required)
- ✅ description: string (optional)

### Commission Actions
- ✅ Can't approve if already PAID
- ✅ Can't mark PENDING as paid (approve first)
- ✅ Can't mark already PAID as paid
- ✅ Can't reject PAID

---

## Troubleshooting

### No commission calculated?
→ Check project has active commission plan with rules

### Can't approve?
→ Status must be PENDING, not already PAID

### Can't mark as paid?
→ Must approve first (PENDING → APPROVED → PAID)

### Can't delete sale?
→ Has PAID commissions - cannot delete

---

## Quick Test Script

```typescript
// Complete workflow test
async function testWorkflow() {
  // 1. Record sale
  const sale = await createSalesTransaction({
    amount: 10000,
    transactionDate: new Date().toISOString().split('T')[0],
    projectId: 'your-project-id',
    userId: 'your-user-id'
  })
  
  console.log('✅ Sale recorded')
  console.log('✅ Commission:', sale.data.calculation?.amount)
  
  // 2. Approve
  if (sale.data.calculation) {
    await approveCalculation(sale.data.calculation.id)
    console.log('✅ Approved')
    
    // 3. Mark paid
    await markCalculationPaid(sale.data.calculation.id)
    console.log('✅ Marked as paid')
  }
}
```

---

## Summary Statistics

Get stats:
```typescript
// Sales stats
const salesStats = await getSalesStats()
// { totalSales, totalAmount, thisMonthSales, thisMonthAmount }

// Commission stats
const commStats = await getCommissionStats()
// { totalCalculations, totalAmount, pendingAmount, approvedAmount, paidAmount }
```

---

## What's Next?

**Step 5** will add:
- Dashboard with charts
- Performance reports
- CSV export
- Date range filtering
- Analytics & insights

---

## Testing

Use the above commands and workflow examples to test your sales and commission implementation.
