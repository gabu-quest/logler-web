import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useLogsStore } from './logs'

export const useNavigationStore = defineStore('navigation', () => {
  const focusedIndex = ref(-1)

  const focusedEntry = computed(() => {
    const logsStore = useLogsStore()
    if (focusedIndex.value < 0 || focusedIndex.value >= logsStore.filteredEntries.length) {
      return null
    }
    return logsStore.filteredEntries[focusedIndex.value]
  })

  function focusNext() {
    const logsStore = useLogsStore()
    const maxIndex = logsStore.filteredEntries.length - 1
    if (maxIndex < 0) return

    if (focusedIndex.value < maxIndex) {
      focusedIndex.value++
    } else {
      focusedIndex.value = maxIndex
    }
  }

  function focusPrev() {
    const logsStore = useLogsStore()
    if (logsStore.filteredEntries.length === 0) return

    if (focusedIndex.value > 0) {
      focusedIndex.value--
    } else {
      focusedIndex.value = 0
    }
  }

  function setFocus(index: number) {
    const logsStore = useLogsStore()
    if (index >= 0 && index < logsStore.filteredEntries.length) {
      focusedIndex.value = index
    }
  }

  function clearFocus() {
    focusedIndex.value = -1
  }

  return {
    focusedIndex,
    focusedEntry,
    focusNext,
    focusPrev,
    setFocus,
    clearFocus,
  }
})
