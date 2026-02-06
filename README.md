# Logler Web

**Debug distributed systems like a pro.** A beautiful log viewer with AI-powered investigation tools.

![Log Viewer](https://via.placeholder.com/800x400?text=Add+Screenshot+Here)

## What Logler Does Best

Logler is built for **structured JSON logs with distributed tracing fields** - the kind produced by OpenTelemetry, Jaeger, Zipkin, or custom instrumentation:

```json
{
  "timestamp": "2024-01-15T10:00:00.100Z",
  "level": "INFO",
  "service": "api-gateway",
  "trace_id": "trace-001",
  "span_id": "span-gw-1",
  "parent_span_id": null,
  "correlation_id": "req-abc123",
  "message": "Incoming request: GET /api/v1/user/12345/orders"
}
```

With these fields, logler can:
- **Build trace hierarchies** - See the full call tree across services
- **Find bottlenecks** - Identify which span took the longest
- **Follow correlations** - Track a request through 10+ services

### Honest Assessment

| Log Type | Logler Value |
|----------|--------------|
| OpenTelemetry/Jaeger traces | Excellent - hierarchy, bottleneck, correlation features shine |
| Structured JSON (no trace IDs) | Good - SQL queries, filtering, smart sampling |
| Plain text logs | Marginal - not much better than grep + jq |

If your logs don't have `trace_id`/`span_id`/`parent_span_id`, you'll get a nice viewer but miss the killer features.

## Quick Start

```bash
pip install logler-web
logler-web --demo  # Opens browser with sample logs
```

The demo includes:
- **Real logs**: Hadoop, OpenStack, Linux syslog, Zookeeper (from [Loghub](https://github.com/logpai/loghub))
- **Trace demo**: Microservices trace with full hierarchy (shows logler's strengths)
- **Incident demo**: Production outage scenario

## Key Features

### For Humans
- **Smart Filtering** - Search, filter by level, thread, correlation ID
- **Hierarchy View** - See parent-child relationships across services
- **Waterfall Timeline** - Visualize request flow and bottlenecks
- **SQL Queries** - Query your logs with DuckDB SQL
- **Virtual Scrolling** - Handle millions of entries without lag
- **Metrics & Charting** - Extract numeric values, plot time-series with anomaly detection (M5)
- **Format Auto-Detection** - Confidence scoring and Drain template mining (M6)
- **Virtual Trace IDs** - Correlate entries by shared fields or temporal proximity (M2)
- **Cross-File Event Correlation** - Find related events across log files (M3)
- **File Color Coding** - Visual differentiation for multi-file views (M4)
- **Custom Log Formats** - Define and manage parsing formats via `.logler.toml` (M1)

### For AI Agents (LLM-First Design)

All CLI commands output **structured JSON** - perfect for Claude, GPT, or your own scripts:

```bash
# Quick triage - is this bad?
logler llm triage app.log
# {"severity": "high", "error_rate": 0.20, "suggested_actions": [...]}

# Build trace hierarchy (REQUIRES trace_id/span_id fields)
logler llm hierarchy trace-xyz --files "*.log"
# Returns full call tree with durations, error counts, bottleneck

# Find the slow span
logler llm bottleneck trace-xyz --files "*.log"
# {"bottleneck": {"node_name": "db-query", "duration_ms": 850}}

# SQL on logs
logler llm sql "SELECT service, COUNT(*) FROM logs WHERE level='ERROR' GROUP BY service" -f "*.log"
```

## CLI Commands

| Command | Best For | Needs Trace Fields? |
|---------|----------|---------------------|
| `logler llm triage` | Quick severity check | No |
| `logler llm search` | Find specific logs | No |
| `logler llm hierarchy` | Build trace tree | **Yes** |
| `logler llm bottleneck` | Find slow spans | **Yes** |
| `logler llm sql` | Ad-hoc queries | No |
| `logler llm sample` | Smart log sampling | No |
| `logler llm metrics` | Numeric extraction & stats | No |
| `logler llm detect` | Auto-detect log format | No |
| `logler llm templates` | Drain template mining | No |
| `logler llm format list\|test\|save` | Manage custom formats | No |
| `logler llm correlation list\|run` | Virtual trace correlation | Needs `.logler.toml` |
| `logler llm correlate-events` | Cross-file event correlation | No |

## Installation

```bash
pip install logler-web
```

Or with uv:
```bash
uv pip install logler-web
```

## Usage

```bash
# View logs in current directory
logler-web

# Specify a log directory
logler-web --root /var/log

# Start with demo data
logler-web --demo
```

## Web UI Features

- **Virtual scrolling** - Handle millions of entries
- **Keyboard shortcuts** - `j/k` navigate, `1-4` switch tabs, `?` help
- **Deep linking** - Share URLs to specific lines
- **Smart sampling** - Auto-suggest sampling for large files
- **Live following** - Real-time log updates via WebSocket
- **Hierarchy tab** - Interactive tree view of trace hierarchies with error analysis
- **Waterfall tab** - Timeline visualization of span durations and overlaps
- **Metrics tab** - ECharts time-series charts with anomaly scatter points, statistical summaries (min/max/mean/p95/p99)
- **Format detection banner** - Shows detected format with confidence percentage, Drain template clusters
- **Correlation sidebar** - Run virtual trace rules from `.logler.toml`, view correlated clusters in a detail drawer
- **Event correlation view** - Cross-file temporal event correlation with window controls
- **File color coding** - Color-coded file indicators with visibility toggles and legend

## Testing

```bash
# Unit tests (Vitest)
pnpm test:run

# E2E tests (Playwright)
pnpm test:e2e

# Type check
pnpm type-check

# Build
pnpm build
```

## Tech Stack

- **Frontend**: Vue 3, Naive UI, Pinia
- **Backend**: FastAPI, Uvicorn
- **Log Processing**: [logler](https://github.com/anthropics/logler) (Rust-powered)
- **SQL Engine**: DuckDB

## Why Logler?

| Feature | grep | lnav | Datadog | Logler |
|---------|------|------|---------|--------|
| Local logs | OK | OK | No | OK |
| Web UI | No | No | Yes | Yes |
| Trace hierarchy | No | No | Yes | Yes |
| SQL queries | No | Yes | Yes | Yes |
| AI/LLM-ready JSON | No | No | No | Yes |
| Free | Yes | Yes | No | Yes |
| Works offline | Yes | Yes | No | Yes |

## License

MIT

## Acknowledgments

Demo logs from [Loghub](https://github.com/logpai/loghub) (Apache License 2.0).
