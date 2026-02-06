import type { Page } from '@playwright/test'

// ---- Fixture data with known exact values ----

const ENTRIES = [
  { line_number: 1, timestamp: '2024-01-15T10:00:00Z', level: 'INFO', message: 'Application started', thread_id: 'main', correlation_id: null, trace_id: null, span_id: null, service_name: 'api', raw: '2024-01-15T10:00:00Z INFO Application started', file: '/logs/app.log' },
  { line_number: 2, timestamp: '2024-01-15T10:00:01Z', level: 'INFO', message: 'Listening on port 8080', thread_id: 'main', correlation_id: null, trace_id: null, span_id: null, service_name: 'api', raw: '2024-01-15T10:00:01Z INFO Listening on port 8080', file: '/logs/app.log' },
  { line_number: 3, timestamp: '2024-01-15T10:00:02Z', level: 'INFO', message: 'Request GET /api/users processed in 45ms', thread_id: 'worker-1', correlation_id: 'req-001', trace_id: 'trace-abc', span_id: 'span-1', service_name: 'api', raw: '2024-01-15T10:00:02Z INFO Request GET /api/users', file: '/logs/app.log' },
  { line_number: 4, timestamp: '2024-01-15T10:00:03Z', level: 'DEBUG', message: 'Cache hit for user list', thread_id: 'worker-1', correlation_id: 'req-001', trace_id: 'trace-abc', span_id: 'span-2', service_name: 'cache', raw: '2024-01-15T10:00:03Z DEBUG Cache hit', file: '/logs/app.log' },
  { line_number: 5, timestamp: '2024-01-15T10:00:04Z', level: 'WARN', message: 'Slow query detected: SELECT * FROM orders took 2500ms', thread_id: 'worker-2', correlation_id: 'req-002', trace_id: 'trace-def', span_id: null, service_name: 'database', raw: '2024-01-15T10:00:04Z WARN Slow query', file: '/logs/app.log' },
  { line_number: 6, timestamp: '2024-01-15T10:00:05Z', level: 'ERROR', message: 'Connection timeout to database server', thread_id: 'worker-2', correlation_id: 'req-002', trace_id: 'trace-def', span_id: null, service_name: 'database', raw: '2024-01-15T10:00:05Z ERROR Connection timeout', file: '/logs/app.log' },
  { line_number: 7, timestamp: '2024-01-15T10:00:06Z', level: 'INFO', message: 'Request POST /api/orders processed in 120ms', thread_id: 'worker-3', correlation_id: 'req-003', trace_id: 'trace-ghi', span_id: 'span-3', service_name: 'api', raw: '2024-01-15T10:00:06Z INFO Request POST /api/orders', file: '/logs/app.log' },
  { line_number: 8, timestamp: '2024-01-15T10:00:07Z', level: 'WARN', message: 'Memory usage at 85%', thread_id: 'monitor', correlation_id: null, trace_id: null, span_id: null, service_name: 'system', raw: '2024-01-15T10:00:07Z WARN Memory 85%', file: '/logs/app.log' },
  { line_number: 9, timestamp: '2024-01-15T10:00:08Z', level: 'ERROR', message: 'Failed to process payment: insufficient funds', thread_id: 'worker-3', correlation_id: 'req-003', trace_id: 'trace-ghi', span_id: 'span-4', service_name: 'payment', raw: '2024-01-15T10:00:08Z ERROR Payment failed', file: '/logs/app.log' },
  { line_number: 10, timestamp: '2024-01-15T10:00:09Z', level: 'INFO', message: 'Health check passed', thread_id: 'main', correlation_id: null, trace_id: null, span_id: null, service_name: 'api', raw: '2024-01-15T10:00:09Z INFO Health check', file: '/logs/app.log' },
]

// Second file entries for multi-file tests
const ENTRIES_FILE2 = [
  { line_number: 1, timestamp: '2024-01-15T10:00:00Z', level: 'INFO', message: 'Worker started', thread_id: 'bg-1', correlation_id: null, trace_id: null, span_id: null, service_name: 'worker', raw: '2024-01-15T10:00:00Z INFO Worker started', file: '/logs/worker.log' },
  { line_number: 2, timestamp: '2024-01-15T10:00:05Z', level: 'ERROR', message: 'Job failed: timeout', thread_id: 'bg-1', correlation_id: null, trace_id: null, span_id: null, service_name: 'worker', raw: '2024-01-15T10:00:05Z ERROR Job failed', file: '/logs/worker.log' },
]

