# ARFlow

A modern B2B Accounts Receivable portal built with Next.js. Give your customers clarity on every invoice with a secure, self-service portal for viewing invoices, checking balances, and managing their account.

## Features

### Core Functionality
- **Customer Management** - Organize and manage your customer accounts
- **Invoice Portal** - Customers can securely view their invoices and account details
- **Document Management** - Track invoices, credit memos, and debit memos
- **Balance Tracking** - Real-time account balance and aging reports
- **Payment Recording** - Track payments and applications to invoices
- **PDF Statements** - Generate and download customer statements
- **CSV Import** - Bulk import invoices from your accounting system
- **Admin Dashboard** - Complete AR overview with aging analysis
- **Audit Logs** - Comprehensive activity tracking for compliance

### Technical Features
- Multi-tenant organization support with Clerk authentication
- Type-safe server actions with Zod validation
- Real-time data updates with automatic revalidation
- Responsive UI built with Tailwind CSS and shadcn/ui
- PostgreSQL database with Prisma ORM
- CSV import/export functionality
- Acumatica ERP integration support

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

## Quick Start

Get up and running in 5 minutes:

```bash
# Clone and install
git clone https://github.com/Nikki72581/arflow
cd arflow
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Set up database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**For detailed setup instructions**, see [docs/setup/installation.md](docs/setup/installation.md).

## Project Structure

```
arflow/
├── src/
│   ├── app/
│   │   ├── actions/           # Server actions for data mutations
│   │   ├── api/              # API routes (webhooks, etc.)
│   │   ├── dashboard/        # Main application pages
│   │   │   ├── customers/    # Customer management
│   │   │   ├── invoices/     # Invoice management
│   │   │   ├── payments/     # Payment tracking
│   │   │   └── portal/       # Customer self-service portal
│   │   └── (auth)/           # Authentication pages
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── customers/       # Customer-specific components
│   │   ├── invoices/        # Invoice components
│   │   ├── payments/        # Payment components
│   │   └── shared/          # Shared components
│   └── lib/
│       ├── validations/     # Zod schemas for validation
│       ├── email.ts         # Email service
│       ├── audit-log.ts     # Audit logging utilities
│       └── utils.ts         # Utility functions
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

## Key Features

### Customer Portal
Your customers get secure access to:
- View all invoices (open, partial, paid)
- Check current account balance
- See aging summary
- Download statements
- View payment history

### Admin Dashboard
Comprehensive AR management:
- Total AR outstanding
- AR aging analysis (Current, 1-30, 31-60, 61-90, 90+ days)
- Customer list with balances
- Recent payments
- Overdue accounts tracking

### Invoice Management
- Import invoices via CSV
- Manual invoice entry
- Support for invoices, credit memos, and debit memos
- Track document status (Open, Partial, Paid, Void)
- Payment application tracking

### Organization Multi-Tenancy
All data is automatically scoped to organizations:
- Secure data isolation between organizations
- Users can belong to multiple organizations
- Automatic filtering in all queries

## Documentation

Comprehensive guides are available in the `docs/` directory:

### Setup Guides
- [Installation Guide](docs/setup/installation.md) - Complete setup instructions
- [Acumatica Integration](docs/setup/acumatica-integration.md) - ERP integration setup
- [Email Setup](docs/setup/email-setup.md) - Configure email notifications
- [Team Setup](docs/setup/team-setup.md) - Multi-user and organization configuration

### Development Guides
- [Development Workflow](docs/guides/development.md) - Git workflow and best practices
- [Testing Guide](docs/guides/testing.md) - Unit, integration, and E2E testing
- [Deployment Guide](docs/guides/deployment.md) - Deploy to Vercel
- [Integration Guide](docs/guides/integration.md) - API integrations

### Reference
- [File Structure](docs/reference/file-structure.md) - Project organization
- [Test IDs Guide](docs/reference/test-ids.md) - E2E testing selectors
- [Troubleshooting](docs/reference/troubleshooting.md) - Common issues and solutions

## Quick Links

- **Getting Started**: [docs/setup/installation.md](docs/setup/installation.md)
- **Deploy to Production**: [docs/guides/deployment.md](docs/guides/deployment.md)
- **Run Tests**: [docs/guides/testing.md](docs/guides/testing.md)
- **Common Issues**: [docs/reference/troubleshooting.md](docs/reference/troubleshooting.md)

## Contributing

This is a private project. Please contact the repository owner for contribution guidelines.

## License

Proprietary - All rights reserved.

## Support

For questions or issues:
- Check [docs/reference/troubleshooting.md](docs/reference/troubleshooting.md)
- Review documentation in [docs/](docs/)
- Create an issue in the [GitHub repository](https://github.com/Nikki72581/arflow/issues)
