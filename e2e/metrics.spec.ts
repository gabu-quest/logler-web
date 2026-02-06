import { test, expect } from '@playwright/test'
import { setupApiMocks, openLogFile } from './fixtures/api-mocks'

test.describe('Metrics View', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    await page.goto('/')
  })

  test('shows empty state when no file is opened', async ({ page }) => {
    await expect(page.locator('text=No file opened')).toBeVisible()
  })

  test('shows metrics toolbar after switching to metrics tab', async ({ page }) => {
    await openLogFile(page)
    await page.click('text=Metrics')
    await page.waitForTimeout(300)

    // Should show the extract/refresh button and field selector
    await expect(page.locator('.metrics-view')).toBeVisible()
  })

  test('extracts metrics and shows field statistics', async ({ page }) => {
    await openLogFile(page)
    await page.click('text=Metrics')
    await page.waitForTimeout(300)

    // Click extract/refresh to trigger metrics extraction
    // The button may say "Extract Metrics" or "Refresh"
    const extractButton = page.locator('button:has-text("Extract Metrics"), button:has-text("Refresh")')
    if (await extractButton.isVisible()) {
      const metricsPromise = page.waitForResponse('**/api/metrics/extract')
      await extractButton.first().click()
      await metricsPromise
      await page.waitForTimeout(500)
    }

    // Should show field name from fixture: duration_ms
    await expect(page.locator('text=duration_ms').first()).toBeVisible()

    // Should show stat values from fixture (min=45, max=2500, mean=450)
    await expect(page.getByText('45', { exact: true })).toBeVisible()
    await expect(page.getByText('2500', { exact: true }).first()).toBeVisible()
  })

  test('shows anomaly indicator when anomalies exist', async ({ page }) => {
    await openLogFile(page)
    await page.click('text=Metrics')
    await page.waitForTimeout(300)

    const extractButton = page.locator('button:has-text("Extract Metrics"), button:has-text("Refresh")')
    if (await extractButton.isVisible()) {
      const metricsPromise = page.waitForResponse('**/api/metrics/extract')
      await extractButton.first().click()
      await metricsPromise
      await page.waitForTimeout(500)
    }

    // Fixture has 1 anomaly for duration_ms - should show anomaly count
    await expect(page.locator('text=/anomal/i')).toBeVisible()
  })

  test('shows empty state for no numeric fields', async ({ page }) => {
    // Override metrics route to return empty fields
    await page.route('**/api/metrics/extract', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          fields: {},
          entries_scanned: 10,
          files_searched: 1,
        }),
      })
    })

    await openLogFile(page)
    await page.click('text=Metrics')
    await page.waitForTimeout(300)

    const extractButton = page.locator('button:has-text("Extract Metrics"), button:has-text("Refresh")')
    if (await extractButton.isVisible()) {
      const metricsPromise = page.waitForResponse('**/api/metrics/extract')
      await extractButton.first().click()
      await metricsPromise
      await page.waitForTimeout(500)
    }

    // Should show no fields message
    await expect(page.locator('text=/no numeric/i')).toBeVisible()
  })
})
