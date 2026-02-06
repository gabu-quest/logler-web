import { test, expect } from '@playwright/test'
import { setupApiMocks, openLogFile } from './fixtures/api-mocks'

test.describe('Correlation Controls', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    await page.goto('/')
  })

  test('shows correlation controls in sidebar when config available', async ({ page }) => {
    // Override config to indicate correlation is available
    await page.route('**/api/correlations/config*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          available: true,
          config_path: '/logs/.logler.toml',
          groups: {
            'request-tracking': {
              rules: [
                { type: 'field_match', source_field: 'correlation_id', target_field: 'correlation_id' },
              ],
            },
          },
        }),
      })
    })

    await openLogFile(page)
    await page.waitForTimeout(500)

    // Should show Correlations section in sidebar
    await expect(page.locator('.correlation-controls')).toBeVisible()
  })

  test('runs correlations and shows cluster results', async ({ page }) => {
    // Set up config as available
    await page.route('**/api/correlations/config*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          available: true,
          config_path: '/logs/.logler.toml',
          groups: {
            'request-tracking': {
              rules: [
                { type: 'field_match', source_field: 'correlation_id', target_field: 'correlation_id' },
              ],
            },
          },
        }),
      })
    })

    // Set up correlation run results
    await page.route('**/api/correlations/run', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          clusters: [
            {
              virtual_trace_id: 'vtrace-001',
              group: 'request-tracking',
              rule_type: 'field_match',
              rule_index: 0,
              shared_value: 'req-001',
              source_field: 'correlation_id',
              target_field: 'correlation_id',
              entry_count: 2,
              entries: [
                { file: '/logs/app.log', line_number: 3, level: 'INFO', timestamp: '2024-01-15T10:00:02Z', message: 'Request GET /api/users processed in 45ms' },
                { file: '/logs/app.log', line_number: 4, level: 'DEBUG', timestamp: '2024-01-15T10:00:03Z', message: 'Cache hit for user list' },
              ],
            },
          ],
          total_clusters: 1,
          total_entries_correlated: 2,
          groups_applied: ['request-tracking'],
          files_searched: 1,
          entries_loaded: 10,
        }),
      })
    })

    await openLogFile(page)
    await page.waitForTimeout(500)

    // Click Run button — register listener BEFORE click
    const runPromise = page.waitForResponse('**/api/correlations/run')
    await page.click('button:has-text("Run")')
    await runPromise
    await page.waitForTimeout(300)

    // Should show result summary with cluster count
    await expect(page.locator('.result-summary')).toBeVisible()
    await expect(page.locator('.result-summary')).toContainText('2 entries linked')
  })

  test('opens correlation panel with cluster details', async ({ page }) => {
    // Set up config
    await page.route('**/api/correlations/config*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          available: true,
          config_path: '/logs/.logler.toml',
          groups: {
            'request-tracking': {
              rules: [
                { type: 'field_match', source_field: 'correlation_id', target_field: 'correlation_id' },
              ],
            },
          },
        }),
      })
    })

    // Set up correlation run with a cluster
    await page.route('**/api/correlations/run', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          clusters: [
            {
              virtual_trace_id: 'vtrace-001',
              group: 'request-tracking',
              rule_type: 'field_match',
              rule_index: 0,
              shared_value: 'req-001',
              source_field: 'correlation_id',
              target_field: 'correlation_id',
              entry_count: 2,
              entries: [
                { file: '/logs/app.log', line_number: 3, level: 'INFO', timestamp: '2024-01-15T10:00:02Z', message: 'Request GET /api/users processed in 45ms' },
                { file: '/logs/app.log', line_number: 4, level: 'DEBUG', timestamp: '2024-01-15T10:00:03Z', message: 'Cache hit for user list' },
              ],
            },
          ],
          total_clusters: 1,
          total_entries_correlated: 2,
          groups_applied: ['request-tracking'],
          files_searched: 1,
          entries_loaded: 10,
        }),
      })
    })

    await openLogFile(page)
    await page.waitForTimeout(500)

    // Run correlations — register listener BEFORE click
    const runPromise2 = page.waitForResponse('**/api/correlations/run')
    await page.click('button:has-text("Run")')
    await runPromise2
    await page.waitForTimeout(300)

    // Click clusters button to open panel
    await page.click('button:has-text("1 clusters")')
    await page.waitForTimeout(300)

    // Panel should open showing cluster details (in drawer/dialog)
    const panel = page.locator('role=dialog')
    await expect(panel).toBeVisible()

    // Should show virtual trace ID
    await expect(panel.locator('text=vtrace-001')).toBeVisible()

    // Should show shared value
    await expect(panel.locator('text=req-001')).toBeVisible()

    // Should show correlated entry messages
    await expect(panel.locator('text=Request GET /api/users processed in 45ms')).toBeVisible()
    await expect(panel.locator('text=Cache hit for user list')).toBeVisible()
  })

  test('clears correlation results', async ({ page }) => {
    // Set up config + results
    await page.route('**/api/correlations/config*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          available: true,
          config_path: '/logs/.logler.toml',
          groups: { 'g': { rules: [{ type: 'field_match', source_field: 'a', target_field: 'b' }] } },
        }),
      })
    })

    await page.route('**/api/correlations/run', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          clusters: [{ virtual_trace_id: 'v1', group: 'g', rule_type: 'field_match', rule_index: 0, entry_count: 1, entries: [] }],
          total_clusters: 1,
          total_entries_correlated: 1,
          groups_applied: ['g'],
          files_searched: 1,
          entries_loaded: 10,
        }),
      })
    })

    await openLogFile(page)
    await page.waitForTimeout(500)

    const runPromise3 = page.waitForResponse('**/api/correlations/run')
    await page.click('button:has-text("Run")')
    await runPromise3
    await page.waitForTimeout(300)

    // Results visible
    await expect(page.locator('.result-summary')).toBeVisible()

    // Click Clear
    await page.click('button:has-text("Clear")')
    await page.waitForTimeout(300)

    // Results should disappear, Clear button should disappear
    await expect(page.locator('.result-summary')).not.toBeVisible()
  })
})
