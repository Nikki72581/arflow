# Testing Guide for CommissionFlow

This document provides comprehensive guidance on testing the CommissionFlow application.

## Table of Contents

- [Testing Infrastructure](#testing-infrastructure)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Unit Tests](#unit-tests)
- [Integration Tests](#integration-tests)
- [E2E Tests](#e2e-tests)
- [Writing Tests](#writing-tests)
- [CI/CD Pipeline](#cicd-pipeline)
- [Troubleshooting](#troubleshooting)

## Testing Infrastructure

CommissionFlow uses a multi-layered testing approach:

- **Unit Tests**: Vitest for testing business logic in isolation
- **Integration Tests**: Vitest for testing server actions and multi-tenant isolation
- **E2E Tests**: Playwright for testing complete user workflows

### Tech Stack

- **Vitest**: Fast unit test framework with native ESM support
- **@testing-library/react**: React component testing utilities
- **Playwright**: Cross-browser E2E testing
- **jsdom**: Browser environment simulation for unit tests

## Setup

### 1. Install Dependencies

Dependencies are already installed if you ran `npm install`. If not:

```bash
npm install
```

### 2. Configure Environment Variables

Copy the test environment template:

```bash
cp .env.test.example .env.test
```

Edit `.env.test` and fill in the required values:

```env
DATABASE_URL="postgresql://test:test@localhost:5432/commissionflow_test"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
TEST_USER_EMAIL="test@example.com"
TEST_USER_PASSWORD="your_secure_password"
```

### 3. Set Up Test Database

Create a separate PostgreSQL database for testing:

```bash
createdb commissionflow_test
```

Push the Prisma schema:

```bash
DATABASE_URL="postgresql://test:test@localhost:5432/commissionflow_test" npx prisma db push
```

Optionally seed with test data:

```bash
DATABASE_URL="postgresql://test:test@localhost:5432/commissionflow_test" npm run db:seed
```

### 4. Install Playwright Browsers

For E2E tests:

```bash
npx playwright install
```

### 5. Create Test User in Clerk

1. Go to your Clerk dashboard (test environment)
2. Create a test user with the email/password from `.env.test`
3. Add the user to a test organization

## Running Tests

### All Tests

Run the complete test suite:

```bash
npm run test:all
```

### Unit Tests Only

```bash
npm run test:unit
```

### Integration Tests Only

```bash
npm run test:integration
```

### E2E Tests Only

```bash
npm run test:e2e
```

### Watch Mode

Run tests in watch mode (re-runs on file changes):

```bash
npm run test:watch
```

### Coverage Report

Generate code coverage report:

```bash
npm run test:coverage
```

Open coverage report:

```bash
open coverage/index.html
```

### Interactive UI

Run Vitest with interactive UI:

```bash
npm run test:ui
```

Run Playwright with interactive UI:

```bash
npm run test:e2e:ui
```

### Headed Mode (E2E)

Run E2E tests with visible browser:

```bash
npm run test:e2e:headed
```

## Unit Tests

### Location

`tests/unit/`

### What to Test

- Business logic in isolation
- Commission calculation algorithms
- Utility functions
- Data transformations
- Validation functions

### Example

```typescript
import { describe, it, expect } from 'vitest'
import { calculateCommission } from '@/lib/commission-calculator'

describe('Commission Calculator', () => {
  it('should calculate percentage commission correctly', () => {
    const rule = {
      ruleType: 'PERCENTAGE',
      value: 10,
      // ... other required fields
    }

    const result = calculateCommission(10000, rule)

    expect(result.calculatedAmount).toBe(1000)
  })
})
```

### Running Specific Tests

Run a specific test file:

```bash
npm run test:unit -- commission-calculations.test.ts
```

Run tests matching a pattern:

```bash
npm run test:unit -- -t "percentage commission"
```

## Integration Tests

### Location

`tests/integration/`

### What to Test

- Server actions with mocked auth
- Multi-tenant data isolation
- Database operations
- Cross-feature integrations

### Example

```typescript
import { describe, it, expect, vi } from 'vitest'
import { getClients } from '@/app/actions/clients'
import { prisma } from '@/lib/db'

describe('Multi-Tenant Isolation', () => {
  it('should only return clients for authenticated org', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      organizationId: 'org-1',
      // ...
    })

    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { organizationId: 'org-1', name: 'Client 1' },
    ])

    const clients = await getClients()

    expect(prisma.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-1' }),
      })
    )
  })
})
```

## E2E Tests

### Location

`tests/e2e/`

### What to Test

- Complete user workflows
- Form submissions
- Navigation flows
- UI interactions
- Authentication flows

### Test Structure

E2E tests use Playwright's authentication setup:

1. `auth.setup.ts` - Runs once to authenticate and save session
2. Test files use saved authentication state
3. Tests run across multiple browsers (Chrome, Firefox, Safari, mobile)

### Example

```typescript
import { test, expect } from '@playwright/test'

test('should create a commission plan', async ({ page }) => {
  await page.goto('/dashboard/plans')

  await page.click('[data-testid="new-plan-button"]')
  await page.fill('[data-testid="plan-name-input"]', 'Test Plan')
  await page.click('[data-testid="submit-plan-button"]')

  await expect(page.locator('text=Test Plan')).toBeVisible()
})
```

### Important: Add Test IDs to Components

For reliable E2E tests, add `data-testid` attributes to your components:

```tsx
<button data-testid="new-plan-button">New Plan</button>
<input data-testid="plan-name-input" name="name" />
```

### Debugging E2E Tests

Run with visible browser:

```bash
npm run test:e2e:headed
```

Use Playwright Inspector:

```bash
PWDEBUG=1 npm run test:e2e
```

View test report:

```bash
npx playwright show-report
```

## Writing Tests

### Best Practices

1. **Descriptive Names**: Use clear, descriptive test names
   ```typescript
   it('should calculate tiered commission with multiple thresholds')
   ```

2. **Arrange-Act-Assert**: Follow the AAA pattern
   ```typescript
   // Arrange
   const rule = createRule({ type: 'PERCENTAGE', value: 10 })

   // Act
   const result = calculateCommission(10000, rule)

   // Assert
   expect(result.appliedAmount).toBe(1000)
   ```

3. **Test One Thing**: Each test should verify one specific behavior

4. **Use Factories**: Create helper functions for test data
   ```typescript
   const createRule = (overrides = {}) => ({
     id: '1',
     ruleType: 'PERCENTAGE',
     value: 10,
     ...defaults,
     ...overrides,
   })
   ```

5. **Mock External Dependencies**: Mock APIs, databases, third-party services

6. **Clean Up**: Reset state between tests
   ```typescript
   afterEach(() => {
     vi.clearAllMocks()
   })
   ```

### Test Data Generation

Use `@faker-js/faker` (already installed) for realistic test data:

```typescript
import { faker } from '@faker-js/faker'

const testClient = {
  name: faker.company.name(),
  email: faker.internet.email(),
  phone: faker.phone.number(),
}
```

## CI/CD Pipeline

### GitHub Actions Workflow

The test workflow (`.github/workflows/tests.yml`) runs on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

### Workflow Steps

1. **Unit Tests**: Run first, fast feedback
2. **Integration Tests**: Run in parallel with unit tests
3. **E2E Tests**: Only run if unit tests pass
4. **Coverage Report**: Generate and upload coverage
5. **Test Summary**: Create summary of all test results

### Required GitHub Secrets

Add these secrets to your GitHub repository:

1. Go to Settings > Secrets and variables > Actions
2. Add the following secrets:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
TEST_USER_EMAIL
TEST_USER_PASSWORD
CODECOV_TOKEN (optional, for coverage reporting)
```

### Viewing Test Results

- Test results appear in the GitHub Actions summary
- Coverage reports are uploaded as artifacts
- Playwright reports and videos available on failure

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

**Problem**: `Error: Can't reach database server`

**Solution**:
```bash
# Ensure PostgreSQL is running
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Linux

# Verify DATABASE_URL is correct
echo $DATABASE_URL
```

#### 2. Clerk Authentication Errors in E2E Tests

**Problem**: `Authentication failed` in Playwright tests

**Solution**:
- Verify `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` are correct
- Ensure test user exists in Clerk test environment
- Check Clerk API keys are for test environment
- Delete `tests/e2e/.auth/user.json` and re-run

#### 3. Mock Not Working

**Problem**: Mocks aren't being applied

**Solution**:
```typescript
// Ensure you're using vi.mock at the top level
vi.mock('@/lib/db', () => ({ ... }))

// Clear mocks between tests
afterEach(() => {
  vi.clearAllMocks()
})
```

#### 4. Playwright Timeout Errors

**Problem**: `Test timeout of 30000ms exceeded`

**Solution**:
```typescript
// Increase timeout for slow operations
test('slow operation', async ({ page }) => {
  test.setTimeout(60000)
  // ...
})

// Or use explicit waits
await page.waitForSelector('[data-testid="result"]', { timeout: 10000 })
```

#### 5. Coverage Thresholds Not Met

**Problem**: `Coverage for statements (75%) does not meet threshold (80%)`

**Solution**:
- Write more tests for uncovered code
- Or adjust thresholds in `vitest.config.ts`:
```typescript
coverage: {
  lines: 75,  // Lower if needed
  functions: 75,
  branches: 75,
  statements: 75,
}
```

### Debug Commands

Run tests with verbose output:

```bash
npm run test:unit -- --reporter=verbose
```

Run single test file:

```bash
npm run test:unit -- commission-calculations.test.ts
```

Run with debugging:

```bash
NODE_OPTIONS='--inspect-brk' npm run test:unit
```

### Getting Help

- Check test output for detailed error messages
- Review `tests/setup.ts` for mock configuration
- Consult [Vitest docs](https://vitest.dev/)
- Consult [Playwright docs](https://playwright.dev/)

## Test Coverage Goals

### Current Targets

- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

### Priority Areas

1. **Commission Calculation Logic**: 95%+ coverage
2. **Server Actions**: 80%+ coverage
3. **Critical User Flows**: 100% E2E coverage
4. **Multi-Tenant Isolation**: 100% coverage

## Continuous Improvement

### Adding New Tests

When adding new features:

1. Write unit tests for business logic
2. Write integration tests for server actions
3. Add E2E tests for user-facing workflows
4. Ensure coverage meets thresholds

### Updating Tests

When modifying features:

1. Update affected tests
2. Add tests for new edge cases
3. Verify all tests still pass
4. Check coverage hasn't decreased

---

For questions or issues with testing, please open an issue on GitHub.
