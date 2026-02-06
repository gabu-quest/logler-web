# Claude Instructions for logler-web

## Project Type
Vue 3 + TypeScript frontend with FastAPI Python backend.

## Tech Stack
- **Frontend**: Vue 3.5, Naive UI 2.41, Phosphor Icons, Pinia, Vite 6, ECharts
- **Backend**: FastAPI, Uvicorn, logler package
- **Design**: the-style Cyberpunk design system

## Code Style

### Vue Components
- Use `<script setup lang="ts">` syntax
- Import Naive UI components individually (tree-shaking)
- Use Phosphor icons with explicit weight: `<PhIcon weight="regular" />`
- Store state in Pinia stores, not component state for shared data

### TypeScript
- Strict mode enabled
- Define interfaces in `src/api/types.ts`
- Use `@/` alias for src imports

### Design System
- Import tokens from `@/design/tokens.ts`
- Use `createDsNaiveThemeOverrides()` for Naive UI theming
- Call `providePhosphorDefaults()` in App.vue setup (not onMounted)
- Follow Cyberpunk color palette for log levels

## File Organization
```
src/
├── api/          # API client and types
├── components/   # Vue components by feature
├── composables/  # Vue composables (useXxx)
├── design/       # Design system files
├── stores/       # Pinia stores (9 stores)
└── views/        # Page-level components
```

## Pinia Stores

| Store | Purpose |
|-------|---------|
| `logs` | Log entries, filtering, search, pagination |
| `files` | File browser, active files, interleaved mode |
| `threads` | Thread list and selection |
| `navigation` | Router-like tab state |
| `ui` | View mode, panel toggles, sampling banner |
| `investigation` | Context drawer, hierarchy loading |
| `correlations` | Virtual trace correlation, event clusters |
| `metrics` | Numeric extraction, field selection, chart data |
| `fileColors` | File color assignment, visibility toggles |

## API Endpoints

All endpoints are in `backend/app.py`:

### File Operations
- `GET /api/files/browse` — Directory listing
- `GET /api/files/glob` — Glob search
- `POST /api/files/open` — Open single file
- `POST /api/files/open_many` — Open multiple files
- `POST /api/files/filter` — Filter entries

### Analysis
- `GET /api/threads` — Thread list
- `GET /api/traces` — Trace list
- `POST /api/search` — Rust-powered log search
- `POST /api/patterns` — Detect repeated log patterns
- `POST /api/metadata` — File metadata and stats
- `POST /api/hierarchy` — Build thread hierarchy
- `POST /api/sql` — Execute SQL query
- `POST /api/context` — Entry context (before/after)
- `POST /api/thread/follow` — Follow a thread
- `POST /api/ids/extract` — Extract thread/correlation/trace IDs
- `POST /api/threads/compare` — Compare two threads
- `POST /api/timeline/cross-service` — Cross-service timeline
- `POST /api/sample` — Smart sampling

### Custom Formats (M1)
- `GET /api/formats/config` — Get format configuration
- `GET /api/formats/builtin` — List built-in formats
- `POST /api/formats/test` — Test a format against a file
- `POST /api/formats/save` — Save format to config

### Correlations (M2/M3)
- `GET /api/correlations/config` — Get correlation configuration
- `POST /api/correlations/run` — Run virtual trace correlation
- `POST /api/events/correlate` — Cross-file event correlation

### Metrics & Detection (M5/M6)
- `POST /api/metrics/extract` — Extract numeric values with stats
- `POST /api/formats/detect` — Auto-detect log format

### WebSocket
- `WS /ws` — WebSocket for live following

## Features

### Views (tab bar)
1. **Log Viewer** — Entry list with filtering, search, level toggles
2. **Hierarchy** — Thread hierarchy tree with bottleneck detection
3. **Waterfall** — Timeline bars showing operation duration and overlap
4. **SQL** — DuckDB query editor with presets and results table
5. **Metrics** — Numeric extraction with ECharts charting, stats panel
6. **Event Correlation** — Cross-file event clusters

### Sidebar Panels
- Statistics (total/error/warning counts)
- Log level toggles
- Thread list
- Format settings (M1)
- Correlation controls (M2)
- File color legend (M4)

### Format Detection Banner (M6)
- Shows detected format with confidence percentage
- Appears above log entries when file is opened

## Testing

```bash
# Unit tests (Vitest)
pnpm test:run

# E2E tests (Playwright)
pnpm test:e2e

# E2E with UI
pnpm test:e2e:ui

# Type check
pnpm type-check

# Build
pnpm build
```

### Playwright E2E Notes
- Port 5178 dedicated for E2E (both `--port` and `baseURL`)
- `page.waitForResponse()` MUST be registered BEFORE the click
- Naive UI `NLayoutSider` -> `.sidebar-container` CSS class (more reliable than role)
- Naive UI drawer -> `role=dialog` for scoped assertions
- Use `.first()` when multiple elements match (strict mode)

## ECharts
- Tree-shake with explicit `use()` imports from echarts subpackages
- Large chunk warning (~1.6MB) is expected; acceptable for now

## Don't
- Don't add emojis unless asked
- Don't create new files unless necessary
- Don't use CSS-in-JS, use scoped `<style>` or design tokens
- Don't hardcode colors - use `ds.color.*` tokens
