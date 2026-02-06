import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/api/client'
import type { MetricsExtractResponse } from '@/api/types'

export const useMetricsStore = defineStore('metrics', () => {
  const metricsData = ref<MetricsExtractResponse | null>(null)
  const metricsLoading = ref(false)
  const metricsError = ref<string | null>(null)

  // Selected fields for chart display
  const selectedFields = ref<string[]>([])

  // Bucket size for aggregation
  const bucketSize = ref<string>('5s')

  const hasMetrics = computed(() => metricsData.value !== null)

  const availableFields = computed(() => {
    if (!metricsData.value) return []
    return Object.keys(metricsData.value.fields)
  })

  async function extractMetrics(paths: string[], fields?: string[], bucket?: string) {
    metricsLoading.value = true
    metricsError.value = null
    try {
      metricsData.value = await api.extractMetrics({
        paths,
        fields,
        bucket_size: bucket || bucketSize.value,
      })
      // Auto-select first few fields if none selected
      if (selectedFields.value.length === 0 && metricsData.value) {
        const allFields = Object.keys(metricsData.value.fields)
        selectedFields.value = allFields.slice(0, 3)
      }
    } catch (err) {
      metricsError.value = err instanceof Error ? err.message : 'Failed to extract metrics'
    } finally {
      metricsLoading.value = false
    }
  }

  function setSelectedFields(fields: string[]) {
    selectedFields.value = fields
  }

  function setBucketSize(size: string) {
    bucketSize.value = size
  }

  function clearMetrics() {
    metricsData.value = null
    metricsError.value = null
    selectedFields.value = []
  }

  return {
    metricsData,
    metricsLoading,
    metricsError,
    selectedFields,
    bucketSize,
    hasMetrics,
    availableFields,
    extractMetrics,
    setSelectedFields,
    setBucketSize,
    clearMetrics,
  }
})
