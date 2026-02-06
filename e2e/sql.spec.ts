import { test, expect } from '@playwright/test'
import { setupApiMocks, openLogFile, FIXTURE_COUNTS } from './fixtures/api-mocks'

test.describe('SQL View', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    await page.goto('/')
  })

  test('shows empty state when no file is opened', async ({ page }) => {
    await expect(page.locator('text=No file opened')).toBeVisible()
  })

  test('shows SQL editor and preset buttons after opening file', async ({ page }) => {
    await openLogFile(page)
    await page.click('text=SQL')
    await page.waitForTimeout(300)

    // Should show query editor textarea
    await expect(page.locator('textarea')).toBeVisible()

    // Should show preset buttons
    await expect(page.locator('button:has-text("All Errors")')).toBeVisible()
    await expect(page.locator('button:has-text("By Thread")')).toBeVisible()
    await expect(page.locator('button:has-text("By Level")')).toBeVisible()
    await expect(page.locator('button:has-text("Recent Logs")')).toBeVisible()
  })

  test('shows execute and clear buttons', async ({ page }) => {
    await openLogFile(page)
    await page.click('text=SQL')
    await page.waitForTimeout(300)

    await expect(page.locator('button:has-text("Execute")')).toBeVisible()
    await expect(page.locator('button:has-text("Clear")')).toBeVisible()
  })

  test('executes query and shows results table with correct data', async ({ page }) => {
    await openLogFile(page)
    await page.click('text=SQL')
    await page.waitForTimeout(300)

    // Type a query
    await page.locator('textarea').fill('SELECT level, count(*) as count FROM logs GROUP BY level')

    // Execute — register listener BEFORE the click to avoid race condition
    const sqlPromise = page.waitForResponse('**/api/sql')
    await page.click('button:has-text("Execute")')
    await sqlPromise
    await page.waitForTimeout(300)

    // Results should show correct row count from fixture
    await expect(page.locator(`text=${FIXTURE_COUNTS.sqlRows} rows`)).toBeVisible()

    // Should show column headers and data in the results table
    const resultsTable = page.locator('table')
    await expect(resultsTable.first()).toBeVisible()

    // Should show actual data values from fixture rows
    await expect(page.locator('td:has-text("INFO")')).toBeVisible()
    await expect(page.locator('td:has-text("ERROR")')).toBeVisible()
  })

  test('shows SQL error message for bad queries', async ({ page }) => {
    // Override SQL route to return error
    await page.route('**/api/sql', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          columns: [],
          rows: [],
          row_count: 0,
          error: 'near "SLECT": syntax error',
        }),
      })
    })

    await openLogFile(page)
    await page.click('text=SQL')
    await page.waitForTimeout(300)

    await page.locator('textarea').fill('SLECT * FROM logs')
    const sqlErrorPromise = page.waitForResponse('**/api/sql')
    await page.click('button:has-text("Execute")')
    await sqlErrorPromise
    await page.waitForTimeout(300)

    // Should show error alert with the SQL error message
    await expect(page.locator('text=syntax error')).toBeVisible()
  })

  test('shows empty results state before executing', async ({ page }) => {
    await openLogFile(page)
    await page.click('text=SQL')
    await page.waitForTimeout(300)

    // Before running any query, should show prompt text
    await expect(page.locator('text=Execute a query to see results')).toBeVisible()
  })

  test('uses preset query buttons to fill editor', async ({ page }) => {
    await openLogFile(page)
    await page.click('text=SQL')
    await page.waitForTimeout(300)

    // Click a preset button
    await page.click('button:has-text("All Errors")')

    // The textarea should now contain a query
    const textarea = page.locator('textarea')
    const value = await textarea.inputValue()
    expect(value.length).toBeGreaterThan(0)
    // The All Errors preset should reference ERROR level
    expect(value.toLowerCase()).toContain('error')
  })

  test('can switch to SQL view with keyboard shortcut', async ({ page }) => {
    await openLogFile(page)

    // Press 4 to switch to SQL view
    await page.keyboard.press('4')
    await page.waitForTimeout(300)

    // Should show SQL editor
    await expect(page.locator('textarea')).toBeVisible()
    await expect(page.locator('button:has-text("Execute")')).toBeVisible()
  })
})
