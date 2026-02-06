import { test, expect } from '@playwright/test'
import { setupApiMocks } from './fixtures/api-mocks'

test.describe('File Browser', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    await page.goto('/')
  })

  test('opens file browser modal when clicking open button', async ({ page }) => {
    await page.getByRole('button', { name: 'Open File' }).click()

    await expect(page.locator('.n-modal')).toBeVisible()
    await expect(page.locator('text=Open Log File')).toBeVisible()
  })

  test('browses directories and shows file listing', async ({ page }) => {
    const browsePromise = page.waitForResponse('**/api/files/browse*')
    await page.getByRole('button', { name: 'Open File' }).click()
    await browsePromise

    // Should show files from mock
    await expect(page.locator('text=app.log')).toBeVisible()
    await expect(page.locator('text=worker.log')).toBeVisible()
  })

  test('shows directory in listing', async ({ page }) => {
    const browsePromise = page.waitForResponse('**/api/files/browse*')
    await page.getByRole('button', { name: 'Open File' }).click()
    await browsePromise

    await expect(page.locator('text=archive')).toBeVisible()
  })

  test('has browse and search tabs', async ({ page }) => {
    await page.getByRole('button', { name: 'Open File' }).click()

    await expect(page.locator('.n-tabs-tab:has-text("Browse")')).toBeVisible()
    await expect(page.locator('.n-tabs-tab:has-text("Search")')).toBeVisible()
  })

  test('can switch to search tab with glob input', async ({ page }) => {
    await page.getByRole('button', { name: 'Open File' }).click()
    await page.click('.n-tabs-tab:has-text("Search")')

    await expect(page.locator('input[placeholder*="glob pattern"]')).toBeVisible()
  })

  test('shows preset glob patterns in search tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Open File' }).click()
    await page.click('.n-tabs-tab:has-text("Search")')

    await expect(page.getByRole('button', { name: '*.log', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '**/*.log' })).toBeVisible()
  })

  test('closes modal with cancel button', async ({ page }) => {
    await page.getByRole('button', { name: 'Open File' }).click()
    await expect(page.locator('.n-modal')).toBeVisible()

    await page.click('button:has-text("Cancel")')

    await expect(page.locator('.n-modal')).not.toBeVisible()
  })

  test('open selected button is disabled when no files selected', async ({ page }) => {
    await page.getByRole('button', { name: 'Open File' }).click()

    const openButton = page.locator('button:has-text("Open Selected")')
    await expect(openButton).toBeDisabled()
  })
})
