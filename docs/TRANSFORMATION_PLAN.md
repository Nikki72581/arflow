# ARFlow Project Transformation Plan

## Context

This project is a clone of CommissionFlow (a commission management SaaS portal). We're transforming it into ARFlow - a B2B Accounts Receivable portal where businesses can show invoice documents to their customers, and customers can log in to view and eventually pay their invoices.

**GitHub Repo:** https://github.com/Nikki72581/arflow
**Original Project (for reference):** https://github.com/Nikki72581/commissionflow

## Project Vision

**CommissionFlow Model:**
- Admin (business) manages salespeople
- Salespeople log in to view their commission statements and transactions

**ARFlow Model:**
- Admin (business) manages customers
- Customers log in to view their invoices and account balance

This is essentially the same portal framework with different entities and terminology.

---

## Decision Points

### Branding
- **Product Name:** "ARFlow"
- **Tagline:** "Give your customers clarity on every invoice"
- **Primary Color Scheme:** "Teal/Blue-green primary"

### Technical Decisions
- **Database:** Prisma + PostgreSQL (existing setup)
- **Environment Variables:** See `.env` file

### Feature Decisions
- **Customer Self-Registration:** No, admin-invite only
- **PDF Statements:** Yes, include statement generation

---

## Transformation Requirements

### Phase 1: Global Renaming & Cleanup

**Find and Replace (case-sensitive where appropriate):**
| Find | Replace |
|------|---------|
| `CommissionFlow` | `ARFlow` |
| `commissionflow` | `arflow` |
| `Salesperson` | `Customer` |
| `salesperson` | `customer` |
| `Salespeople` | `Customers` |
| `salespeople` | `customers` |
| `SalesRep` | `Customer` |
| `salesRep` | `customer` |
| `sales_rep` | `customer` |
| `sales_reps` | `customers` |

**Files to specifically update:**
- `package.json` - name, description
- `README.md` - complete rewrite for new product
- `.env.example` - update variable names if needed
- Any SEO/meta tags in layout files
- Page titles throughout the app

### Phase 2: Database Schema Changes

**Entities to KEEP (with minimal changes):**
- `organizations` - no changes needed
- `users` - no changes needed (these are admin users)

**Entities to RENAME/TRANSFORM:**
- `sales_reps` → `customers`
  - Keep: id, organization_id, email, auth_user_id, created_at, updated_at
  - Add: customer_number, company_name, contact_name, phone, billing address fields, credit_limit, current_balance, portal_enabled, last_login_at
  - Remove: commission-specific fields

- `sales_transactions` → `ar_documents`
  - Keep: id, organization_id, created_at, updated_at
  - Add: customer_id, document_type (invoice/credit_memo/debit_memo), document_number, reference_number, document_date, due_date, subtotal, tax_amount, total_amount, amount_paid, balance_due, status (open/partial/paid/void), description, notes, customer_notes, source_system, source_id
  - Remove: commission-specific fields (rate, commission_amount, etc.)

**Entities to REMOVE (or archive for now):**
- `commission_plans` - not needed for AR portal
- `plan_rules` - not needed
- `commission_calculations` - not needed

**Entities to ADD:**
- `customer_payments` - id, organization_id, customer_id, payment_number, payment_date, amount, payment_method, reference_number, status, created_at
- `payment_applications` - id, payment_id, ar_document_id, amount_applied, created_at

### Phase 3: Folder & Component Restructuring

**Rename these folders/files:**
```
/components/salespeople/     → /components/customers/
/app/salespeople/            → /app/customers/
/app/api/salespeople/        → /app/api/customers/
```

**Component renaming pattern:**
- `SalespersonCard` → `CustomerCard`
- `SalespersonList` → `CustomerList`
- `SalespersonForm` → `CustomerForm`
- `SalespersonDashboard` → `CustomerPortal`
- `TransactionTable` → `InvoiceTable`
- `TransactionRow` → `InvoiceRow`
- `TransactionDetail` → `InvoiceDetail`

**Pages/routes to transform:**
| Old Route | New Route | Purpose |
|-----------|-----------|---------|
| `/dashboard` (admin) | `/dashboard` | Admin AR overview |
| `/dashboard` (rep) | `/portal` | Customer invoice portal |
| `/salespeople` | `/customers` | Customer list |
| `/salespeople/[id]` | `/customers/[id]` | Customer detail |
| `/transactions` | `/invoices` | Invoice list (admin) |
| `/payouts` | `/payments` | Payment tracking |

**Pages/features to REMOVE or HIDE for now:**
- `/plans` - commission plans (not applicable)
- Any commission calculation logic
- Export/Pay/Approve functionality (defer to later phase)

### Phase 4: UI Content Changes

**Admin Dashboard widgets to show:**
- Total AR Outstanding (sum of all open invoice balances)
- AR Aging Summary (Current, 1-30, 31-60, 61-90, 90+ days)
- Recent Payments Received
- Customers with Overdue Balances
- Quick Actions: Add Invoice, Record Payment

**Customer Portal dashboard to show:**
- Account Balance Due
- List of Invoices (with filter: Open, Paid, All)
- Recent Payments
- "Pay Now" button (disabled/placeholder for now with tooltip "Coming Soon")
- Download Statement link (if PDF feature enabled)

**Status badge mappings:**
| Context | Values |
|---------|--------|
| Invoice Status | Open (blue), Partial (yellow), Paid (green), Void (gray) |
| Payment Status | Pending (yellow), Applied (green), Void (gray) |
| Aging | Current (green), 1-30 (blue), 31-60 (yellow), 61-90 (orange), 90+ (red) |

### Phase 5: Authentication & Roles

**Role mapping:**
- `admin` → `admin` (no change - business users)
- `salesperson` → `customer` (portal users)

**Auth metadata structure:**
```typescript
// User metadata in Clerk/Prisma
{
  role: 'admin' | 'customer',
  organizationId: string,
  customerId?: string  // Only for customer role
}
```

**Access control:**
- Admins see all customers and all invoices for their organization
- Customers see only their own invoices and payments

### Phase 6: Data Import

**CSV Import template for invoices:**
```csv
document_number,customer_email,document_type,document_date,due_date,total_amount,description
INV-0001,customer@example.com,invoice,2025-01-15,2025-02-14,1500.00,January Consulting Services
```

**Import should:**
- Match customer by email (within organization)
- Create invoice record
- Calculate balance_due (total_amount - amount_paid)
- Set status based on balance

---

## What NOT to Change (Keep As-Is)

1. **Authentication flow** - Keep Clerk/Supabase auth setup
2. **Multi-tenant architecture** - Organization-based isolation
3. **Basic layout structure** - Sidebar, header, main content pattern
4. **UI component library** - Keep Shadcn/Tailwind setup
5. **Deployment config** - Vercel setup

---

## Implementation Order

Implement in this order:

1. **Global renaming pass** - Update all branding and terminology
2. **Database schema** - Create migration for new tables
3. **Customer model** - Replace salesperson with customer entity
4. **Invoice model** - Replace transactions with ar_documents
5. **Admin pages** - Customer list, customer detail, invoice list
6. **Customer portal** - Portal dashboard, invoice view
7. **Import functionality** - CSV import for invoices
8. **Dashboard widgets** - AR aging, balances, etc.

---

## Current Progress

See [TRANSFORMATION_STATUS.md](./TRANSFORMATION_STATUS.md) for current progress and completed work.
