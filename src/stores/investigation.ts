import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/api/client'
import type {
  LogEntry,
  ContextResponse,
  ThreadTimeline,
  ExtractedIds,
  ThreadComparison,
  CrossServiceTimeline,
  SmartSampleResponse,
  SampleStrategy,
} from '@/api/types'

export const useInvestigationStore = defineStore('investigation', () => {
  // Context drawer state
  const showContextDrawer = ref(false)
  const contextLoading = ref(false)
  const contextError = ref<string | null>(null)
  const contextData = ref<ContextResponse | null>(null)
  const selectedEntry = ref<LogEntry | null>(null)

  // Thread timeline state
  const showThreadPanel = ref(false)
  const threadLoading = ref(false)
  const threadError = ref<string | null>(null)
  const threadTimeline = ref<ThreadTimeline | null>(null)

  // ID explorer state
  const showIdExplorer = ref(false)
  const idsLoading = ref(false)
  const idsError = ref<string | null>(null)
  const extractedIds = ref<ExtractedIds | null>(null)

  // Comparison state
  const showCompareView = ref(false)
  const compareLoading = ref(false)
  const compareError = ref<string | null>(null)
  const comparisonData = ref<ThreadComparison | null>(null)
  const compareId1 = ref('')
  const compareId2 = ref('')

  // Cross-service timeline state
  const showCrossServiceView = ref(false)
  const crossServiceLoading = ref(false)
  const crossServiceError = ref<string | null>(null)
  const crossServiceData = ref<CrossServiceTimeline | null>(null)

  // Smart sample state
  const sampleStrategy = ref<SampleStrategy>('diverse')
  const sampleSize = ref(100)
  const sampleLoading = ref(false)
  const sampleError = ref<string | null>(null)
  const sampleData = ref<SmartSampleResponse | null>(null)
  const sampleActive = ref(false)

  // Computed
  const hasContext = computed(() => contextData.value !== null)
  const hasThreadTimeline = computed(() => threadTimeline.value !== null)
  const hasExtractedIds = computed(() => extractedIds.value !== null)
  const hasComparison = computed(() => comparisonData.value !== null)
  const hasCrossServiceData = computed(() => crossServiceData.value !== null)

  // Actions
  async function loadContext(paths: string[], entry: LogEntry) {
    if (!entry.file) return

    selectedEntry.value = entry
    showContextDrawer.value = true
    contextLoading.value = true
    contextError.value = null

    try {
      contextData.value = await api.getContext({
        paths,
        line_number: entry.line_number,
        file_path: entry.file,
        before: 10,
        after: 10,
      })
    } catch (err) {
      contextError.value = err instanceof Error ? err.message : 'Failed to load context'
    } finally {
      contextLoading.value = false
    }
  }

  function closeContextDrawer() {
    showContextDrawer.value = false
    selectedEntry.value = null
  }

  async function loadThreadTimeline(paths: string[], identifier: string, identifierType?: string) {
    showThreadPanel.value = true
    threadLoading.value = true
    threadError.value = null

    try {
      threadTimeline.value = await api.followThread({
        paths,
        identifier,
        identifier_type: identifierType as 'thread_id' | 'correlation_id' | 'trace_id' | undefined,
      })
    } catch (err) {
      threadError.value = err instanceof Error ? err.message : 'Failed to load thread timeline'
    } finally {
      threadLoading.value = false
    }
  }

  function closeThreadPanel() {
    showThreadPanel.value = false
    threadTimeline.value = null
  }

  async function loadExtractedIds(paths: string[]) {
    showIdExplorer.value = true
    idsLoading.value = true
    idsError.value = null

    try {
      extractedIds.value = await api.extractIds({ paths })
    } catch (err) {
      idsError.value = err instanceof Error ? err.message : 'Failed to extract IDs'
    } finally {
      idsLoading.value = false
    }
  }

  function closeIdExplorer() {
    showIdExplorer.value = false
  }

  async function loadComparison(paths: string[], id1: string, id2: string) {
    compareId1.value = id1
    compareId2.value = id2
    showCompareView.value = true
    compareLoading.value = true
    compareError.value = null

    try {
      comparisonData.value = await api.compareThreads({ paths, id1, id2 })
    } catch (err) {
      compareError.value = err instanceof Error ? err.message : 'Failed to compare threads'
    } finally {
      compareLoading.value = false
    }
  }

  function closeCompareView() {
    showCompareView.value = false
    comparisonData.value = null
  }

  async function loadCrossServiceTimeline(paths: string[], identifier?: string) {
    showCrossServiceView.value = true
    crossServiceLoading.value = true
    crossServiceError.value = null

    try {
      crossServiceData.value = await api.crossServiceTimeline({ paths, identifier })
    } catch (err) {
      crossServiceError.value = err instanceof Error ? err.message : 'Failed to load cross-service timeline'
    } finally {
      crossServiceLoading.value = false
    }
  }

  function closeCrossServiceView() {
    showCrossServiceView.value = false
    crossServiceData.value = null
  }

  async function loadSmartSample(paths: string[]) {
    sampleLoading.value = true
    sampleError.value = null

    try {
      sampleData.value = await api.smartSample({
        paths,
        strategy: sampleStrategy.value,
        sample_size: sampleSize.value,
      })
    } catch (err) {
      sampleError.value = err instanceof Error ? err.message : 'Failed to load sample'
    } finally {
      sampleLoading.value = false
    }
  }

  function setSampleStrategy(strategy: SampleStrategy) {
    sampleStrategy.value = strategy
  }

  function setSampleSize(size: number) {
    sampleSize.value = size
  }

  function applySample() {
    if (sampleData.value) {
      sampleActive.value = true
    }
  }

  function clearSample() {
    sampleActive.value = false
    sampleData.value = null
  }

  return {
    // Context drawer
    showContextDrawer,
    contextLoading,
    contextError,
    contextData,
    selectedEntry,
    hasContext,
    loadContext,
    closeContextDrawer,

    // Thread timeline
    showThreadPanel,
    threadLoading,
    threadError,
    threadTimeline,
    hasThreadTimeline,
    loadThreadTimeline,
    closeThreadPanel,

    // ID explorer
    showIdExplorer,
    idsLoading,
    idsError,
    extractedIds,
    hasExtractedIds,
    loadExtractedIds,
    closeIdExplorer,

    // Comparison
    showCompareView,
    compareLoading,
    compareError,
    comparisonData,
    compareId1,
    compareId2,
    hasComparison,
    loadComparison,
    closeCompareView,

    // Cross-service timeline
    showCrossServiceView,
    crossServiceLoading,
    crossServiceError,
    crossServiceData,
    hasCrossServiceData,
    loadCrossServiceTimeline,
    closeCrossServiceView,

    // Smart sample
    sampleStrategy,
    sampleSize,
    sampleLoading,
    sampleError,
    sampleData,
    sampleActive,
    loadSmartSample,
    setSampleStrategy,
    setSampleSize,
    applySample,
    clearSample,
  }
})
