import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useInvestigationStore } from '../investigation'
import { createLogEntry } from '@/test/factories'

// Mock the API client
vi.mock('@/api/client', () => ({
  api: {
    getContext: vi.fn(),
    followThread: vi.fn(),
    extractIds: vi.fn(),
    compareThreads: vi.fn(),
    crossServiceTimeline: vi.fn(),
    smartSample: vi.fn(),
  },
}))

import { api } from '@/api/client'

describe('investigation store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('starts with all panels closed', () => {
      const store = useInvestigationStore()
      expect(store.showContextDrawer).toBe(false)
      expect(store.showThreadPanel).toBe(false)
      expect(store.showIdExplorer).toBe(false)
      expect(store.showCompareView).toBe(false)
      expect(store.showCrossServiceView).toBe(false)
      expect(store.hasContext).toBe(false)
      expect(store.hasThreadTimeline).toBe(false)
      expect(store.hasExtractedIds).toBe(false)
      expect(store.hasComparison).toBe(false)
      expect(store.hasCrossServiceData).toBe(false)
    })

    it('starts with default sample settings', () => {
      const store = useInvestigationStore()
      expect(store.sampleStrategy).toBe('diverse')
      expect(store.sampleSize).toBe(100)
      expect(store.sampleActive).toBe(false)
    })
  })

  describe('loadContext', () => {
    it('loads context and opens drawer', async () => {
      const contextResponse = {
        before: [{ line_number: 5, message: 'Before line' }],
        target: { line_number: 10, message: 'Target line' },
        after: [{ line_number: 15, message: 'After line' }],
      }
      vi.mocked(api.getContext).mockResolvedValue(contextResponse)

      const store = useInvestigationStore()
      const entry = createLogEntry({ file: '/logs/app.log', line_number: 10 })
      await store.loadContext(['/logs/app.log'], entry)

      expect(store.showContextDrawer).toBe(true)
      expect(store.contextData).toEqual(contextResponse)
      expect(store.selectedEntry).toEqual(entry)
      expect(store.contextLoading).toBe(false)
      expect(store.contextError).toBeNull()
    })

    it('does nothing when entry has no file', async () => {
      const store = useInvestigationStore()
      const entry = createLogEntry({ file: undefined })
      await store.loadContext(['/logs/app.log'], entry)

      expect(store.showContextDrawer).toBe(false)
      expect(api.getContext).not.toHaveBeenCalled()
    })

    it('sets error on API failure', async () => {
      vi.mocked(api.getContext).mockRejectedValue(new Error('Connection refused'))

      const store = useInvestigationStore()
      const entry = createLogEntry({ file: '/logs/app.log', line_number: 10 })
      await store.loadContext(['/logs/app.log'], entry)

      expect(store.contextError).toBe('Connection refused')
      expect(store.contextData).toBeNull()
      expect(store.contextLoading).toBe(false)
    })
  })

  describe('closeContextDrawer', () => {
    it('hides drawer and clears selected entry', async () => {
      const store = useInvestigationStore()
      vi.mocked(api.getContext).mockResolvedValue({ before: [], target: {}, after: [] })
      const entry = createLogEntry({ file: '/logs/app.log', line_number: 10 })
      await store.loadContext(['/logs/app.log'], entry)

      store.closeContextDrawer()

      expect(store.showContextDrawer).toBe(false)
      expect(store.selectedEntry).toBeNull()
    })
  })

  describe('loadThreadTimeline', () => {
    it('loads timeline and opens panel', async () => {
      const timelineResponse = {
        identifier: 'worker-1',
        identifier_type: 'thread_id',
        total_entries: 5,
        entries: [],
      }
      vi.mocked(api.followThread).mockResolvedValue(timelineResponse)

      const store = useInvestigationStore()
      await store.loadThreadTimeline(['/logs/app.log'], 'worker-1', 'thread_id')

      expect(store.showThreadPanel).toBe(true)
      expect(store.threadTimeline).toEqual(timelineResponse)
      expect(store.threadLoading).toBe(false)
    })

    it('sets error on failure', async () => {
      vi.mocked(api.followThread).mockRejectedValue(new Error('Not found'))

      const store = useInvestigationStore()
      await store.loadThreadTimeline(['/logs/app.log'], 'worker-1')

      expect(store.threadError).toBe('Not found')
      expect(store.threadTimeline).toBeNull()
    })
  })

  describe('closeThreadPanel', () => {
    it('hides panel and clears timeline data', async () => {
      vi.mocked(api.followThread).mockResolvedValue({ entries: [] })
      const store = useInvestigationStore()
      await store.loadThreadTimeline(['/logs/app.log'], 'worker-1')

      store.closeThreadPanel()

      expect(store.showThreadPanel).toBe(false)
      expect(store.threadTimeline).toBeNull()
    })
  })

  describe('sample actions', () => {
    it('setSampleStrategy updates strategy', () => {
      const store = useInvestigationStore()
      store.setSampleStrategy('errors')
      expect(store.sampleStrategy).toBe('errors')
    })

    it('setSampleSize updates size', () => {
      const store = useInvestigationStore()
      store.setSampleSize(50)
      expect(store.sampleSize).toBe(50)
    })

    it('applySample activates when data exists', () => {
      const store = useInvestigationStore()
      store.sampleData = { entries: [], total: 0, strategy: 'diverse' } as any
      store.applySample()
      expect(store.sampleActive).toBe(true)
    })

    it('applySample does nothing without data', () => {
      const store = useInvestigationStore()
      store.applySample()
      expect(store.sampleActive).toBe(false)
    })

    it('clearSample deactivates and clears data', () => {
      const store = useInvestigationStore()
      store.sampleData = { entries: [] } as any
      store.sampleActive = true

      store.clearSample()

      expect(store.sampleActive).toBe(false)
      expect(store.sampleData).toBeNull()
    })
  })
})
