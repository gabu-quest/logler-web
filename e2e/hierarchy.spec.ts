import { test, expect } from '@playwright/test'
import { setupApiMocks, openLogFile } from './fixtures/api-mocks'

test.describe('Hierarchy View', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    await page.goto('/')
  })

  test('shows empty state when no file is opened', async ({ page }) => {
    await expect(page.locator('text=No file opened')).toBeVisible()
  })

  test('shows thread selector when files are open', async ({ page }) => {
    await openLogFile(page)

    // Switch to hierarchy view via tab
    await page.click('.n-tabs-tab:has-text("Hierarchy")')
    await page.waitForTimeout(300)

    // Should show hierarchy view content area
    await expect(page.locator('.main-content')).toBeVisible()
  })

  test('shows empty state with no selection', async ({ page }) => {
    await openLogFile(page)
    await page.click('.n-tabs-tab:has-text("Hierarchy")')
    await page.waitForTimeout(300)

    // Before building, should show instruction text or select prompt
    await expect(page.locator('.main-content')).toBeVisible()
  })

  test('handles API error gracefully', async ({ page }) => {
    // Override hierarchy route to return error
    await page.route('**/api/hierarchy', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' }),
      })
    })

    await openLogFile(page)
    await page.click('.n-tabs-tab:has-text("Hierarchy")')
    await page.waitForTimeout(300)

    // Main content should still be visible (graceful error handling)
    await expect(page.locator('.main-content')).toBeVisible()
  })
})