const THREADS = [
  { thread_id: 'main', log_count: 3, error_count: 0, first_seen: '2024-01-15T10:00:00Z', last_seen: '2024-01-15T10:00:09Z' },
  { thread_id: 'worker-1', log_count: 2, error_count: 0, first_seen: '2024-01-15T10:00:02Z', last_seen: '2024-01-15T10:00:03Z' },
  { thread_id: 'worker-2', log_count: 2, error_count: 1, first_seen: '2024-01-15T10:00:04Z', last_seen: '2024-01-15T10:00:05Z' },
  { thread_id: 'worker-3', log_count: 2, error_count: 1, first_seen: '2024-01-15T10:00:06Z', last_seen: '2024-01-15T10:00:08Z' },
  { thread_id: 'monitor', log_count: 1, error_count: 0, first_seen: '2024-01-15T10:00:07Z', last_seen: '2024-01-15T10:00:07Z' },
]

const HIERARCHY: import('@playwright/test').APIResponse extends never ? never : {
  hierarchy: {
    id: string; label: string; entry_count: number; error_count: number;
    start_time: string; end_time: string; duration_ms: number;
    children: Array<{
      id: string; label: string; entry_count: number; error_count: number;
      start_time: string; end_time: string; duration_ms: number;
      children: never[];
    }>;
  };
  error_analysis: { root_cause: string; error_chain: string[]; recommendations: string[]; impact_summary: string } | null;
} = {
  hierarchy: {
    id: 'root',
    label: 'main',
    entry_count: 10,
    error_count: 2,
    start_time: '2024-01-15T10:00:00Z',
    end_time: '2024-01-15T10:00:09Z',
    duration_ms: 9000,
    children: [
      { id: 'worker-1', label: 'worker-1', entry_count: 2, error_count: 0, start_time: '2024-01-15T10:00:02Z', end_time: '2024-01-15T10:00:03Z', duration_ms: 1000, children: [] },
      { id: 'worker-2', label: 'worker-2', entry_count: 2, error_count: 1, start_time: '2024-01-15T10:00:04Z', end_time: '2024-01-15T10:00:05Z', duration_ms: 1000, children: [] },
      { id: 'worker-3', label: 'worker-3', entry_count: 2, error_count: 1, start_time: '2024-01-15T10:00:06Z', end_time: '2024-01-15T10:00:08Z', duration_ms: 2000, children: [] },
    ],
  },
  error_analysis: {
    root_cause: 'Database connection timeout',
    error_chain: ['Connection timeout to database server', 'Failed to process payment: insufficient funds'],
    recommendations: ['Check database connectivity', 'Add retry logic'],
    impact_summary: '2 errors across 2 threads',
  },
}

const SQL_RESULT = {
  columns: ['level', 'count'],
  rows: [
    { level: 'INFO', count: 5 },
    { level: 'WARN', count: 2 },
    { level: 'ERROR', count: 2 },
    { level: 'DEBUG', count: 1 },
  ],
  row_count: 4,
}

const METRICS_RESULT = {
  fields: {
    duration_ms: {
      count: 10,
      stats: { min: 45, max: 2500, mean: 450, median: 120, stddev: 750, p95: 2500, p99: 2500 },
      first_timestamp: '2024-01-15T10:00:00Z',
      last_timestamp: '2024-01-15T10:00:09Z',
      anomalies: [{ timestamp: '2024-01-15T10:00:04Z', value: 2500, z_score: 2.7, file: '/logs/app.log', line_number: 5 }],
      buckets: [
        { start: '2024-01-15T10:00:00Z', end: '2024-01-15T10:00:05Z', min: 45, max: 2500, avg: 850, count: 5 },
        { start: '2024-01-15T10:00:05Z', end: '2024-01-15T10:00:10Z', min: 0, max: 120, avg: 60, count: 5 },
      ],
    },
  },
  entries_scanned: 10,
  files_searched: 1,
}

const FORMAT_DETECT_RESULT = {
  files: {
    '/logs/app.log': {
      format: 'json',
      confidence: 0.95,
      sample_size: 10,
      match_rate: 1.0,
      alternatives: [{ format: 'logfmt', confidence: 0.1, match_rate: 0.2 }],
      detected_fields: ['timestamp', 'level', 'message', 'thread_id'],
      sample_lines: ['{"timestamp":"...","level":"INFO","message":"..."}'],
      mixed: false,
    },
  },
}

/** Known counts for assertions */
export const FIXTURE_COUNTS = {
  totalEntries: ENTRIES.length, // 10
  errorEntries: 2,
  warnEntries: 2,
  infoEntries: 5,
  debugEntries: 1,
  threads: THREADS.length, // 5
  hierarchyChildren: 3,
  sqlRows: 4,
}

/**
 * Set up route interception for all /api/* endpoints.
 * Each test can override specific routes after calling this.
 */
