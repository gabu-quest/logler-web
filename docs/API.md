# Logler Web API Reference

Base URL: `http://localhost:8000`

All endpoints return JSON. Paths must be within `LOG_ROOT` (set via `LOGLER_ROOT` env var, defaults to `.`). Paths outside `LOG_ROOT` return `403`.

---

## File Operations

### GET /api/files/browse

Browse a directory for log files and subdirectories.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `directory` | string | No | `LOG_ROOT` | Directory path to browse |

**Response:**

```json
{
  "current_dir": "/path/to/logs",
  "parent_dir": "/path/to" | null,
  "files": [
    {
      "name": "app.log",
      "path": "/path/to/logs/app.log",
      "size": 102400,
      "modified": "2024-01-15T10:30:00",
      "is_log": true
    }
  ],
  "directories": [
    {
      "name": "archive",
      "path": "/path/to/logs/archive"
    }
  ],
  "log_root": "/path/to/logs"
}
```

`is_log` is `true` for `.log`, `.txt`, `.json` extensions. Hidden directories (starting with `.`) are excluded.

---

### GET /api/files/glob

Search for files matching a glob pattern within `LOG_ROOT`.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pattern` | string | Yes | — | Glob pattern (e.g., `**/*.log`) |
| `base_dir` | string | No | `LOG_ROOT` | Base directory for relative patterns |
| `limit` | int | No | `200` | Maximum files returned |

**Response:**

```json
{
  "pattern": "**/*.log",
  "count": 5,
  "files": [
    {
      "name": "app.log",
      "path": "/path/to/logs/app.log",
      "size": 102400,
      "modified": "2024-01-15T10:30:00",
      "is_log": true
    }
  ],
  "truncated": false
}
```

Path traversal sequences (`..`) are stripped from patterns.

---

### POST /api/files/open

Open a single log file, parse entries, and track threads/traces.

**Request Body:**

```json
{
  "path": "/path/to/logs/app.log",
  "filters": {
    "levels": ["ERROR", "WARN"],
    "search": "timeout",
    "thread_id": "worker-1",
    "correlation_id": "req-42"
  },
  "limit": 1000,
  "quick": true
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `path` | string | Yes | — | Absolute file path |
| `filters` | object | No | `null` | Filter criteria (see below) |
| `limit` | int | No | `1000` | Max lines to read (quick mode) |
| `quick` | bool | No | `true` | If true, reads only the last `limit` lines |

**Filter Object:**

| Field | Type | Description |
|-------|------|-------------|
| `levels` | string[] | Include only these log levels (case-insensitive) |
| `search` | string | Case-insensitive substring match on message or raw line |
| `thread_id` | string | Substring match on thread_id field |
| `correlation_id` | string | Substring match on correlation_id field |

**Response:**

```json
{
  "file_path": "/path/to/logs/app.log",
  "entries": [
    {
      "line_number": 1,
      "timestamp": "2024-01-15T10:00:00",
      "level": "INFO",
      "message": "Application started",
      "thread_id": "main",
      "correlation_id": null,
      "trace_id": null,
      "span_id": null,
      "service_name": null,
      "raw": "2024-01-15 10:00:00.000 [INFO] [main] Application started",
      "file": "/path/to/logs/app.log"
    }
  ],
  "total": 10,
  "partial": false
}
```

`total` is the actual line count in the file. `partial` is `true` when `quick=true` and the file has more lines than `limit`. Maximum `10000` entries returned.

---

### POST /api/files/open_many

Open multiple files, interleave entries by timestamp.

**Request Body:**

```json
{
  "paths": ["/path/to/api.log", "/path/to/worker.log"],
  "filters": { "levels": ["ERROR"] },
  "limit": 5000
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `paths` | string[] | Yes | — | List of file paths |
| `filters` | object | No | `null` | Same filter object as `/api/files/open` |
| `limit` | int | No | `10000` | Max entries returned |

**Response:**

```json
{
  "files": ["/path/to/api.log", "/path/to/worker.log"],
  "entries": [ ... ],
  "total": 250,
  "file_counts": {
    "/path/to/api.log": 150,
    "/path/to/worker.log": 100
  },
  "file_meta": [
    {
      "path": "/path/to/api.log",
      "count": 150,
      "first_ts": "2024-01-15T10:00:00",
      "last_ts": "2024-01-15T10:30:00"
    }
  ]
}
```

Entries are sorted by timestamp across all files. Each entry includes a `file` field indicating its source.

---

### POST /api/files/filter

Filter entries from previously specified files. Similar to `open_many` but focused on filtering.

**Request Body:**

```json
{
  "paths": ["/path/to/app.log"],
  "filters": { "levels": ["INFO"], "search": "startup" },
  "limit": 1000
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `paths` | string[] | Yes | — | List of file paths |
| `filters` | object | No | `null` | Filter criteria |
| `limit` | int | No | `10000` | Max entries returned |

**Response:**

```json
{
  "entries": [ ... ],
  "total": 42
}
```

---

## Thread & Trace Tracking

### GET /api/threads

List all tracked threads from opened files.

**Response:**

```json
[
  {
    "thread_id": "worker-1",
    "log_count": 50,
    "error_count": 3,
    "first_seen": "2024-01-15T10:00:00",
    "last_seen": "2024-01-15T10:30:00"
  }
]
```

Returns `[]` before any files are opened. Thread tracking accumulates across all opened files.

---

### GET /api/traces

List all OpenTelemetry traces from opened files.

**Response:**

```json
[
  {
    "trace_id": "abc123def456",
    "spans": ["span-1", "span-2"],
    "start_time": "2024-01-15T10:00:00",
    "end_time": "2024-01-15T10:00:05"
  }
]
```

Returns `[]` if no trace IDs are found in the parsed entries.

---

## Analysis

### POST /api/search

Search log entries using logler's Rust-powered search engine.

**Request Body:**

```json
{
  "paths": ["/path/to/app.log"],
  "query": "timeout",
  "level": "ERROR,WARN",
  "limit": 50,
  "output_format": "full"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `paths` | string[] | Yes | — | Files to search |
| `query` | string | No | `null` | Search query (text or regex) |
| `level` | string | No | `null` | Comma-separated log levels |
| `limit` | int | No | `null` | Max results |
| `output_format` | string | No | `null` | `"full"`, `"summary"`, `"compact"`, `"count"` |

**Response:** Proxied directly from `logler.investigate.search()`. Shape varies by `output_format`.

---

### POST /api/patterns

Detect repeated patterns in log files.

**Request Body:**

```json
{
  "paths": ["/path/to/app.log"],
  "min_occurrences": 3
}
```

**Response:** Proxied from `logler.investigate.find_patterns()`.

---

### POST /api/metadata

Get metadata and statistics about log files.

**Request Body:**

```json
{
  "paths": ["/path/to/app.log"]
}
```

**Response:** Proxied from `logler.investigate.get_metadata()`.

---

### POST /api/hierarchy

Build thread/span hierarchy tree.

**Request Body:**

```json
{
  "paths": ["/path/to/app.log"],
  "root_identifier": "worker-1",
  "max_depth": 5,
  "min_confidence": 0.0,
  "use_naming_patterns": true,
  "use_temporal_inference": true
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `paths` | string[] | Yes | — | Files to analyze |
| `root_identifier` | string | Yes | — | Root thread/span ID |
| `max_depth` | int | No | `null` | Max tree depth |
| `min_confidence` | float | No | `0.0` | Minimum confidence for inferred relationships |
| `use_naming_patterns` | bool | No | `true` | Infer parent-child from naming conventions |
| `use_temporal_inference` | bool | No | `true` | Infer parent-child from temporal overlap |

**Response:**

```json
{
  "hierarchy": { ... },
  "error_analysis": { ... }
}
```

`error_analysis` is `null` if hierarchy is empty. Both are proxied from `logler.investigate.follow_thread_hierarchy()` and `analyze_error_flow()`.

---

### POST /api/sql

Execute a SQL query against loaded log entries via DuckDB.

**Request Body:**

```json
{
  "query": "SELECT level, COUNT(*) as cnt FROM logs GROUP BY level ORDER BY cnt DESC"
}
```

**Response (success):**

```json
{
  "columns": ["level", "cnt"],
  "rows": [
    {"level": "INFO", "cnt": 150},
    {"level": "ERROR", "cnt": 25}
  ],
  "row_count": 4
}
```

**Response (error):**

```json
{
  "columns": [],
  "rows": [],
  "row_count": 0,
  "error": "No logs loaded. Open a file first."
}
```

Requires `logler.sql.SqlEngine`. Returns error if SQL engine is not available or no logs are loaded.

---

### POST /api/context

Get surrounding context (lines before and after) for a specific log entry.

**Request Body:**

```json
{
  "paths": ["/path/to/app.log"],
  "line_number": 42,
  "file_path": "/path/to/app.log",
  "before": 10,
  "after": 10
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `paths` | string[] | Yes | — | Files to search |
| `line_number` | int | Yes | — | Target line number |
| `file_path` | string | Yes | — | File containing the target line |
| `before` | int | No | `10` | Lines of context before |
| `after` | int | No | `10` | Lines of context after |

**Response:** Proxied from `logler.investigate.get_context()`.

---

### POST /api/thread/follow

Get all entries for a specific thread, correlation, or trace ID.

**Request Body:**

```json
{
  "paths": ["/path/to/app.log"],
  "identifier": "worker-1",
  "identifier_type": "thread_id"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `paths` | string[] | Yes | — | Files to search |
| `identifier` | string | Yes | — | ID value to follow |
| `identifier_type` | string | No | `null` | `"thread_id"`, `"correlation_id"`, or `"trace_id"` |

**Response:** Proxied from `logler.investigate.follow_thread()`.

---

### POST /api/ids/extract

Extract all unique thread IDs, correlation IDs, trace IDs, and services.

**Request Body:**

```json
{
  "paths": ["/path/to/app.log", "/path/to/worker.log"]
}
```

**Response:** Proxied from `logler.investigate.extract_ids()`.

---

### POST /api/threads/compare

Compare two thread/request flows side-by-side.

**Request Body:**

```json
{
  "paths": ["/path/to/app.log"],
  "id1": "req-42",
  "id2": "req-43"
}
```

**Response:** Proxied from `logler.investigate.compare_threads()`.

---

### POST /api/timeline/cross-service

Build a cross-service timeline view.

**Request Body:**

```json
{
  "paths": ["/path/to/api.log", "/path/to/worker.log"],
  "identifier": "req-42"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `paths` | string[] | Yes | — | Files to correlate |
| `identifier` | string | No | `null` | Filter by specific ID |

**Response:** Proxied from `logler.investigate.cross_service_timeline()`.

---

### POST /api/sample

Smart sampling of log entries using various strategies.

**Request Body:**

```json
{
  "paths": ["/path/to/app.log"],
  "strategy": "errors_focused",
  "sample_size": 50
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `paths` | string[] | Yes | — | Files to sample |
| `strategy` | string | No | `"diverse"` | `"errors_focused"`, `"diverse"`, `"representative"`, `"chronological"` |
| `sample_size` | int | No | `100` | Number of samples |

**Response:** Proxied from `logler.investigate.smart_sample()`.

---

## Custom Formats (M1)

Requires logler >= 1.2.1 (`HAS_FORMAT_CONFIG = True`).

### GET /api/formats/config

Get the active `.logler/formats.yaml` configuration.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `directory` | string | No | `LOG_ROOT` | Start directory for config search |

**Response (config found):**

```json
{
  "available": true,
  "config_path": "/path/to/logs/.logler/formats.yaml",
  "formats": {
    "custom-app": {
      "regex": "(?P<timestamp>\\d{4}-\\d{2}-\\d{2}) (?P<message>.*)",
      "timestamp_format": "%Y-%m-%d",
      "file_patterns": ["*.log"]
    }
  }
}
```

**Response (no config):**

```json
{
  "available": true,
  "config_path": null,
  "formats": {}
}
```

**Response (feature unavailable):**

```json
{
  "available": false,
  "error": "Format config not available. Upgrade logler."
}
```

---

### GET /api/formats/builtin

List all built-in format definitions.

**Response:**

```json
{
  "available": true,
  "formats": {
    "syslog-rfc3164": {
      "regex": "...",
      "timestamp_format": "...",
      "file_patterns": ["/var/log/*.log"]
    }
  }
}
```

---

### POST /api/formats/test

Test a regex pattern against sample log lines.

**Request Body:**

```json
{
  "regex": "(?P<level>\\w+): (?P<message>.*)",
  "sample_lines": [
    "INFO: hello world",
    "ERROR: something broke",
    "plain text no match"
  ]
}
```

**Response:**

```json
{
  "results": [
    {
      "line": "INFO: hello world",
      "matched": true,
      "groups": { "level": "INFO", "message": "hello world" }
    },
    {
      "line": "plain text no match",
      "matched": false,
      "groups": {}
    }
  ],
  "named_groups": ["level", "message"],
  "match_count": 2,
  "total_lines": 3
}
```

Sample lines are capped at 50. Returns an error if the regex is invalid or has no named groups.

---

### POST /api/formats/save

Save format definitions to `.logler/formats.yaml`.

**Request Body:**

```json
{
  "formats": {
    "my-app": {
      "regex": "(?P<timestamp>\\d{4}-\\d{2}-\\d{2}) (?P<message>.*)",
      "timestamp_format": "%Y-%m-%d",
      "file_patterns": ["*.log"]
    }
  },
  "directory": "/path/to/logs"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `formats` | object | Yes | — | Format definitions (validated via LoglerConfig) |
| `directory` | string | No | `LOG_ROOT` | Target directory (must be within LOG_ROOT) |

**Response:**

```json
{
  "saved": true,
  "config_path": "/path/to/logs/.logler/formats.yaml",
  "format_count": 1
}
```

Returns `422` if format validation fails. Returns `501` if feature is unavailable.

---

## Correlations (M2/M3)

### GET /api/correlations/config

Get the active `.logler/correlations.yaml` configuration.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `directory` | string | No | `LOG_ROOT` | Start directory for config search |

**Response:**

```json
{
  "available": true,
  "config_path": "/path/to/logs/.logler/correlations.yaml",
  "groups": {
    "req_id_match": {
      "description": "Match by request ID",
      "rule_count": 1,
      "rules": [
        {
          "type": "field_match",
          "source_field": "request_id",
          "target_field": "req_id",
          "source_pattern": "*.log",
          "target_pattern": "*.log"
        }
      ]
    }
  }
}
```

Rule types: `field_match` (matches field values across files) and `temporal` (time-window based).

---

### POST /api/correlations/run

Execute correlation rules against log files.

**Request Body:**

```json
{
  "paths": ["/path/to/api.log", "/path/to/worker.log"],
  "rule": "req_id_match"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `paths` | string[] | Yes | — | Files to correlate |
| `rule` | string | No | `null` | Specific rule group name (runs all if null) |

**Response:**

```json
{
  "clusters": [
    {
      "virtual_trace_id": "vtrace-001",
      "group": "req_id_match",
      "entries": [
        {
          "file": "api.log",
          "line_number": 42,
          "level": "INFO",
          "timestamp": "2024-01-15T10:00:00",
          "message": "Request received..."
        }
      ]
    }
  ],
  "total_clusters": 1,
  "total_entries_correlated": 5,
  "groups_applied": ["req_id_match"],
  "files_searched": 2,
  "entries_loaded": 500
}
```

Requires `.logler/correlations.yaml` to exist. Entry messages are truncated to 200 characters.

---

### POST /api/events/correlate

Ad-hoc cross-file event correlation around a timestamp, anchor entry, or trigger condition.

**Request Body:**

```json
{
  "paths": ["/path/to/api.log", "/path/to/worker.log"],
  "anchor_timestamp": "2024-01-15T10:00:03",
  "window": "5s",
  "limit": 100
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `paths` | string[] | Yes | — | Files to correlate |
| `anchor_timestamp` | string | No | `null` | ISO timestamp to center the window on |
| `anchor_file` | string | No | `null` | File containing anchor entry |
| `anchor_line` | int | No | `null` | Line number of anchor entry |
| `trigger_level` | string | No | `null` | Trigger on entries at this level |
| `trigger_pattern` | string | No | `null` | Trigger on entries matching this pattern |
| `window` | string | No | `"5s"` | Time window (e.g., `"5s"`, `"30s"`, `"1m"`) |
| `limit` | int | No | `null` | Max clusters returned |

Three modes (priority order):
1. **Anchor entry**: `anchor_file` + `anchor_line` — correlate around a specific log line
2. **Anchor timestamp**: `anchor_timestamp` — correlate around a specific time
3. **Trigger**: `trigger_level` and/or `trigger_pattern` — find matching events and correlate around each

**Response:**

```json
{
  "clusters": [
    {
      "virtual_trace_id": "evt-001",
      "rule_type": "event_window",
      "anchor_timestamp": "2024-01-15T10:00:03",
      "window": "5s",
      "entry_count": 5,
      "entries": [
        {
          "file": "api.log",
          "line_number": 42,
          "level": "ERROR",
          "timestamp": "2024-01-15T10:00:03",
          "message": "Connection timeout..."
        }
      ]
    }
  ],
  "total_clusters": 1,
  "total_entries_correlated": 5
}
```

---

## Metrics & Detection (M5/M6)

### POST /api/metrics/extract

Extract numeric values from log entries and compute time-series statistics.

**Request Body:**

```json
{
  "paths": ["/path/to/app.log"],
  "fields": ["response_time_ms", "queue_depth"],
  "bucket_size": "10s",
  "anomaly_threshold": 3.0
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `paths` | string[] | Yes | — | Files to extract from |
| `fields` | string[] | No | `null` | Specific fields to extract (all if null) |
| `bucket_size` | string | No | `"5s"` | Time bucket for aggregation |
| `anomaly_threshold` | float | No | `2.0` | Z-score threshold for anomaly detection |

**Response:**

```json
{
  "fields": {
    "response_time_ms": {
      "count": 100,
      "stats": {
        "min": 5.0,
        "max": 500.0,
        "mean": 100.0,
        "median": 80.0,
        "stddev": 50.0,
        "p95": 400.0,
        "p99": 490.0
      },
      "anomalies": [
        { "timestamp": "...", "value": 2500.0, "z_score": 4.2 }
      ],
      "buckets": [
        { "start": "...", "end": "...", "mean": 95.0, "count": 10 }
      ]
    }
  },
  "entries_scanned": 1000,
  "files_searched": 1
}
```

---

### POST /api/formats/detect

Auto-detect log format for each file with confidence scoring.

**Request Body:**

```json
{
  "paths": ["/path/to/app.log"],
  "sample_size": 50
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `paths` | string[] | Yes | — | Files to analyze |
| `sample_size` | int | No | `50` | Lines to sample per file |

**Response:**

```json
{
  "files": {
    "app.log": {
      "format": "standard",
      "confidence": 0.95,
      "sample_size": 50,
      "match_rate": 1.0,
      "alternatives": [],
      "detected_fields": ["timestamp", "level", "message"],
      "sample_lines": [],
      "mixed": false
    }
  }
}
```

---

## WebSocket

### WS /ws

Real-time log following via WebSocket.

**Client sends:**

```json
{
  "action": "follow",
  "path": "/path/to/app.log"
}
```

**Server sends (per new entry):**

```json
{
  "type": "log_entry",
  "entry": {
    "line_number": 101,
    "timestamp": "2024-01-15T10:30:01",
    "level": "INFO",
    "message": "New entry...",
    "raw": "..."
  }
}
```

---

## Error Responses

### 403 Forbidden

Path is outside `LOG_ROOT`.

```json
{
  "detail": "Requested path is outside the configured log root"
}
```

### 422 Unprocessable Entity

Missing required fields or validation failure.

```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "path"],
      "msg": "Field required"
    }
  ]
}
```

### 501 Not Implemented

Feature requires a newer version of logler.

```json
{
  "detail": "Format config not available."
}
```

### Feature Unavailable (200 with error)

Some endpoints return 200 with an `error` field instead of HTTP error codes:

```json
{
  "error": "Metrics extraction not available. Upgrade logler.",
  "fields": {}
}
```

This applies to: `/api/formats/config`, `/api/formats/builtin`, `/api/formats/test`, `/api/formats/detect`, `/api/metrics/extract`, `/api/correlations/config`, `/api/correlations/run`, `/api/events/correlate`, `/api/sql`.
