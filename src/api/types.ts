// API Request/Response Types

export interface LogEntry {
  line_number: number
  timestamp: string | null
  level: string
  message: string
  thread_id: string | null
  correlation_id: string | null
  trace_id: string | null
  span_id: string | null
  service_name: string | null
  raw: string
  file?: string
}

export interface FileInfo {
  name: string
  path: string
  size: number
  modified: string
  is_log: boolean
}

export interface DirectoryInfo {
  name: string
  path: string
}

export interface BrowseResponse {
  current_dir: string
  parent_dir: string | null
  files: FileInfo[]
  directories: DirectoryInfo[]
  log_root: string
}

export interface GlobResponse {
  pattern: string
  count: number
  files: FileInfo[]
  truncated: boolean
}

export interface OpenFileRequest {
  path: string
  filters?: FilterOptions
  limit?: number
  quick?: boolean
}

export interface OpenFileResponse {
  file_path: string
  entries: LogEntry[]
  total: number
  partial: boolean
}

export interface OpenManyRequest {
  paths: string[]
  filters?: FilterOptions
  limit?: number
}

export interface OpenManyResponse {
  files: string[]
  entries: LogEntry[]
  total: number
  file_counts: Record<string, number>
  file_meta: Array<{
    path: string
    count: number
    first_ts: string | null
    last_ts: string | null
  }>
}

export interface FilterOptions {
  search?: string
  levels?: string[]
  thread_id?: string
  correlation_id?: string
  trace_id?: string
}

export interface FilterRequest {
  paths: string[]
  filters?: FilterOptions
  limit?: number
  sample_per_level?: number
  sample_per_thread?: number
}

export interface FilterResponse {
  entries: LogEntry[]
  total: number
  sampled?: boolean
}

export interface ThreadInfo {
  thread_id: string
  log_count: number
  error_count: number
  first_seen: string | null
  last_seen: string | null
}

export interface TraceInfo {
  trace_id: string
  spans: string[]
  start_time: string | null
  end_time: string | null
}

export interface HierarchyRequest {
  paths: string[]
  root_identifier: string
  max_depth?: number
  min_confidence?: number
  use_naming_patterns?: boolean
  use_temporal_inference?: boolean
}

export interface HierarchyNode {
  id: string
  label: string
  entry_count: number
  error_count: number
  start_time: string | null
  end_time: string | null
  duration_ms: number | null
  children: HierarchyNode[]
}

export interface ErrorAnalysis {
  root_cause: string | null
  error_chain: string[]
  recommendations: string[]
  impact_summary: string
}

export interface HierarchyResponse {
  hierarchy: HierarchyNode
  error_analysis: ErrorAnalysis | null
}

export interface SqlRequest {
  query: string
}

export interface SqlResponse {
  columns: string[]
  rows: Record<string, unknown>[]
  row_count: number
  error?: string
}

// Context API
export interface ContextRequest {
  paths: string[]
  line_number: number
  file_path: string
  before?: number
  after?: number
}

export interface ContextEntry extends LogEntry {
  is_target: boolean
}

export interface ContextResponse {
  entries: ContextEntry[]
  target_line: number
  file_path: string
}

// Thread Follow API
export interface FollowThreadRequest {
  paths: string[]
  identifier: string
  identifier_type?: 'thread_id' | 'correlation_id' | 'trace_id'
}

export interface ThreadTimeline {
  identifier: string
  identifier_type: string
  entries: LogEntry[]
  duration_ms: number | null
  span_count: number
  service_names: string[]
  error_count: number
  start_time: string | null
  end_time: string | null
}

// Extract IDs API
export interface ExtractIdsRequest {
  paths: string[]
}

export interface IdInfo {
  id: string
  count: number
  first_seen: string | null
  last_seen: string | null
}

export interface ExtractedIds {
  thread_ids: IdInfo[]
  correlation_ids: IdInfo[]
  trace_ids: IdInfo[]
}

// Compare Threads API
export interface CompareThreadsRequest {
  paths: string[]
  id1: string
  id2: string
}

export interface ThreadComparison {
  id1: string
  id2: string
  timeline1: ThreadTimeline
  timeline2: ThreadTimeline
  duration_diff_ms: number | null
  entry_count_diff: number
  error_count_diff: number
  common_services: string[]
  unique_services_1: string[]
  unique_services_2: string[]
}

// Cross-Service Timeline API
export interface CrossServiceTimelineRequest {
  paths: string[]
  identifier?: string
}

export interface ServiceLane {
  service_name: string
  entries: LogEntry[]
  start_time: string | null
  end_time: string | null
  duration_ms: number | null
  error_count: number
}

export interface CrossServiceTimeline {
  identifier: string | null
  lanes: ServiceLane[]
  total_duration_ms: number | null
  start_time: string | null
  end_time: string | null
}

// Smart Sample API
export type SampleStrategy = 'errors_focused' | 'diverse' | 'representative' | 'chronological'

