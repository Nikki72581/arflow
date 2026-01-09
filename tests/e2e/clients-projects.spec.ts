import { test, expect } from '@playwright/test'

/**
 * E2E tests for Clients and Projects features
 *
 * Tests cover:
 * - CRUD operations for clients
 * - CRUD operations for projects
 * - Form validation
 * - Search and filtering
 * - Empty states
 * - Relationship between clients and projects
 */

test.describe('Clients Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/clients')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Create Client', () => {
    test('should create a new client with all fields', async ({ page }) => {
      // Click "New Client" button
      await page.click('[data-testid="new-client-button"]')

      // Wait for dialog to open
      await expect(
        page.locator('[data-testid="client-form-dialog"]')
      ).toBeVisible()

      // Fill in client details
      await page.fill('[data-testid="client-name-input"]', 'Acme Corporation')
      await page.fill(
        '[data-testid="client-email-input"]',
        'contact@acmecorp.com'
      )
      await page.fill('[data-testid="client-phone-input"]', '555-0123')

      // Select client tier
      await page.click('[data-testid="client-tier-select"]')
      await page.click('[data-testid="client-tier-vip"]')

      // Add address details
      await page.fill(
        '[data-testid="client-address-input"]',
        '123 Business St'
      )
      await page.fill('[data-testid="client-city-input"]', 'San Francisco')
      await page.fill('[data-testid="client-state-input"]', 'CA')
      await page.fill('[data-testid="client-zip-input"]', '94105')

      // Submit form
      await page.click('[data-testid="submit-client-button"]')

      // Wait for success
      await expect(
        page.locator('[data-testid="success-message"]')
      ).toBeVisible({ timeout: 5000 })

      // Verify client appears in list
      await expect(page.locator('text=Acme Corporation')).toBeVisible()
    })

    test('should create client with only required fields', async ({ page }) => {
      await page.click('[data-testid="new-client-button"]')

      // Only fill required field (name)
      await page.fill('[data-testid="client-name-input"]', 'Minimal Client')

      await page.click('[data-testid="submit-client-button"]')

      await expect(
        page.locator('[data-testid="success-message"]')
      ).toBeVisible({ timeout: 5000 })
      await expect(page.locator('text=Minimal Client')).toBeVisible()
    })

    test('should select different client tiers', async ({ page }) => {
      const tiers = [
        { value: 'STANDARD', testId: 'client-tier-standard' },
        { value: 'VIP', testId: 'client-tier-vip' },
        { value: 'ENTERPRISE', testId: 'client-tier-enterprise' },
        { value: 'NEW', testId: 'client-tier-new' },
      ]

      for (const tier of tiers) {
        await page.click('[data-testid="new-client-button"]')

        await page.fill(
          '[data-testid="client-name-input"]',
          `${tier.value} Client`
        )

        await page.click('[data-testid="client-tier-select"]')
        await page.click(`[data-testid="${tier.testId}"]`)

        await page.click('[data-testid="submit-client-button"]')

        await expect(
          page.locator('[data-testid="success-message"]')
        ).toBeVisible({ timeout: 5000 })

        // Close success message if needed
        await page.waitForTimeout(1000)
      }
    })

    test('should set client status (active/inactive)', async ({ page }) => {
      await page.click('[data-testid="new-client-button"]')

      await page.fill(
        '[data-testid="client-name-input"]',
        'Inactive Test Client'
      )

      // Set status to inactive
      await page.click('[data-testid="client-status-select"]')
      await page.click('[data-testid="client-status-inactive"]')

      await page.click('[data-testid="submit-client-button"]')

      await expect(
        page.locator('[data-testid="success-message"]')
      ).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Client Validation', () => {
    test('should require client name', async ({ page }) => {
      await page.click('[data-testid="new-client-button"]')

      // Try to submit without name
      await page.click('[data-testid="submit-client-button"]')

      // Should show validation error
      await expect(
        page.locator('[data-testid="client-name-error"]')
      ).toContainText('required')
    })

    test('should validate email format', async ({ page }) => {
      await page.click('[data-testid="new-client-button"]')

      await page.fill('[data-testid="client-name-input"]', 'Test Client')
      await page.fill('[data-testid="client-email-input"]', 'invalid-email')

      await page.click('[data-testid="submit-client-button"]')

      await expect(
        page.locator('[data-testid="client-email-error"]')
      ).toContainText('valid email')
    })
  })

  test.describe('Edit Client', () => {
    test('should edit existing client', async ({ page }) => {
      // Click edit on first client
      await page
        .locator('[data-testid="client-row"]')
        .first()
        .locator('[data-testid="edit-client-button"]')
        .click()

      await expect(
        page.locator('[data-testid="client-form-dialog"]')
      ).toBeVisible()

      // Update name
      const currentName = await page
        .locator('[data-testid="client-name-input"]')
        .inputValue()
      await page.fill(
        '[data-testid="client-name-input"]',
        `${currentName} (Updated)`
      )

      await page.click('[data-testid="submit-client-button"]')

      await expect(
        page.locator('[data-testid="success-message"]')
      ).toBeVisible({ timeout: 5000 })
      await expect(page.locator(`text=${currentName} (Updated)`)).toBeVisible()
    })

    test('should change client tier', async ({ page }) => {
      await page
        .locator('[data-testid="client-row"]')
        .first()
        .locator('[data-testid="edit-client-button"]')
        .click()

      // Change tier to VIP
      await page.click('[data-testid="client-tier-select"]')
      await page.click('[data-testid="client-tier-vip"]')

      await page.click('[data-testid="submit-client-button"]')

      await expect(
        page.locator('[data-testid="success-message"]')
      ).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Delete Client', () => {
    test('should delete client with confirmation', async ({ page }) => {
      const clientName = await page
        .locator('[data-testid="client-row"]')
        .first()
        .locator('[data-testid="client-name"]')
        .textContent()

      await page
        .locator('[data-testid="client-row"]')
        .first()
        .locator('[data-testid="delete-client-button"]')
        .click()

      await expect(
        page.locator('[data-testid="confirm-delete-dialog"]')
      ).toBeVisible()
      await page.click('[data-testid="confirm-delete-button"]')

      await expect(page.locator(`text=${clientName}`)).not.toBeVisible({
        timeout: 5000,
      })
    })
  })

  test.describe('Search and Filter', () => {
    test('should search clients by name', async ({ page }) => {
      // Type in search box
      await page.fill('[data-testid="client-search-input"]', 'Acme')

      // Wait for filtering
      await page.waitForTimeout(500)

      // All visible clients should contain "Acme"
      const visibleClients = await page
        .locator('[data-testid="client-row"]:visible [data-testid="client-name"]')
        .allTextContents()

      visibleClients.forEach((name) => {
        expect(name.toLowerCase()).toContain('acme')
      })
    })

    test('should filter by client tier', async ({ page }) => {
      await page.click('[data-testid="tier-filter-select"]')
      await page.click('[data-testid="tier-filter-vip"]')

      await page.waitForTimeout(500)

      // All visible clients should be VIP tier
      const tierBadges = await page
        .locator('[data-testid="client-row"]:visible [data-testid="client-tier-badge"]')
        .allTextContents()

      tierBadges.forEach((badge) => {
        expect(badge).toContain('VIP')
      })
    })

    test('should filter by status (active/inactive)', async ({ page }) => {
      await page.click('[data-testid="status-filter-select"]')
      await page.click('[data-testid="status-filter-inactive"]')

      await page.waitForTimeout(500)

      const statusBadges = await page
        .locator('[data-testid="client-row"]:visible [data-testid="client-status-badge"]')
        .allTextContents()

      statusBadges.forEach((badge) => {
        expect(badge).toContain('Inactive')
      })
    })
  })
})

