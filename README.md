# CommissionFlow

A modern, full-stack commission management platform built with Next.js. Track sales, manage commission plans, calculate payouts, and streamline your sales team operations.

## Features

### Core Functionality
- **Client & Project Management** - Organize clients and projects with full CRUD operations
- **Commission Plan Builder** - Create flexible commission structures with multiple rule types
  - Percentage-based commissions
  - Flat amount commissions
  - Tiered/accelerator commissions with thresholds
  - Min/max caps on payouts
- **Sales Tracking** - Record sales transactions and link them to projects
- **Automatic Calculations** - Apply commission plans to sales automatically
- **Salesperson Portal** - Self-service dashboard for sales team members
- **Bulk Payouts** - Process multiple commission payments at once
- **Email Notifications** - Automated notifications for approvals and payments
- **Audit Logs** - Comprehensive activity tracking for compliance
- **Reporting & Analytics** - Dashboards, charts, and export capabilities

### Technical Features
- Multi-tenant organization support with Clerk authentication
- Type-safe server actions with Zod validation
- Real-time data updates with automatic revalidation
- Responsive UI built with Tailwind CSS and shadcn/ui
- PostgreSQL database with Prisma ORM
- CSV import/export functionality
- Comprehensive test coverage (unit, integration, E2E)

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io/)
- **Authentication**: [Clerk](https://clerk.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **Email**: [Resend](https://resend.com/)
- **Testing**: [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/)

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL database
- Clerk account for authentication
- Resend account for email notifications (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd commissionflow
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Required environment variables:
```env
# Database
DATABASE_URL="postgresql://..."

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# Resend (for email notifications)
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# Application
COMPANY_NAME="Your Company Name"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Seed demo data (optional):
```bash
npm run db:seed
```

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
commissionflow/
├── app/
│   ├── actions/           # Server actions for data mutations
│   ├── api/              # API routes (webhooks, etc.)
│   ├── dashboard/        # Main application pages
│   │   ├── clients/      # Client management
│   │   ├── projects/     # Project management
│   │   ├── plans/        # Commission plan builder
│   │   ├── sales/        # Sales transaction tracking
│   │   ├── commissions/  # Commission calculations & approvals
│   │   ├── my-commissions/ # Salesperson portal
│   │   └── audit-logs/   # Audit log viewer
│   └── (auth)/           # Authentication pages
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── clients/         # Client-specific components
│   ├── projects/        # Project-specific components
│   ├── plans/           # Commission plan components
│   ├── sales/           # Sales components
│   ├── commissions/     # Commission components
│   └── shared/          # Shared components
├── lib/
│   ├── validations/     # Zod schemas for validation
│   ├── commission-calculator.ts  # Commission calculation engine
│   ├── email.ts         # Email service
│   ├── audit-log.ts     # Audit logging utilities
│   └── utils.ts         # Utility functions
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Seed script
└── tests/
    ├── unit/            # Unit tests
    ├── integration/     # Integration tests
    └── e2e/             # End-to-end tests
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm run db:seed      # Seed database with demo data

# Testing
npm run test:all         # Run all tests
npm run test:unit        # Run unit tests only
npm run test:integration # Run integration tests
npm run test:e2e         # Run E2E tests
npm run test:coverage    # Generate coverage report
```

## Documentation

### Implementation Guides
- [STEP-2-README.md](STEP-2-README.md) - Clients & Projects Management
- [STEP-3-README.md](STEP-3-README.md) - Commission Plan Builder
- [STEP-4-README.md](STEP-4-README.md) - Sales Data & Calculations
- [STEP-5-INSTALL.md](STEP-5-INSTALL.md) - Reporting & Dashboards
- [STEP-6-GUIDE.md](STEP-6-GUIDE.md) - Advanced Features

### Quick Reference
- [STEP-3-QUICK-REFERENCE.md](STEP-3-QUICK-REFERENCE.md) - Commission plans quick reference
- [STEP-4-QUICK-REFERENCE.md](STEP-4-QUICK-REFERENCE.md) - Sales & calculations quick reference
- [STEP-6-QUICK-REFERENCE.md](STEP-6-QUICK-REFERENCE.md) - Advanced features quick reference

### Setup Guides
- [RESEND-SETUP.md](RESEND-SETUP.md) - Email service configuration
- [INTEGRATION-GUIDE.md](INTEGRATION-GUIDE.md) - Email notification integration
- [TEAM_INVITATIONS_SETUP.md](TEAM_INVITATIONS_SETUP.md) - Team invitation setup
- [FILE-STRUCTURE.md](FILE-STRUCTURE.md) - Detailed project structure

### Testing
- [TESTING.md](TESTING.md) - Comprehensive testing guide
- [TESTING-SUMMARY.md](TESTING-SUMMARY.md) - Test infrastructure overview
- [TEST-IDS-GUIDE.md](TEST-IDS-GUIDE.md) - Guide for adding test IDs to components

## Key Features

### Multi-Rule Commission Plans
Stack multiple commission rules to create complex compensation structures:
- Base percentage commission (e.g., 5% of all sales)
- Bonus for large deals (e.g., $1,000 for sales over $50k)
- Accelerator for high performers (e.g., additional 2% above $100k)

### Organization Multi-Tenancy
All data is automatically scoped to organizations:
- Secure data isolation between organizations
- Users can belong to multiple organizations
- Automatic filtering in all queries

### Type-Safe Server Actions
All data operations use Next.js Server Actions with full type safety:
```typescript
const result = await createCommissionPlan({
  name: "Standard Sales",
  isActive: true
})

if (result.success) {
  console.log(result.data) // Fully typed
}
```

### Workflow Automation
- Commissions automatically calculated when sales are recorded
- Email notifications sent on approval and payment
- Bulk payout processing for efficiency
- Complete audit trail for compliance

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correctly set in `.env.local`
- Ensure PostgreSQL is running
- Run `npx prisma db push` to sync schema

### Authentication Issues
- Check Clerk API keys are correct
- Verify user has been assigned to an organization
- Clear cookies and sign in again

### Missing UI Components
Install required shadcn/ui components:
```bash
npx shadcn-ui@latest add button card input label table badge dialog
```

### Testing Issues
See [TESTING.md](TESTING.md) for detailed troubleshooting guides.

## Contributing

This is a private project. Please contact the repository owner for contribution guidelines.

## License

Proprietary - All rights reserved.

## Support

For questions or issues, please contact the development team or create an issue in the repository.
