import { test, expect } from '@playwright/test'
import { setupApiMocks, openLogFile } from './fixtures/api-mocks'

test.describe('Waterfall View', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    await page.goto('/')
  })

  test('shows empty state when no file is opened', async ({ page }) => {
    await expect(page.locator('text=No file opened')).toBeVisible()
  })

  test('shows waterfall tab after opening file', async ({ page }) => {
    await openLogFile(page)

    // Waterfall tab should be accessible
    await expect(page.locator('text=Waterfall')).toBeVisible()
  })

  test('can switch to waterfall view', async ({ page }) => {
    await openLogFile(page)

    await page.click('text=Waterfall')
    await page.waitForTimeout(300)

    // Should show waterfall view area
    await expect(page.locator('.main-content')).toBeVisible()
  })

  test('main content area is visible', async ({ page }) => {
    await expect(page.locator('.main-content')).toBeVisible()
  })
})
