import { watch, onMounted } from 'vue'
import { useLogsStore } from '@/stores/logs'
import { useUiStore, type ViewMode } from '@/stores/ui'
import { useNavigationStore } from '@/stores/navigation'
import { useFilesStore } from '@/stores/files'

export interface UrlState {
  file?: string
  line?: number
  view?: ViewMode
}

export function parseUrl(): UrlState {
  const params = new URLSearchParams(window.location.search)
  const state: UrlState = {}

  const file = params.get('file')
  if (file) state.file = file

  const line = params.get('line')
  if (line) {
    const lineNum = parseInt(line, 10)
    if (!isNaN(lineNum)) state.line = lineNum
  }

  const view = params.get('view') as ViewMode | null
  if (view && ['logs', 'hierarchy', 'waterfall', 'sql'].includes(view)) {
    state.view = view
  }

  return state
}

export function updateUrl(state: UrlState): void {
  const params = new URLSearchParams()

  if (state.file) params.set('file', state.file)
  if (state.line !== undefined && state.line > 0) params.set('line', String(state.line))
  if (state.view && state.view !== 'logs') params.set('view', state.view)

  const queryString = params.toString()
  const url = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname

  window.history.replaceState({}, '', url)
}

export function useUrlState() {
  const logsStore = useLogsStore()
  const uiStore = useUiStore()
  const navigationStore = useNavigationStore()
  const filesStore = useFilesStore()

  async function restoreFromUrl() {
    const state = parseUrl()

    if (state.view) {
      uiStore.setViewMode(state.view)
    }

    if (state.file) {
      await logsStore.openFile(state.file)

      if (state.line) {
        // Find the entry with this line number and focus it
        const index = logsStore.filteredEntries.findIndex(
          (e) => e.line_number === state.line
        )
        if (index >= 0) {
          navigationStore.setFocus(index)
        }
      }
    }
  }

  // Watch for state changes and update URL
  watch(
    () => ({
      file: filesStore.activeFiles[0],
      line: navigationStore.focusedEntry?.line_number,
      view: uiStore.viewMode,
    }),
    (state) => {
      updateUrl({
        file: state.file,
        line: state.line,
        view: state.view,
      })
    },
    { deep: true }
  )

  onMounted(() => {
    restoreFromUrl()
  })

  return {
    parseUrl,
    updateUrl,
    restoreFromUrl,
  }
}
