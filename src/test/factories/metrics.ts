import type { MetricsExtractResponse, MetricsFieldData, MetricsFieldStats } from '@/api/types'

export function createMetricsFieldStats(overrides: Partial<MetricsFieldStats> = {}): MetricsFieldStats {
  return {
    min: 10,
    max: 500,
    mean: 120.5,
    median: 105.0,
    stddev: 85.3,
    p95: 350.0,
    p99: 480.0,
    ...overrides,
  }
}

export function createMetricsFieldData(overrides: Partial<MetricsFieldData> = {}): MetricsFieldData {
  return {
    count: 50,
    stats: createMetricsFieldStats(overrides.stats),
    first_timestamp: '2024-01-15T10:00:00Z',
    last_timestamp: '2024-01-15T10:30:00Z',
    anomalies: [],
    buckets: [
      { start: '2024-01-15T10:00:00Z', end: '2024-01-15T10:05:00Z', min: 10, max: 200, avg: 95, count: 10 },
      { start: '2024-01-15T10:05:00Z', end: '2024-01-15T10:10:00Z', min: 15, max: 300, avg: 120, count: 12 },
    ],
    ...overrides,
  }
}

export function createMetricsResponse(overrides: Partial<MetricsExtractResponse> = {}): MetricsExtractResponse {
  return {
    fields: {
      duration_ms: createMetricsFieldData({ count: 50, stats: createMetricsFieldStats({ min: 10, max: 500, mean: 120.5 }) }),
      memory_mb: createMetricsFieldData({ count: 30, stats: createMetricsFieldStats({ min: 256, max: 1024, mean: 512.0 }) }),
      queue_depth: createMetricsFieldData({ count: 45, stats: createMetricsFieldStats({ min: 0, max: 100, mean: 12.5 }) }),
    },
    entries_scanned: 200,
    files_searched: 1,
    ...overrides,
  }
}