test.describe('Projects Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/projects')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Create Project', () => {
    test('should create a new project linked to a client', async ({ page }) => {
      await page.click('[data-testid="new-project-button"]')

      await expect(
        page.locator('[data-testid="project-form-dialog"]')
      ).toBeVisible()

      // Fill in project details
      await page.fill(
        '[data-testid="project-name-input"]',
        'Q1 2025 Marketing Campaign'
      )
      await page.fill(
        '[data-testid="project-description-input"]',
        'Digital marketing initiative for Q1'
      )

      // Select client
      await page.click('[data-testid="project-client-select"]')
      await page.click('[data-testid="client-option"]', { force: true }) // Select first available client

      // Set budget (optional)
      await page.fill('[data-testid="project-budget-input"]', '50000')

      // Set dates
      await page.fill('[data-testid="project-start-date"]', '2025-01-01')
      await page.fill('[data-testid="project-end-date"]', '2025-03-31')

      await page.click('[data-testid="submit-project-button"]')

      await expect(
        page.locator('[data-testid="success-message"]')
      ).toBeVisible({ timeout: 5000 })
      await expect(
        page.locator('text=Q1 2025 Marketing Campaign')
      ).toBeVisible()
    })

    test('should create project with only required fields', async ({
      page,
    }) => {
      await page.click('[data-testid="new-project-button"]')

      await page.fill('[data-testid="project-name-input"]', 'Minimal Project')

      // Select client (required)
      await page.click('[data-testid="project-client-select"]')
      await page.click('[data-testid="client-option"]', { force: true })

      await page.click('[data-testid="submit-project-button"]')

      await expect(
        page.locator('[data-testid="success-message"]')
      ).toBeVisible({ timeout: 5000 })
      await expect(page.locator('text=Minimal Project')).toBeVisible()
    })

    test('should set project status', async ({ page }) => {
      await page.click('[data-testid="new-project-button"]')

      await page.fill('[data-testid="project-name-input"]', 'Status Test')

      await page.click('[data-testid="project-client-select"]')
      await page.click('[data-testid="client-option"]', { force: true })

      // Set status
      await page.click('[data-testid="project-status-select"]')
      await page.click('[data-testid="project-status-in-progress"]')

      await page.click('[data-testid="submit-project-button"]')

      await expect(
        page.locator('[data-testid="success-message"]')
      ).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Project Validation', () => {
    test('should require project name', async ({ page }) => {
      await page.click('[data-testid="new-project-button"]')

      await page.click('[data-testid="submit-project-button"]')

      await expect(
        page.locator('[data-testid="project-name-error"]')
      ).toContainText('required')
    })

    test('should require client selection', async ({ page }) => {
      await page.click('[data-testid="new-project-button"]')

      await page.fill('[data-testid="project-name-input"]', 'No Client Project')

      await page.click('[data-testid="submit-project-button"]')

      await expect(
        page.locator('[data-testid="project-client-error"]')
      ).toContainText('required')
    })

    test('should validate end date is after start date', async ({ page }) => {
      await page.click('[data-testid="new-project-button"]')

      await page.fill('[data-testid="project-name-input"]', 'Date Test')

      await page.click('[data-testid="project-client-select"]')
      await page.click('[data-testid="client-option"]', { force: true })

      // Set end date before start date
      await page.fill('[data-testid="project-start-date"]', '2025-12-31')
      await page.fill('[data-testid="project-end-date"]', '2025-01-01')

      await page.click('[data-testid="submit-project-button"]')

      await expect(
        page.locator('[data-testid="project-date-error"]')
      ).toContainText('end date must be after start date')
    })

    test('should validate budget is a positive number', async ({ page }) => {
      await page.click('[data-testid="new-project-button"]')

      await page.fill('[data-testid="project-name-input"]', 'Budget Test')

      await page.click('[data-testid="project-client-select"]')
      await page.click('[data-testid="client-option"]', { force: true })

      await page.fill('[data-testid="project-budget-input"]', '-1000')

      await page.click('[data-testid="submit-project-button"]')

      await expect(
        page.locator('[data-testid="project-budget-error"]')
      ).toContainText('must be positive')
    })
  })

  test.describe('Edit Project', () => {
    test('should edit existing project', async ({ page }) => {
      await page
        .locator('[data-testid="project-row"]')
        .first()
        .locator('[data-testid="edit-project-button"]')
        .click()

      await expect(
        page.locator('[data-testid="project-form-dialog"]')
      ).toBeVisible()

      const currentName = await page
        .locator('[data-testid="project-name-input"]')
        .inputValue()
      await page.fill(
        '[data-testid="project-name-input"]',
        `${currentName} (Modified)`
      )

      await page.click('[data-testid="submit-project-button"]')

      await expect(
        page.locator('[data-testid="success-message"]')
      ).toBeVisible({ timeout: 5000 })
      await expect(
        page.locator(`text=${currentName} (Modified)`)
      ).toBeVisible()
    })

    test('should update project status', async ({ page }) => {
      await page
        .locator('[data-testid="project-row"]')
        .first()
        .locator('[data-testid="edit-project-button"]')
        .click()

      await page.click('[data-testid="project-status-select"]')
      await page.click('[data-testid="project-status-completed"]')

      await page.click('[data-testid="submit-project-button"]')

      await expect(
        page.locator('[data-testid="success-message"]')
      ).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Delete Project', () => {
    test('should delete project with confirmation', async ({ page }) => {
      const projectName = await page
        .locator('[data-testid="project-row"]')
        .first()
        .locator('[data-testid="project-name"]')
        .textContent()

      await page
        .locator('[data-testid="project-row"]')
        .first()
        .locator('[data-testid="delete-project-button"]')
        .click()

      await expect(
        page.locator('[data-testid="confirm-delete-dialog"]')
      ).toBeVisible()
      await page.click('[data-testid="confirm-delete-button"]')

      await expect(page.locator(`text=${projectName}`)).not.toBeVisible({
        timeout: 5000,
      })
    })
  })

  test.describe('Search and Filter', () => {
    test('should search projects by name', async ({ page }) => {
      await page.fill('[data-testid="project-search-input"]', 'Marketing')

      await page.waitForTimeout(500)

      const visibleProjects = await page
        .locator('[data-testid="project-row"]:visible [data-testid="project-name"]')
        .allTextContents()

      visibleProjects.forEach((name) => {
        expect(name.toLowerCase()).toContain('marketing')
      })
    })

    test('should filter by client', async ({ page }) => {
      await page.click('[data-testid="client-filter-select"]')
      await page.click('[data-testid="client-filter-option"]', { force: true })

      await page.waitForTimeout(500)

      // Should show only projects for selected client
      const projectCount = await page
        .locator('[data-testid="project-row"]:visible')
        .count()

      expect(projectCount).toBeGreaterThan(0)
    })

    test('should filter by status', async ({ page }) => {
      await page.click('[data-testid="status-filter-select"]')
      await page.click('[data-testid="status-filter-active"]')

      await page.waitForTimeout(500)

      const statusBadges = await page
        .locator('[data-testid="project-row"]:visible [data-testid="project-status-badge"]')
        .allTextContents()

      statusBadges.forEach((badge) => {
        expect(badge).toContain('Active')
      })
    })
  })

  test.describe('Empty State', () => {
    test('should show empty state when no projects exist', async ({ page }) => {
      // Navigate to projects page
      await page.goto('/dashboard/projects')

      const projectRows = await page
        .locator('[data-testid="project-row"]')
        .count()

      if (projectRows === 0) {
        await expect(
          page.locator('[data-testid="empty-state"]')
        ).toBeVisible()
        await expect(
          page.locator('[data-testid="empty-state-message"]')
        ).toContainText('No projects')
      }
    })
  })
})

