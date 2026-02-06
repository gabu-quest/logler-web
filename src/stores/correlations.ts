import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/api/client'
import type {
  CorrelationConfigResponse,
  CorrelationRunResponse,
  CorrelationCluster,
} from '@/api/types'

export const useCorrelationsStore = defineStore('correlations', () => {
  // Config state
  const configLoading = ref(false)
  const configData = ref<CorrelationConfigResponse | null>(null)

  // Run state
  const runLoading = ref(false)
  const runError = ref<string | null>(null)
  const runResult = ref<CorrelationRunResponse | null>(null)

  // Panel state
  const showPanel = ref(false)
  const selectedCluster = ref<CorrelationCluster | null>(null)

  // Computed: has correlation config with at least one group
  const hasConfig = computed(() => {
    if (!configData.value) return false
    return Object.keys(configData.value.groups).length > 0
  })

  const groupNames = computed(() => {
    if (!configData.value) return []
    return Object.keys(configData.value.groups)
  })

  const hasResults = computed(() => {
    return runResult.value !== null && runResult.value.total_clusters > 0
  })

  // Map: "filepath:line_number" -> virtual_trace_id[]
  const entryCorrelationMap = computed(() => {
    const map = new Map<string, string[]>()
    if (!runResult.value) return map
    for (const cluster of runResult.value.clusters) {
      for (const entry of cluster.entries) {
        if (entry.line_number == null) continue
        const key = `${entry.file}:${entry.line_number}`
        const existing = map.get(key) || []
        if (!existing.includes(cluster.virtual_trace_id)) {
          existing.push(cluster.virtual_trace_id)
        }
        map.set(key, existing)
      }
    }
    return map
  })

  // Map: virtual_trace_id -> cluster
  const clusterMap = computed(() => {
    const map = new Map<string, CorrelationCluster>()
    if (!runResult.value) return map
    for (const cluster of runResult.value.clusters) {
      map.set(cluster.virtual_trace_id, cluster)
    }
    return map
  })

  // Actions
  async function loadConfig(directory?: string) {
    configLoading.value = true
    try {
      configData.value = await api.getCorrelationsConfig(directory)
    } catch (err) {
      configData.value = null
    } finally {
      configLoading.value = false
    }
  }

  async function runCorrelations(paths: string[], rule?: string) {
    runLoading.value = true
    runError.value = null
    try {
      const result = await api.runCorrelations({ paths, rule })
      if (result.error) {
        runError.value = result.error
        runResult.value = null
      } else {
        runResult.value = result
      }
    } catch (err) {
      runError.value = err instanceof Error ? err.message : 'Failed to run correlations'
      runResult.value = null
    } finally {
      runLoading.value = false
    }
  }

  function getEntryTraceIds(filePath: string, lineNumber: number): string[] {
    // Match by filename (not full path) since cluster entries use filename only
    const filename = filePath.replace(/\\/g, '/').split('/').pop() || filePath
    return entryCorrelationMap.value.get(`${filename}:${lineNumber}`) || []
  }

  function selectCluster(cluster: CorrelationCluster) {
    selectedCluster.value = cluster
    showPanel.value = true
  }

  function selectClusterByTraceId(traceId: string) {
    const cluster = clusterMap.value.get(traceId)
    if (cluster) {
      selectedCluster.value = cluster
      showPanel.value = true
    }
  }

  function closePanel() {
    showPanel.value = false
  }

  function clearResults() {
    runResult.value = null
    runError.value = null
    selectedCluster.value = null
    showPanel.value = false
  }

  return {
    // Config
    configLoading,
    configData,
    hasConfig,
    groupNames,
    loadConfig,
    // Run
    runLoading,
    runError,
    runResult,
    hasResults,
    runCorrelations,
    clearResults,
    // Entry mapping
    entryCorrelationMap,
    getEntryTraceIds,
    // Panel
    showPanel,
    selectedCluster,
    clusterMap,
    selectCluster,
    selectClusterByTraceId,
    closePanel,
  }
})
