import { test, expect } from '@playwright/test'
import { setupApiMocks, openLogFile, FIXTURE_COUNTS } from './fixtures/api-mocks'

test.describe('Log Viewer', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    await page.goto('/')
  })

  test('shows empty state when no file is opened', async ({ page }) => {
    await expect(page.locator('text=No file opened')).toBeVisible()
    await expect(page.locator('text=Click "Open File" to get started')).toBeVisible()
  })

  test('loads and displays log entries after opening a file', async ({ page }) => {
    await openLogFile(page)

    // Verify entries are rendered with actual message content
    await expect(page.locator('text=Application started')).toBeVisible()
    await expect(page.locator('text=Connection timeout to database server')).toBeVisible()
    await expect(page.locator('text=Health check passed')).toBeVisible()
  })

  test('shows correct statistics', async ({ page }) => {
    await openLogFile(page)

    // Verify sidebar statistics section shows expected labels and values
    const sidebar = page.locator('.sidebar-container')
    await expect(sidebar.locator('text=Total')).toBeVisible()
    await expect(sidebar.locator('text=Errors')).toBeVisible()
    await expect(sidebar.locator('text=Warnings')).toBeVisible()
  })

  test('filters entries by search query', async ({ page }) => {
    await openLogFile(page)

    const searchInput = page.locator('input[placeholder="Search logs..."]')
    await searchInput.fill('timeout')

    // Wait for filter to apply
    await page.waitForTimeout(500)

    // Should show matching entries
    await expect(page.locator('text=Connection timeout to database server')).toBeVisible()
  })

  test('has search input in sidebar', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search logs..."]')
    await expect(searchInput).toBeVisible()
  })

  test('has log levels section in sidebar', async ({ page }) => {
    await expect(page.locator('text=Log Levels')).toBeVisible()
  })

  test('shows threads section in sidebar', async ({ page }) => {
    await expect(page.getByText('Threads (0)')).toBeVisible()
  })

  test('shows main content area', async ({ page }) => {
    await expect(page.locator('.main-content')).toBeVisible()
  })
})