export async function setupApiMocks(page: Page) {
  // Browse - returns a directory listing
  await page.route('**/api/files/browse*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        current_dir: '/logs',
        parent_dir: '/',
        files: [
          { name: 'app.log', path: '/logs/app.log', size: 15360, modified: '2024-01-15T10:30:00Z', is_log: true },
          { name: 'worker.log', path: '/logs/worker.log', size: 4096, modified: '2024-01-15T10:30:00Z', is_log: true },
          { name: 'config.yaml', path: '/logs/config.yaml', size: 512, modified: '2024-01-14T09:00:00Z', is_log: false },
        ],
        directories: [
          { name: 'archive', path: '/logs/archive' },
        ],
        log_root: '/logs',
      }),
    })
  })

  // Glob search
  await page.route('**/api/files/glob*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        pattern: '*.log',
        count: 2,
        files: [
          { name: 'app.log', path: '/logs/app.log', size: 15360, modified: '2024-01-15T10:30:00Z', is_log: true },
          { name: 'worker.log', path: '/logs/worker.log', size: 4096, modified: '2024-01-15T10:30:00Z', is_log: true },
        ],
        truncated: false,
      }),
    })
  })

  // Open single file
  await page.route('**/api/files/open', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        file_path: '/logs/app.log',
        entries: ENTRIES,
        total: ENTRIES.length,
        partial: false,
      }),
    })
  })

  // Open many files
  await page.route('**/api/files/open_many', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        files: ['/logs/app.log'],
        entries: ENTRIES,
        total: ENTRIES.length,
        file_counts: { '/logs/app.log': ENTRIES.length },
        file_meta: [{
          path: '/logs/app.log',
          count: ENTRIES.length,
          first_ts: '2024-01-15T10:00:00Z',
          last_ts: '2024-01-15T10:00:09Z',
        }],
      }),
    })
  })

  // Filter
  await page.route('**/api/files/filter', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ entries: ENTRIES, total: ENTRIES.length }),
    })
  })

  // Threads
  await page.route('**/api/threads', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(THREADS),
    })
  })

  // Traces
  await page.route('**/api/traces', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { trace_id: 'trace-abc', spans: ['span-1', 'span-2'], start_time: '2024-01-15T10:00:02Z', end_time: '2024-01-15T10:00:03Z' },
        { trace_id: 'trace-def', spans: [], start_time: '2024-01-15T10:00:04Z', end_time: '2024-01-15T10:00:05Z' },
        { trace_id: 'trace-ghi', spans: ['span-3', 'span-4'], start_time: '2024-01-15T10:00:06Z', end_time: '2024-01-15T10:00:08Z' },
      ]),
    })
  })

  // Hierarchy
  await page.route('**/api/hierarchy', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(HIERARCHY),
    })
  })

  // SQL
  await page.route('**/api/sql', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SQL_RESULT),
    })
  })

  // Metrics
  await page.route('**/api/metrics/extract', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(METRICS_RESULT),
    })
  })

  // Format detection
  await page.route('**/api/formats/detect', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(FORMAT_DETECT_RESULT),
    })
  })

  // Format config (for settings panel)
  await page.route('**/api/formats/config*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ available: false, config_path: null, formats: {} }),
    })
  })

  // Correlations config
  await page.route('**/api/correlations/config*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ available: false, config_path: null, groups: {} }),
    })
  })

  // Correlations run
  await page.route('**/api/correlations/run', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ clusters: [], total_clusters: 0, total_entries_correlated: 0, groups_applied: [], files_searched: 1, entries_loaded: 10 }),
    })
  })

  // Event correlate
  await page.route('**/api/events/correlate', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ clusters: [], total_clusters: 0, total_entries_correlated: 0, files_searched: 1, window: '5s' }),
    })
  })

  // Builtin formats
  await page.route('**/api/formats/builtin', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ available: true, formats: {} }),
    })
  })
}

/**
 * Open a file through the UI: click Open, select file, click Open Selected.
 * Requires setupApiMocks to have been called first.
 */
export async function openLogFile(page: Page) {
  // Start listening for browse response BEFORE clicking to avoid race condition
  const browsePromise = page.waitForResponse('**/api/files/browse*')
  await page.getByRole('button', { name: 'Open File' }).click()
  await browsePromise

  // Click the file row text — this triggers openSingleFile() which calls /api/files/open
  // and immediately closes the modal (no need for "Open Selected")
  const openPromise = page.waitForResponse('**/api/files/open')
  await page.locator('text=app.log').first().click()
  await openPromise

  // Wait for entries to render
  await page.waitForTimeout(300)
}
