import { test, expect } from '@playwright/test'

/**
 * E2E tests for Commission Plans feature
 *
 * Tests cover:
 * - Creating commission plans with different rule types
 * - Editing and deleting plans
 * - Commission preview calculator
 * - Form validation
 * - Stacked rules (multiple rules in one plan)
 * - Min/max caps
 */

test.describe('Commission Plans', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to commission plans page
    await page.goto('/dashboard/plans')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Create Commission Plan', () => {
    test('should create a basic percentage-based commission plan', async ({
      page,
    }) => {
      // Click "New Commission Plan" button
      await page.click('[data-testid="new-plan-button"]')

      // Wait for dialog to open
      await expect(
        page.locator('[data-testid="plan-form-dialog"]')
      ).toBeVisible()

      // Fill in basic plan info
      await page.fill('[data-testid="plan-name-input"]', 'Standard Sales Plan')
      await page.fill(
        '[data-testid="plan-description-input"]',
        'Standard 10% commission on all sales'
      )

      // Add a percentage rule
      await page.click('[data-testid="add-rule-button"]')

      // Select rule type
      await page.click('[data-testid="rule-type-select"]')
      await page.click('[data-testid="rule-type-percentage"]')

      // Enter percentage value
      await page.fill('[data-testid="rule-value-input"]', '10')

      // Submit form
      await page.click('[data-testid="submit-plan-button"]')

      // Wait for success message
      await expect(
        page.locator('[data-testid="success-message"]')
      ).toBeVisible({ timeout: 5000 })

      // Verify plan appears in list
      await expect(
        page.locator('text=Standard Sales Plan')
      ).toBeVisible()
    })

    test('should create plan with flat amount commission', async ({ page }) => {
      await page.click('[data-testid="new-plan-button"]')

      await page.fill('[data-testid="plan-name-input"]', 'Flat Bonus Plan')
      await page.fill(
        '[data-testid="plan-description-input"]',
        '$500 per sale'
      )

      // Add flat amount rule
      await page.click('[data-testid="add-rule-button"]')
      await page.click('[data-testid="rule-type-select"]')
      await page.click('[data-testid="rule-type-flat"]')

      await page.fill('[data-testid="rule-value-input"]', '500')

      await page.click('[data-testid="submit-plan-button"]')

      await expect(
        page.locator('[data-testid="success-message"]')
      ).toBeVisible({ timeout: 5000 })
      await expect(page.locator('text=Flat Bonus Plan')).toBeVisible()
    })

    test('should create plan with tiered commission structure', async ({
      page,
    }) => {
      await page.click('[data-testid="new-plan-button"]')

      await page.fill(
        '[data-testid="plan-name-input"]',
        'Tiered Accelerator Plan'
      )
      await page.fill(
        '[data-testid="plan-description-input"]',
        'Progressive commission rates'
      )

      // Add tiered rule
      await page.click('[data-testid="add-rule-button"]')
      await page.click('[data-testid="rule-type-select"]')
      await page.click('[data-testid="rule-type-tiered"]')

      // Add tier 1: 5% from $0
      await page.click('[data-testid="add-tier-button"]')
      await page.fill('[data-testid="tier-0-threshold"]', '0')
      await page.fill('[data-testid="tier-0-rate"]', '5')

      // Add tier 2: 7% from $10,000
      await page.click('[data-testid="add-tier-button"]')
      await page.fill('[data-testid="tier-1-threshold"]', '10000')
      await page.fill('[data-testid="tier-1-rate"]', '7')

      // Add tier 3: 10% from $50,000
      await page.click('[data-testid="add-tier-button"]')
      await page.fill('[data-testid="tier-2-threshold"]', '50000')
      await page.fill('[data-testid="tier-2-rate"]', '10')

      await page.click('[data-testid="submit-plan-button"]')

      await expect(
        page.locator('[data-testid="success-message"]')
      ).toBeVisible({ timeout: 5000 })
      await expect(
        page.locator('text=Tiered Accelerator Plan')
      ).toBeVisible()
    })

    test('should create plan with stacked rules (percentage + flat)', async ({
      page,
    }) => {
      await page.click('[data-testid="new-plan-button"]')

      await page.fill('[data-testid="plan-name-input"]', 'Stacked Commission')
      await page.fill(
        '[data-testid="plan-description-input"]',
        '5% plus $500 bonus'
      )

      // Add percentage rule
      await page.click('[data-testid="add-rule-button"]')
      await page.click('[data-testid="rule-type-select-0"]')
      await page.click('[data-testid="rule-type-percentage"]')
      await page.fill('[data-testid="rule-value-input-0"]', '5')

      // Add flat amount rule
      await page.click('[data-testid="add-rule-button"]')
      await page.click('[data-testid="rule-type-select-1"]')
      await page.click('[data-testid="rule-type-flat"]')
      await page.fill('[data-testid="rule-value-input-1"]', '500')

      await page.click('[data-testid="submit-plan-button"]')

      await expect(
        page.locator('[data-testid="success-message"]')
      ).toBeVisible({ timeout: 5000 })
      await expect(page.locator('text=Stacked Commission')).toBeVisible()
    })

    test('should create plan with min/max caps', async ({ page }) => {
      await page.click('[data-testid="new-plan-button"]')

      await page.fill('[data-testid="plan-name-input"]', 'Capped Commission')
      await page.fill(
        '[data-testid="plan-description-input"]',
        'Commission with min and max limits'
      )

      // Add percentage rule with caps
      await page.click('[data-testid="add-rule-button"]')
      await page.click('[data-testid="rule-type-select"]')
      await page.click('[data-testid="rule-type-percentage"]')
      await page.fill('[data-testid="rule-value-input"]', '10')

      // Set minimum cap
      await page.fill('[data-testid="rule-min-amount-input"]', '200')

      // Set maximum cap
      await page.fill('[data-testid="rule-max-amount-input"]', '5000')

      await page.click('[data-testid="submit-plan-button"]')

      await expect(
        page.locator('[data-testid="success-message"]')
      ).toBeVisible({ timeout: 5000 })
      await expect(page.locator('text=Capped Commission')).toBeVisible()
    })
  })

  test.describe('Commission Preview Calculator', () => {
    test('should show live preview of commission calculation', async ({
      page,
    }) => {
      await page.click('[data-testid="new-plan-button"]')

      // Add a 10% rule
      await page.click('[data-testid="add-rule-button"]')
      await page.click('[data-testid="rule-type-select"]')
      await page.click('[data-testid="rule-type-percentage"]')
      await page.fill('[data-testid="rule-value-input"]', '10')

      // Enter test sale amount in preview calculator
      await page.fill('[data-testid="preview-sale-amount"]', '10000')

      // Verify calculated commission shows correctly
      await expect(
        page.locator('[data-testid="preview-commission-result"]')
      ).toContainText('$1,000')
    })

    test('should update preview when rule values change', async ({ page }) => {
      await page.click('[data-testid="new-plan-button"]')

      await page.click('[data-testid="add-rule-button"]')
      await page.click('[data-testid="rule-type-select"]')
      await page.click('[data-testid="rule-type-percentage"]')

      // Set initial value
      await page.fill('[data-testid="rule-value-input"]', '10')
      await page.fill('[data-testid="preview-sale-amount"]', '10000')

      await expect(
        page.locator('[data-testid="preview-commission-result"]')
      ).toContainText('$1,000')

      // Change percentage
      await page.fill('[data-testid="rule-value-input"]', '15')

      // Preview should update automatically
      await expect(
        page.locator('[data-testid="preview-commission-result"]')
      ).toContainText('$1,500')
    })

    test('should show tier breakdown in preview for tiered rules', async ({
      page,
    }) => {
      await page.click('[data-testid="new-plan-button"]')

      // Add tiered rule
      await page.click('[data-testid="add-rule-button"]')
      await page.click('[data-testid="rule-type-select"]')
      await page.click('[data-testid="rule-type-tiered"]')

      await page.click('[data-testid="add-tier-button"]')
      await page.fill('[data-testid="tier-0-threshold"]', '0')
      await page.fill('[data-testid="tier-0-rate"]', '5')

      await page.click('[data-testid="add-tier-button"]')
      await page.fill('[data-testid="tier-1-threshold"]', '10000')
      await page.fill('[data-testid="tier-1-rate"]', '7')

      // Enter sale amount that spans both tiers
      await page.fill('[data-testid="preview-sale-amount"]', '15000')

      // Should show tier breakdown
      await expect(
        page.locator('[data-testid="tier-breakdown"]')
      ).toBeVisible()
      await expect(
        page.locator('[data-testid="tier-0-calculation"]')
      ).toContainText('$500') // $10k at 5%
      await expect(
        page.locator('[data-testid="tier-1-calculation"]')
      ).toContainText('$350') // $5k at 7%
    })

    test('should show cap indicators in preview', async ({ page }) => {
      await page.click('[data-testid="new-plan-button"]')

      await page.click('[data-testid="add-rule-button"]')
      await page.click('[data-testid="rule-type-select"]')
      await page.click('[data-testid="rule-type-percentage"]')
      await page.fill('[data-testid="rule-value-input"]', '10')

      // Set max cap
      await page.fill('[data-testid="rule-max-amount-input"]', '5000')

      // Enter large sale that exceeds cap
      await page.fill('[data-testid="preview-sale-amount"]', '100000')

      // Should show capped amount
      await expect(
        page.locator('[data-testid="preview-commission-result"]')
      ).toContainText('$5,000')

      // Should show cap indicator
      await expect(
        page.locator('[data-testid="preview-cap-indicator"]')
      ).toContainText('capped at maximum')
    })
  })

  test.describe('Form Validation', () => {
    test('should require plan name', async ({ page }) => {
      await page.click('[data-testid="new-plan-button"]')

      // Try to submit without name
      await page.click('[data-testid="submit-plan-button"]')

      // Should show validation error
      await expect(
        page.locator('[data-testid="plan-name-error"]')
      ).toContainText('required')
    })

    test('should require at least one rule', async ({ page }) => {
      await page.click('[data-testid="new-plan-button"]')

      await page.fill('[data-testid="plan-name-input"]', 'Empty Plan')

      // Try to submit without any rules
      await page.click('[data-testid="submit-plan-button"]')

      // Should show validation error
      await expect(
        page.locator('[data-testid="rules-error"]')
      ).toContainText('at least one rule')
    })

    test('should validate rule values are positive numbers', async ({
      page,
    }) => {
      await page.click('[data-testid="new-plan-button"]')

      await page.click('[data-testid="add-rule-button"]')
      await page.click('[data-testid="rule-type-select"]')
      await page.click('[data-testid="rule-type-percentage"]')

      // Try negative value
      await page.fill('[data-testid="rule-value-input"]', '-10')

      await page.click('[data-testid="submit-plan-button"]')

      await expect(
        page.locator('[data-testid="rule-value-error"]')
      ).toContainText('must be positive')
    })

    test('should validate min cap is less than max cap', async ({ page }) => {
      await page.click('[data-testid="new-plan-button"]')

      await page.click('[data-testid="add-rule-button"]')
      await page.click('[data-testid="rule-type-select"]')
      await page.click('[data-testid="rule-type-percentage"]')
      await page.fill('[data-testid="rule-value-input"]', '10')

      // Set min higher than max
      await page.fill('[data-testid="rule-min-amount-input"]', '5000')
      await page.fill('[data-testid="rule-max-amount-input"]', '1000')

      await page.click('[data-testid="submit-plan-button"]')

      await expect(
        page.locator('[data-testid="cap-validation-error"]')
      ).toContainText('minimum cannot exceed maximum')
    })
  })

  test.describe('Edit Commission Plan', () => {
    test('should edit existing commission plan', async ({ page }) => {
      // Assuming at least one plan exists from previous tests
      // Click edit button on first plan
      await page
        .locator('[data-testid="plan-row"]')
        .first()
        .locator('[data-testid="edit-plan-button"]')
        .click()

      // Wait for dialog
      await expect(
        page.locator('[data-testid="plan-form-dialog"]')
      ).toBeVisible()

      // Modify the name
      const currentName = await page
        .locator('[data-testid="plan-name-input"]')
        .inputValue()
      await page.fill(
        '[data-testid="plan-name-input"]',
        `${currentName} (Updated)`
      )

      // Submit
      await page.click('[data-testid="submit-plan-button"]')

      await expect(
        page.locator('[data-testid="success-message"]')
      ).toBeVisible({ timeout: 5000 })

      // Verify updated name appears
      await expect(page.locator(`text=${currentName} (Updated)`)).toBeVisible()
    })
  })

  test.describe('Delete Commission Plan', () => {
    test('should delete commission plan with confirmation', async ({ page }) => {
      // Get the name of the first plan to verify deletion
      const planName = await page
        .locator('[data-testid="plan-row"]')
        .first()
        .locator('[data-testid="plan-name"]')
        .textContent()

      // Click delete button
      await page
        .locator('[data-testid="plan-row"]')
        .first()
        .locator('[data-testid="delete-plan-button"]')
        .click()

      // Confirm deletion in dialog
      await expect(
        page.locator('[data-testid="confirm-delete-dialog"]')
      ).toBeVisible()
      await expect(
        page.locator('[data-testid="confirm-delete-message"]')
      ).toContainText('Are you sure')

      await page.click('[data-testid="confirm-delete-button"]')

      // Verify plan is removed
      await expect(page.locator(`text=${planName}`)).not.toBeVisible({
        timeout: 5000,
      })
    })

    test('should cancel deletion when clicking cancel', async ({ page }) => {
      const planName = await page
        .locator('[data-testid="plan-row"]')
        .first()
        .locator('[data-testid="plan-name"]')
        .textContent()

      await page
        .locator('[data-testid="plan-row"]')
        .first()
        .locator('[data-testid="delete-plan-button"]')
        .click()

      await expect(
        page.locator('[data-testid="confirm-delete-dialog"]')
      ).toBeVisible()

      // Click cancel
      await page.click('[data-testid="cancel-delete-button"]')

      // Plan should still be visible
      await expect(page.locator(`text=${planName}`)).toBeVisible()
    })
  })

  test.describe('Empty State', () => {
    test('should show empty state when no plans exist', async ({ page }) => {
      // This test assumes you can clear all plans or have a way to test empty state
      // You might need to set up a clean test database for this

      // Navigate to plans page
      await page.goto('/dashboard/plans')

      // Check for empty state
      // Adjust this based on your actual empty state implementation
      const planRows = await page.locator('[data-testid="plan-row"]').count()

      if (planRows === 0) {
        await expect(
          page.locator('[data-testid="empty-state"]')
        ).toBeVisible()
        await expect(
          page.locator('[data-testid="empty-state-message"]')
        ).toContainText('No commission plans')
      }
    })
  })
})
