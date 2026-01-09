# CommissionFlow - Step 3: Commission Plan Builder

## Summary

Step 3 adds the **core feature** of CommissionFlow - the ability to define and manage commission plans with flexible rules.

**What was built:**
- ✅ Commission plan & rule management (full CRUD)
- ✅ Three rule types: Percentage, Flat Amount, Tiered
- ✅ Min/max caps on commissions
- ✅ Interactive preview calculator
- ✅ Smart validation for each rule type
- ✅ Plan list and detail pages
- ✅ Attach plans to projects

---

## Files Created (12 new files)

### **Server Layer**
1. **`lib/validations/commission-plan.ts`** - Zod validation schemas
2. **`app/actions/commission-plans.ts`** - Plan & rule server actions
3. **`lib/commission-calculator.ts`** - Calculation engine

### **UI Components**
4. **`components/plans/plan-form-dialog.tsx`** - Create/edit plan dialog
5. **`components/plans/rule-form-dialog.tsx`** - Add/edit rule dialog
6. **`components/plans/commission-preview.tsx`** - Preview calculator
7. **`components/plans/plan-actions.tsx`** - Plan row actions menu
8. **`components/plans/rule-actions.tsx`** - Rule row actions menu

### **Pages**
9. **`app/dashboard/plans/page.tsx`** - Plan list
10. **`app/dashboard/plans/[id]/page.tsx`** - Plan builder/detail

---

## Installation Steps

### 1. Copy Files to Your Project

```bash
# In your commissionflow directory

# Copy validation
cp lib/validations/commission-plan.ts [your-project]/lib/validations/

# Copy calculation engine
cp lib/commission-calculator.ts [your-project]/lib/

# Copy actions
cp app/actions/commission-plans.ts [your-project]/app/actions/

# Copy components
cp -r components/plans [your-project]/components/

# Copy pages
cp -r app/dashboard/plans [your-project]/app/dashboard/
```

### 2. Verify Database Schema

Your Prisma schema should already have these models from Step 1:
- `CommissionPlan`
- `CommissionRule`

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
- **Plans list:** http://localhost:3000/dashboard/plans
- Create a plan, add rules, test the preview!

---

## Features Explained

### Commission Rule Types

#### 1. **Percentage Rule**
Simple percentage of the sale amount.

**Example:**
- Rule: 10% of sale
- Sale: $10,000
- **Commission: $1,000**

**Use cases:**
- Standard sales commission
- Referral fees
- Partner revenue share

#### 2. **Flat Amount Rule**
Fixed amount per sale, regardless of size.

**Example:**
- Rule: $500 per sale
- Sale: $1,000 or $100,000
- **Commission: $500** (same regardless)

**Use cases:**
- Lead generation fees
- Simple finder's fees
- Flat bonuses

#### 3. **Tiered Rule**
Different rates at different thresholds - accelerators!

**Example:**
- Rule: 5% up to $10,000, then 7% above
- Sale: $15,000
- Calculation:
  - First $10,000 → $500 (5%)
  - Remaining $5,000 → $350 (7%)
- **Total Commission: $850**

**Use cases:**
- Accelerators (higher rate for bigger deals)
- Volume-based incentives
- Performance tiers

### Min/Max Caps

Optional caps on any rule:

**Example:**
- Rule: 10% of sale
- Min: $100 (commission floor)
- Max: $5,000 (commission cap)

**Scenarios:**
- Sale $500 → Commission $100 (raised to minimum)
- Sale $10,000 → Commission $1,000 (normal)
- Sale $100,000 → Commission $5,000 (capped at maximum)

### Multiple Rules Per Plan

Plans can have multiple rules that **stack**:

**Example: "Enterprise Sales Plan"**
```
Rule 1: 5% of all sales (base)
Rule 2: $1,000 flat if sale > $50,000 (bonus)
Rule 3: Additional 2% on amount above $100,000 (accelerator)
```

On a $120,000 sale:
- Rule 1: $6,000 (5% of $120k)
- Rule 2: $1,000 (bonus for >$50k)
- Rule 3: $400 (2% of $20k above threshold)
- **Total: $7,400**

---

## How to Use

### Creating a Commission Plan

1. Go to `/dashboard/plans`
2. Click "New Commission Plan"
3. Fill in:
   - **Name** (required): "Standard Sales Commission"
   - **Description** (optional): "For all direct sales"
   - **Project** (optional): Attach to a specific project
   - **Active**: Check if plan should be active
4. Click "Create Plan"

### Adding Rules

1. Open a plan (click on plan name)
2. Click "Add Rule" in the Rules section
3. Select rule type and fill in:
   - **Percentage**: Enter percentage (0-100)
   - **Flat Amount**: Enter dollar amount
   - **Tiered**: Enter base rate, threshold, and tier rate
4. Optionally add min/max caps
5. Click "Add Rule"

### Testing with Preview

