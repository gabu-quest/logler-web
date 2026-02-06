import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMetricsStore } from '../metrics'
import { createMetricsResponse } from '@/test/factories'

// Mock the API client
vi.mock('@/api/client', () => ({
  api: {
    extractMetrics: vi.fn(),
  },
}))

import { api } from '@/api/client'

describe('metrics store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('starts with no metrics data', () => {
      const store = useMetricsStore()
      expect(store.metricsData).toBeNull()
      expect(store.metricsLoading).toBe(false)
      expect(store.metricsError).toBeNull()
      expect(store.selectedFields).toEqual([])
      expect(store.bucketSize).toBe('5s')
      expect(store.hasMetrics).toBe(false)
      expect(store.availableFields).toEqual([])
    })
  })

  describe('extractMetrics', () => {
    it('loads metrics and auto-selects first 3 fields', async () => {
      const mockResponse = createMetricsResponse()
      vi.mocked(api.extractMetrics).mockResolvedValue(mockResponse)

      const store = useMetricsStore()
      await store.extractMetrics(['/logs/app.log'])

      expect(store.metricsData).toEqual(mockResponse)
      expect(store.hasMetrics).toBe(true)
      expect(store.metricsLoading).toBe(false)

      // Auto-selects first 3 fields
      expect(store.selectedFields).toHaveLength(3)
      expect(store.selectedFields).toEqual(['duration_ms', 'memory_mb', 'queue_depth'])

      // availableFields computed
      expect(store.availableFields).toEqual(['duration_ms', 'memory_mb', 'queue_depth'])
    })

    it('does not override existing field selection', async () => {
      const mockResponse = createMetricsResponse()
      vi.mocked(api.extractMetrics).mockResolvedValue(mockResponse)

      const store = useMetricsStore()
      store.setSelectedFields(['duration_ms'])

      await store.extractMetrics(['/logs/app.log'])

      // Should keep existing selection
      expect(store.selectedFields).toEqual(['duration_ms'])
    })

    it('sets error on API failure', async () => {
      vi.mocked(api.extractMetrics).mockRejectedValue(new Error('Network error'))

      const store = useMetricsStore()
      await store.extractMetrics(['/logs/app.log'])

      expect(store.metricsData).toBeNull()
      expect(store.metricsError).toBe('Network error')
      expect(store.metricsLoading).toBe(false)
    })
  })

  describe('actions', () => {
    it('clearMetrics resets all metrics state', async () => {
      const mockResponse = createMetricsResponse()
      vi.mocked(api.extractMetrics).mockResolvedValue(mockResponse)

      const store = useMetricsStore()
      await store.extractMetrics(['/logs/app.log'])

      store.clearMetrics()

      expect(store.metricsData).toBeNull()
      expect(store.metricsError).toBeNull()
      expect(store.selectedFields).toEqual([])
      expect(store.hasMetrics).toBe(false)
    })

    it('setBucketSize updates bucket size', () => {
      const store = useMetricsStore()
      store.setBucketSize('30s')
      expect(store.bucketSize).toBe('30s')
    })

    it('setSelectedFields updates field selection', () => {
      const store = useMetricsStore()
      store.setSelectedFields(['duration_ms', 'memory_mb'])
      expect(store.selectedFields).toEqual(['duration_ms', 'memory_mb'])
    })
  })
})