export interface SmartSampleRequest {
  paths: string[]
  strategy?: SampleStrategy
  sample_size?: number
}

export interface SmartSampleResponse {
  entries: LogEntry[]
  strategy: SampleStrategy
  original_count: number
  sample_count: number
}

// Format Config API (M1.4)
export interface FormatDefinition {
  regex: string
  timestamp_format: string | null
  file_patterns: string[]
}

export interface FormatConfigResponse {
  available: boolean
  config_path: string | null
  formats: Record<string, FormatDefinition>
  error?: string
}

export interface BuiltinFormatsResponse {
  available: boolean
  formats: Record<string, FormatDefinition>
}

export interface FormatTestRequest {
  regex: string
  sample_lines: string[]
}

export interface FormatTestResult {
  line: string
  matched: boolean
  groups: Record<string, string>
}

export interface FormatTestResponse {
  results: FormatTestResult[]
  named_groups: string[]
  match_count: number
  total_lines: number
  error?: string
}

export interface FormatSaveRequest {
  formats: Record<string, FormatDefinition>
  directory?: string
}

export interface FormatSaveResponse {
  saved: boolean
  config_path: string
  format_count: number
}

// Correlation API (M2.5)
export interface CorrelationRuleSummary {
  type: 'field_match' | 'temporal'
  source_field?: string
  target_field?: string
  source_pattern?: string
  target_pattern?: string
  window?: string
  anchor?: {
    file_pattern?: string
    field?: string
    condition?: string
    level?: string
    pattern?: string
  }
}

export interface CorrelationGroupInfo {
  description: string
  rule_count: number
  rules: CorrelationRuleSummary[]
}

export interface CorrelationConfigResponse {
  available: boolean
  config_path: string | null
  groups: Record<string, CorrelationGroupInfo>
  error?: string
}

export interface CorrelationRunRequest {
  paths: string[]
  rule?: string
}

export interface CorrelationCluster {
  virtual_trace_id: string
  group: string
  rule_type: 'field_match' | 'temporal'
  rule_index: number
  shared_value?: string
  source_field?: string
  target_field?: string
  anchor_timestamp?: string
  anchor_message?: string
  window?: string
  entry_count: number
  source_count?: number
  target_count?: number
  entries: CorrelationEntryRef[]
}

export interface CorrelationEntryRef {
  file: string
  line_number?: number
  level?: string
  timestamp?: string
  message?: string
}

export interface CorrelationRunResponse {
  clusters: CorrelationCluster[]
  total_clusters: number
  total_entries_correlated: number
  groups_applied: string[]
  files_searched: number
  entries_loaded: number
  error?: string
}

// Event Correlation API (M3.5)
export interface EventCorrelateRequest {
  paths: string[]
  anchor_timestamp?: string
  anchor_file?: string
  anchor_line?: number
  trigger_level?: string
  trigger_pattern?: string
  window?: string
  limit?: number
}

export interface EventCorrelationCluster {
  virtual_trace_id: string
  rule_type: 'event_window' | 'event_trigger'
  anchor_timestamp?: string
  anchor_message?: string
  anchor_file?: string
  anchor_line?: number
  window: string
  entry_count: number
  entries: CorrelationEntryRef[]
  trigger?: Record<string, string>
}

export interface EventCorrelateResponse {
  clusters: EventCorrelationCluster[]
  total_clusters: number
  total_entries_correlated: number
  files_searched: number
  window: string
  error?: string
}

// Union type for any cluster shown in the panel
export type AnyCorrelationCluster = CorrelationCluster | EventCorrelationCluster

// Metrics API (M5.4)
export interface MetricsExtractRequest {
  paths: string[]
  fields?: string[]
  bucket_size?: string
  anomaly_threshold?: number
}

export interface MetricsAnomaly {
  timestamp: string | null
  value: number
  z_score: number
  file: string
  line_number: number
}

export interface MetricsBucket {
  start: string
  end: string
  min: number
  max: number
  avg: number
  count: number
}

export interface MetricsFieldStats {
  min: number
  max: number
  mean: number
  median: number
  stddev: number
  p95: number
  p99: number
}

export interface MetricsFieldData {
  count: number
  stats: MetricsFieldStats
  first_timestamp: string | null
  last_timestamp: string | null
  anomalies: MetricsAnomaly[]
  buckets?: MetricsBucket[]
  unit?: string
}

export interface MetricsExtractResponse {
  fields: Record<string, MetricsFieldData>
  entries_scanned: number
  files_searched: number
}

// Format Detection API (M6.5)
export interface FormatDetectRequest {
  paths: string[]
  sample_size?: number
}

export interface FormatDetectionResult {
  format: string
  confidence: number
  sample_size: number
  match_rate: number
  alternatives: Array<{ format: string; confidence: number; match_rate: number }>
  detected_fields: string[]
  sample_lines: string[]
  mixed: boolean
}

export interface FormatDetectResponse {
  files: Record<string, FormatDetectionResult>
}