1. The preview calculator updates automatically
2. Change the "Sale Amount" to test different scenarios
3. See breakdown of each rule's contribution
4. Try the quick example buttons (5k, 10k, 25k, etc.)

### Attaching to Projects

**Option A: During plan creation**
- Select project in the "Attach to Project" dropdown

**Option B: Edit existing plan**
- Click ⋯ menu → Edit
- Select or change project

---

## API Examples

### Create a Plan

```typescript
import { createCommissionPlan } from '@/app/actions/commission-plans'

const result = await createCommissionPlan({
  name: "Standard Sales Commission",
  description: "10% on all sales",
  projectId: "project-123", // optional
  isActive: true
})

if (result.success) {
  console.log('Plan created:', result.data.id)
}
```

### Add a Percentage Rule

```typescript
import { createCommissionRule } from '@/app/actions/commission-plans'

const result = await createCommissionRule({
  commissionPlanId: "plan-123",
  ruleType: "PERCENTAGE",
  percentage: 10,
  minAmount: 100,
  maxAmount: 5000,
  description: "Base commission"
})
```

### Add a Tiered Rule

```typescript
const result = await createCommissionRule({
  commissionPlanId: "plan-123",
  ruleType: "TIERED",
  percentage: 5,           // Base rate up to threshold
  tierThreshold: 10000,    // Threshold amount
  tierPercentage: 7,       // Rate above threshold
  description: "Accelerator for big deals"
})
```

### Calculate Commission

```typescript
import { calculateCommission } from '@/lib/commission-calculator'

const rules = [
  { ruleType: 'PERCENTAGE', percentage: 10 },
  { ruleType: 'FLAT_AMOUNT', flatAmount: 500 }
]

const result = calculateCommission(15000, rules)
console.log(result.finalAmount) // $2,000 (10% + $500)
```

---

## Component Usage

### Plan Form Dialog

```typescript
import { CommissionPlanFormDialog } from '@/components/plans/plan-form-dialog'

// Create new plan
<CommissionPlanFormDialog projects={projects} />

// Edit existing plan
<CommissionPlanFormDialog plan={existingPlan} projects={projects} />

// Custom trigger
<CommissionPlanFormDialog
  projects={projects}
  trigger={<Button>Custom Button</Button>}
/>
```

### Rule Form Dialog

```typescript
import { RuleFormDialog } from '@/components/plans/rule-form-dialog'

// Add new rule
<RuleFormDialog planId={planId} />

// Edit existing rule
<RuleFormDialog planId={planId} rule={existingRule} />
```

### Commission Preview

```typescript
import { CommissionPreview } from '@/components/plans/commission-preview'

<CommissionPreview rules={plan.rules} />
```

---

## Validation

### Plan Validation

- ✅ Name is required (1-100 characters)
- ✅ Description is optional
- ✅ Project must exist and belong to organization
- ✅ isActive is boolean

### Rule Validation

**Type-specific:**
- **PERCENTAGE**: Must have percentage (0-100)
- **FLAT_AMOUNT**: Must have flatAmount (> 0)
- **TIERED**: Must have all three: percentage, tierThreshold, tierPercentage

**Cap validation:**
- ✅ minAmount must be < maxAmount
- ✅ All amounts must be >= 0
- ✅ Percentages must be 0-100

---

## Security

All operations are organization-scoped:
- ✅ Plans belong to organizations
- ✅ Rules belong to plans in organizations
- ✅ Users can only access their org's plans
- ✅ Projects are validated before attachment

---

## Next Steps

With Step 3 complete, you now have:
- ✅ Full commission plan management
- ✅ Flexible rule system
- ✅ Interactive preview
- ✅ Three different calculation methods
- ✅ Min/max caps
- ✅ Multiple rules per plan

**Ready for Step 4:** Sales Data & Calculations
- Import/enter sales transactions
- Automatically calculate commissions
- Apply plans to actual sales
- Track what's owed vs paid

---

## Troubleshooting

### "Commission plan not found" Error

Make sure:
1. The plan belongs to your organization
2. You're using the correct plan ID
3. The plan hasn't been deleted

### Rules Not Calculating Correctly

Check:
1. Rule type matches the fields provided
2. Percentages are entered as whole numbers (10, not 0.10)
3. Tier threshold is less than sale amount for tiered rules
4. Min/max caps are in correct order

### Preview Not Updating

1. Make sure rules have been saved (not just in the form)
2. Refresh the page
3. Check browser console for errors

---

## Testing Checklist

- [ ] Create a commission plan
- [ ] Add a percentage rule
- [ ] Add a flat amount rule
- [ ] Add a tiered rule
- [ ] Test the preview calculator
- [ ] Try the quick example amounts
- [ ] Edit a rule
- [ ] Delete a rule
- [ ] Attach plan to a project
- [ ] Deactivate/activate a plan
- [ ] Delete a plan (should fail if has calculations)

---

## Next Steps

Proceed to [STEP-4-README.md](STEP-4-README.md) to implement sales data tracking and automatic commission calculations.
