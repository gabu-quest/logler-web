import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/api/client'
import type {
  CorrelationConfigResponse,
  CorrelationRunResponse,
  CorrelationCluster,
  EventCorrelateResponse,
  EventCorrelationCluster,
  EventCorrelateRequest,
  AnyCorrelationCluster,
  LogEntry,
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
  const selectedCluster = ref<AnyCorrelationCluster | null>(null)

  // Event correlation state (M3.5)
  const eventLoading = ref(false)
  const eventError = ref<string | null>(null)
  const eventResult = ref<EventCorrelateResponse | null>(null)
  const eventWindow = ref('5s')

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

  const hasEventResults = computed(() => {
    return eventResult.value !== null && eventResult.value.total_clusters > 0
  })

  // Map: "filepath:line_number" -> virtual_trace_id[]
  const entryCorrelationMap = computed(() => {
    const map = new Map<string, string[]>()
    // Rule-based correlation results
    if (runResult.value) {
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
    }
    // Event correlation results (M3.5)
    if (eventResult.value) {
      for (const cluster of eventResult.value.clusters) {
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
    }
    return map
  })

  // Map: virtual_trace_id -> cluster (both rule-based and event-based)
  const clusterMap = computed(() => {
    const map = new Map<string, CorrelationCluster | EventCorrelationCluster>()
    if (runResult.value) {
      for (const cluster of runResult.value.clusters) {
        map.set(cluster.virtual_trace_id, cluster)
      }
    }
    if (eventResult.value) {
      for (const cluster of eventResult.value.clusters) {
        map.set(cluster.virtual_trace_id, cluster)
      }
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

  // Event correlation actions (M3.5)
  async function correlateAroundEntry(paths: string[], entry: LogEntry, window?: string) {
    eventLoading.value = true
    eventError.value = null
    const w = window || eventWindow.value
    try {
      const request: EventCorrelateRequest = { paths, window: w }
      if (entry.file && entry.line_number) {
        request.anchor_file = entry.file
        request.anchor_line = entry.line_number
      } else if (entry.timestamp) {
        request.anchor_timestamp = entry.timestamp
      }
      const result = await api.correlateEvents(request)
      if (result.error) {
        eventError.value = result.error
        eventResult.value = null
      } else {
        eventResult.value = result
        // Auto-select the first cluster
        if (result.clusters.length > 0) {
          selectedCluster.value = result.clusters[0]
          showPanel.value = true
        }
      }
    } catch (err) {
      eventError.value = err instanceof Error ? err.message : 'Event correlation failed'
      eventResult.value = null
    } finally {
      eventLoading.value = false
    }
  }

  function selectCluster(cluster: AnyCorrelationCluster) {
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

  function clearEventResults() {
    eventResult.value = null
    eventError.value = null
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
    // Event correlation (M3.5)
    eventLoading,
    eventError,
    eventResult,
    eventWindow,
    hasEventResults,
    correlateAroundEntry,
    clearEventResults,
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