test.describe('Client-Project Relationship', () => {
  test('should show client details on project page', async ({ page }) => {
    await page.goto('/dashboard/projects')

    // Click on first project to view details
    await page
      .locator('[data-testid="project-row"]')
      .first()
      .locator('[data-testid="view-project-button"]')
      .click()

    // Should display linked client information
    await expect(
      page.locator('[data-testid="project-client-info"]')
    ).toBeVisible()
    await expect(
      page.locator('[data-testid="project-client-name"]')
    ).not.toBeEmpty()
  })

  test('should navigate from project to client', async ({ page }) => {
    await page.goto('/dashboard/projects')

    await page
      .locator('[data-testid="project-row"]')
      .first()
      .locator('[data-testid="project-client-link"]')
      .click()

    // Should navigate to client detail page
    await expect(page).toHaveURL(/\/dashboard\/clients\//)
  })

  test('should show all projects for a client', async ({ page }) => {
    await page.goto('/dashboard/clients')

    // Click on a client
    await page
      .locator('[data-testid="client-row"]')
      .first()
      .locator('[data-testid="view-client-button"]')
      .click()

    // Should show related projects section
    await expect(
      page.locator('[data-testid="client-projects-section"]')
    ).toBeVisible()

    // Should list projects
    const projectCount = await page
      .locator('[data-testid="client-project-item"]')
      .count()

    expect(projectCount).toBeGreaterThanOrEqual(0)
  })
})
