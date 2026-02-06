import type {
  CorrelationCluster,
  CorrelationRunResponse,
  EventCorrelationCluster,
  EventCorrelateResponse,
  CorrelationEntryRef,
} from '@/api/types'

export function createCorrelationEntryRef(overrides: Partial<CorrelationEntryRef> = {}): CorrelationEntryRef {
  return {
    file: 'app.log',
    line_number: 1,
    level: 'INFO',
    timestamp: '2024-01-15T10:00:00Z',
    message: 'Request started',
    ...overrides,
  }
}

export function createCorrelationCluster(overrides: Partial<CorrelationCluster> = {}): CorrelationCluster {
  return {
    virtual_trace_id: 'vtrace-001',
    group: 'request_flow',
    rule_type: 'field_match',
    rule_index: 0,
    shared_value: 'req-123',
    source_field: 'correlation_id',
    target_field: 'correlation_id',
    entry_count: 3,
    entries: [
      createCorrelationEntryRef({ line_number: 10, message: 'Request received' }),
      createCorrelationEntryRef({ line_number: 15, message: 'Processing request' }),
      createCorrelationEntryRef({ line_number: 20, message: 'Response sent' }),
    ],
    ...overrides,
  }
}

export function createCorrelationRunResponse(
  overrides: Partial<CorrelationRunResponse> = {},
): CorrelationRunResponse {
  const clusters = overrides.clusters ?? [
    createCorrelationCluster({ virtual_trace_id: 'vtrace-001', entry_count: 3 }),
    createCorrelationCluster({ virtual_trace_id: 'vtrace-002', shared_value: 'req-456', entry_count: 2 }),
  ]
  return {
    clusters,
    total_clusters: clusters.length,
    total_entries_correlated: clusters.reduce((sum, c) => sum + c.entry_count, 0),
    groups_applied: ['request_flow'],
    files_searched: 1,
    entries_loaded: 100,
    ...overrides,
  }
}

export function createEventCorrelationCluster(
  overrides: Partial<EventCorrelationCluster> = {},
): EventCorrelationCluster {
  return {
    virtual_trace_id: 'evtrace-001',
    rule_type: 'event_window',
    anchor_timestamp: '2024-01-15T10:00:10Z',
    anchor_message: 'Database timeout',
    window: '5s',
    entry_count: 4,
    entries: [
      createCorrelationEntryRef({ line_number: 8, message: 'Connection pool low' }),
      createCorrelationEntryRef({ line_number: 10, message: 'Database timeout', level: 'ERROR' }),
      createCorrelationEntryRef({ line_number: 11, message: 'Request failed', level: 'ERROR' }),
      createCorrelationEntryRef({ line_number: 12, message: 'Retrying connection' }),
    ],
    ...overrides,
  }
}

export function createEventCorrelateResponse(
  overrides: Partial<EventCorrelateResponse> = {},
): EventCorrelateResponse {
  const clusters = overrides.clusters ?? [createEventCorrelationCluster()]
  return {
    clusters,
    total_clusters: clusters.length,
    total_entries_correlated: clusters.reduce((sum, c) => sum + c.entry_count, 0),
    files_searched: 1,
    window: '5s',
    ...overrides,
  }
}
