import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCorrelationsStore } from '../correlations'
import {
  createCorrelationRunResponse,
  createCorrelationCluster,
  createEventCorrelateResponse,
  createEventCorrelationCluster,
  createCorrelationEntryRef,
} from '@/test/factories'

// Mock the API client
vi.mock('@/api/client', () => ({
  api: {
    getCorrelationsConfig: vi.fn(),
    runCorrelations: vi.fn(),
    correlateEvents: vi.fn(),
  },
}))

describe('correlations store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('starts with empty state', () => {
      const store = useCorrelationsStore()
      expect(store.runResult).toBeNull()
      expect(store.eventResult).toBeNull()
      expect(store.selectedCluster).toBeNull()
      expect(store.showPanel).toBe(false)
      expect(store.hasResults).toBe(false)
      expect(store.hasEventResults).toBe(false)
    })
  })

  describe('entryCorrelationMap', () => {
    it('builds map from rule-based results', () => {
      const store = useCorrelationsStore()
      const cluster = createCorrelationCluster({
        virtual_trace_id: 'vtrace-001',
        entries: [
          createCorrelationEntryRef({ file: 'app.log', line_number: 10 }),
          createCorrelationEntryRef({ file: 'app.log', line_number: 20 }),
        ],
      })
      store.runResult = createCorrelationRunResponse({ clusters: [cluster] })

      const map = store.entryCorrelationMap
      expect(map.size).toBe(2)
      expect(map.get('app.log:10')).toEqual(['vtrace-001'])
      expect(map.get('app.log:20')).toEqual(['vtrace-001'])
    })

    it('builds map from event correlation results', () => {
      const store = useCorrelationsStore()
      const cluster = createEventCorrelationCluster({
        virtual_trace_id: 'evtrace-001',
        entries: [
          createCorrelationEntryRef({ file: 'app.log', line_number: 5 }),
          createCorrelationEntryRef({ file: 'app.log', line_number: 8 }),
        ],
      })
      store.eventResult = createEventCorrelateResponse({ clusters: [cluster] })

      const map = store.entryCorrelationMap
      expect(map.size).toBe(2)
      expect(map.get('app.log:5')).toEqual(['evtrace-001'])
    })

    it('combines rule-based and event results', () => {
      const store = useCorrelationsStore()

      store.runResult = createCorrelationRunResponse({
        clusters: [
          createCorrelationCluster({
            virtual_trace_id: 'vtrace-001',
            entries: [createCorrelationEntryRef({ file: 'app.log', line_number: 10 })],
          }),
        ],
      })
      store.eventResult = createEventCorrelateResponse({
        clusters: [
          createEventCorrelationCluster({
            virtual_trace_id: 'evtrace-001',
            entries: [createCorrelationEntryRef({ file: 'app.log', line_number: 10 })],
          }),
        ],
      })

      const traceIds = store.entryCorrelationMap.get('app.log:10')
      expect(traceIds).toHaveLength(2)
      expect(traceIds).toContain('vtrace-001')
      expect(traceIds).toContain('evtrace-001')
    })
  })

  describe('selectClusterByTraceId', () => {
    it('selects cluster and opens panel', () => {
      const store = useCorrelationsStore()
      const cluster = createCorrelationCluster({ virtual_trace_id: 'vtrace-001' })
      store.runResult = createCorrelationRunResponse({ clusters: [cluster] })

      store.selectClusterByTraceId('vtrace-001')

      expect(store.selectedCluster).toEqual(cluster)
      expect(store.showPanel).toBe(true)
    })

    it('does nothing for unknown trace ID', () => {
      const store = useCorrelationsStore()
      store.runResult = createCorrelationRunResponse()

      store.selectClusterByTraceId('nonexistent')

      expect(store.selectedCluster).toBeNull()
      expect(store.showPanel).toBe(false)
    })
  })

  describe('clearResults', () => {
    it('resets run results and panel state', () => {
      const store = useCorrelationsStore()
      store.runResult = createCorrelationRunResponse()
      store.selectedCluster = createCorrelationCluster()
      store.showPanel = true
      store.runError = 'some error'

      store.clearResults()

      expect(store.runResult).toBeNull()
      expect(store.runError).toBeNull()
      expect(store.selectedCluster).toBeNull()
      expect(store.showPanel).toBe(false)
    })
  })

  describe('clearEventResults', () => {
    it('resets event results and panel state', () => {
      const store = useCorrelationsStore()
      store.eventResult = createEventCorrelateResponse()
      store.selectedCluster = createEventCorrelationCluster()
      store.showPanel = true
      store.eventError = 'some error'

      store.clearEventResults()

      expect(store.eventResult).toBeNull()
      expect(store.eventError).toBeNull()
      expect(store.selectedCluster).toBeNull()
      expect(store.showPanel).toBe(false)
    })
  })

  describe('closePanel', () => {
    it('hides panel without clearing data', () => {
      const store = useCorrelationsStore()
      store.showPanel = true
      store.runResult = createCorrelationRunResponse()

      store.closePanel()

      expect(store.showPanel).toBe(false)
      // Data is preserved
      expect(store.runResult).not.toBeNull()
    })
  })
})
