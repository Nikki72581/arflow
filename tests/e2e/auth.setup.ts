import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '.auth', 'user.json')

/**
 * Authentication setup for Playwright E2E tests
 *
 * This setup project runs before all other tests and handles Clerk authentication.
 * It saves the authenticated state to a file that other tests can reuse.
 *
 * Required environment variables:
 * - TEST_USER_EMAIL: Email address for test user
 * - TEST_USER_PASSWORD: Password for test user
 *
 * The authenticated session is stored in tests/e2e/.auth/user.json
 */
setup('authenticate', async ({ page }) => {
  const testEmail = process.env.TEST_USER_EMAIL
  const testPassword = process.env.TEST_USER_PASSWORD

  if (!testEmail || !testPassword) {
    throw new Error(
      'TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in environment variables'
    )
  }

  console.log('Starting authentication setup...')

  // Navigate to sign-in page
  await page.goto('/sign-in')

  // Wait for Clerk sign-in form to load
  await page.waitForSelector('[data-testid="sign-in-form"]', {
    timeout: 10000,
  })

  console.log('Sign-in form loaded')

  // Fill in email
  await page.fill('input[name="identifier"]', testEmail)
  await page.click('button[type="submit"]')

  // Wait for password field to appear
  await page.waitForSelector('input[name="password"]', { timeout: 10000 })

  // Fill in password
  await page.fill('input[name="password"]', testPassword)
  await page.click('button[type="submit"]')

  console.log('Submitted credentials')

  // Wait for successful navigation to dashboard
  await page.waitForURL('**/dashboard**', { timeout: 15000 })

  console.log('Authentication successful')

  // Verify we're authenticated by checking for user-specific content
  // Adjust this selector based on your actual dashboard layout
  await expect(
    page.locator('[data-testid="user-button"], .user-menu, nav')
  ).toBeVisible({ timeout: 10000 })

  console.log('Dashboard loaded, saving authentication state')

  // Save signed-in state to file
  await page.context().storageState({ path: authFile })

  console.log('Authentication state saved to:', authFile)
})
