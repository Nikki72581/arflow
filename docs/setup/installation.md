# ARFlow Installation Guide

Complete guide to setting up ARFlow for development and production.

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL database
- Clerk account for authentication
- Resend account for email notifications (optional)

## Quick Start (5 minutes)

### 1. Clone and Install

```bash
git clone https://github.com/Nikki72581/arflow
cd arflow
npm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/arflow"

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

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Seed with demo data
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Detailed Setup Instructions

### Database Configuration

#### Local PostgreSQL

Install PostgreSQL if you haven't already:

```bash
# macOS
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt-get install postgresql
sudo systemctl start postgresql
```

Create your database:

```bash
createdb arflow
```

#### Cloud Database (Recommended for Production)

**Vercel Postgres:**
1. Go to Vercel Dashboard → Storage → Create Database
2. Select PostgreSQL
3. Copy the connection string
4. Add to `.env.local` as `DATABASE_URL`

**Other providers:**
- Neon (https://neon.tech)
- Supabase (https://supabase.com)
- Railway (https://railway.app)

### Authentication Setup (Clerk)

1. **Create Clerk Account**: Go to [clerk.com](https://clerk.com)
2. **Create Application**: Choose "Next.js" as framework
3. **Get API Keys**:
   - Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - Copy `CLERK_SECRET_KEY`
4. **Configure Sign-In/Up URLs**:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in URL: `/dashboard`
5. **Enable Organizations**: In Clerk Dashboard → Organizations → Enable

See [docs/setup/team-setup.md](./team-setup.md) for detailed Clerk configuration.

### Email Setup (Optional)

ARFlow uses Resend for email notifications. This is optional but recommended for production.

1. **Create Resend Account**: Go to [resend.com](https://resend.com)
2. **Get API Key**: Dashboard → API Keys → Create
3. **Add to .env.local**:
   ```env
   RESEND_API_KEY="re_..."
   RESEND_FROM_EMAIL="noreply@yourdomain.com"
   ```

For detailed email setup, see [docs/setup/email-setup.md](./email-setup.md).

### Acumatica Integration (Optional)

If you're integrating with Acumatica ERP:

See [docs/setup/acumatica-integration.md](./acumatica-integration.md) for complete integration guide.

## Project Structure

```
arflow/
├── src/
│   ├── app/
│   │   ├── actions/           # Server actions for data mutations
│   │   ├── api/              # API routes (webhooks, etc.)
│   │   ├── dashboard/        # Main application pages
│   │   └── (auth)/           # Authentication pages
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── customers/       # Customer-specific components
│   │   ├── invoices/        # Invoice components
│   │   └── shared/          # Shared components
│   └── lib/
│       ├── validations/     # Zod schemas for validation
│       ├── email.ts         # Email service
│       └── utils.ts         # Utility functions
├── prisma/
│   └── schema.prisma        # Database schema
├── docs/                    # Documentation
└── tests/                   # Test files
```

See [docs/reference/file-structure.md](../reference/file-structure.md) for detailed structure.

## Development Workflow

### Available Scripts

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

### Database Commands

```bash
# Generate Prisma client
npx prisma generate

# Push schema changes
npx prisma db push

# Create migration
npx prisma migrate dev --name description

# Open Prisma Studio
npx prisma studio

# Reset database
npx prisma migrate reset
```

See [docs/guides/development.md](../guides/development.md) for workflow details.

## Deployment

### Vercel (Recommended)

1. **Connect Repository**:
   - Go to [vercel.com](https://vercel.com)
   - Import your Git repository

2. **Configure Environment Variables**:
   - Add all variables from `.env.local`
   - Ensure `DATABASE_URL` points to production database

3. **Deploy**:
   - Vercel will automatically build and deploy
   - Database migrations run automatically

See [docs/guides/deployment.md](../guides/deployment.md) for complete deployment guide.

## Testing Setup

### Configure Test Environment

```bash
cp .env.test.example .env.test
```

Edit `.env.test`:

```env
DATABASE_URL="postgresql://test:test@localhost:5432/arflow_test"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
TEST_USER_EMAIL="test@example.com"
TEST_USER_PASSWORD="your_secure_password"
```

### Install Test Dependencies

```bash
# Install Playwright browsers
npx playwright install
```

### Run Tests

```bash
npm run test:all
```

See [docs/guides/testing.md](../guides/testing.md) for comprehensive testing guide.

## Troubleshooting

### Common Issues

#### Database Connection Errors

**Error**: `Can't reach database server`

**Solution**:
- Verify PostgreSQL is running
- Check `DATABASE_URL` is correct
- Ensure database exists

#### Authentication Issues

**Error**: `Unauthorized` or `No organization found`

**Solution**:
- Verify Clerk API keys are correct
- Ensure user is added to an organization in Clerk
- Clear cookies and sign in again

#### Missing UI Components

**Error**: `Module not found: @/components/ui/...`

**Solution**:
```bash
npx shadcn-ui@latest add button card input label table badge dialog
```

#### Build Errors

**Error**: Type errors or build failures

**Solution**:
```bash
# Clear Next.js cache
rm -rf .next

# Regenerate Prisma client
npx prisma generate

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

See [docs/reference/troubleshooting.md](../reference/troubleshooting.md) for more solutions.

## Next Steps

After installation:

1. **Configure your organization** in Clerk Dashboard
2. **Add team members** (see [docs/setup/team-setup.md](./team-setup.md))
3. **Import customer data** via CSV or Acumatica integration
4. **Set up email notifications** (see [docs/setup/email-setup.md](./email-setup.md))
5. **Deploy to production** (see [docs/guides/deployment.md](../guides/deployment.md))

## Support

For issues or questions:
- Check [docs/reference/troubleshooting.md](../reference/troubleshooting.md)
- Review [GitHub Issues](https://github.com/Nikki72581/arflow/issues)
- Contact repository owner

## Additional Resources

- [Development Workflow](../guides/development.md)
- [Testing Guide](../guides/testing.md)
- [Deployment Guide](../guides/deployment.md)
- [File Structure Reference](../reference/file-structure.md)
