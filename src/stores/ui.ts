import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useFilesStore } from './files'
import { useInvestigationStore } from './investigation'

export type ViewMode = 'logs' | 'hierarchy' | 'waterfall' | 'sql'

export const useUiStore = defineStore('ui', () => {
  // Modal states
  const showFileBrowser = ref(false)
  const showInterleaveDetails = ref(false)
  const showHelpModal = ref(false)

  // Banner states
  const samplingBannerDismissed = ref(false)

  // View mode
  const viewMode = ref<ViewMode>('logs')

  // Auto-scroll behavior
  const autoScroll = ref(true)

  // WebSocket connection status
  const wsConnected = ref(false)

  // Loading states
  const loading = ref(false)
  const indexing = ref(false)

  // Actions
  function openFileBrowser() {
    showFileBrowser.value = true
  }

  function closeFileBrowser() {
    showFileBrowser.value = false
  }

  function setViewMode(mode: ViewMode) {
    viewMode.value = mode
  }

  function toggleAutoScroll() {
    autoScroll.value = !autoScroll.value
  }

  function openHelpModal() {
    showHelpModal.value = true
  }

  function closeHelpModal() {
    showHelpModal.value = false
  }

  function toggleHelpModal() {
    showHelpModal.value = !showHelpModal.value
  }

  function dismissSamplingBanner() {
    samplingBannerDismissed.value = true
  }

  function closeAllPanels() {
    const investigationStore = useInvestigationStore()

    showFileBrowser.value = false
    showInterleaveDetails.value = false
    showHelpModal.value = false
    investigationStore.closeContextDrawer()
    investigationStore.closeThreadPanel()
    investigationStore.closeIdExplorer()
    investigationStore.closeCompareView()
    investigationStore.closeCrossServiceView()
  }

  // Reset sampling banner when files change
  watch(
    () => {
      const filesStore = useFilesStore()
      return filesStore.activeFiles
    },
    () => {
      samplingBannerDismissed.value = false
    },
    { deep: true }
  )

  return {
    // State
    showFileBrowser,
    showInterleaveDetails,
    showHelpModal,
    samplingBannerDismissed,
    viewMode,
    autoScroll,
    wsConnected,
    loading,
    indexing,
    // Actions
    openFileBrowser,
    closeFileBrowser,
    openHelpModal,
    closeHelpModal,
    toggleHelpModal,
    dismissSamplingBanner,
    closeAllPanels,
    setViewMode,
    toggleAutoScroll,
  }
})
