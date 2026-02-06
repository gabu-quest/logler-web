import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * Curated palette of 14 colors for file identification on dark backgrounds.
 * Avoids colors already used for log levels and semantic accents:
 *   - #ff3b3b (error red), #ffcc00 (warning amber), #a8ff60 (success green)
 *   - #00e5ff (primary cyan), #ff2bd6 (info magenta)
 */
const FILE_PALETTE = [
  '#4fc3f7', // light blue
  '#ce93d8', // light purple
  '#ff6e40', // deep orange
  '#26a69a', // teal
  '#f48fb1', // pink
  '#7c4dff', // deep purple
  '#c6ff00', // lime
  '#536dfe', // indigo
  '#00bfa5', // teal accent
  '#ffab40', // orange accent
  '#2196f3', // blue
  '#ea80fc', // purple accent
  '#40c4ff', // light blue accent
  '#69f0ae', // green accent (muted, not acid green)
] as const

export const useFileColorsStore = defineStore('fileColors', () => {
  // Color assignments: file path -> color hex
  const colorAssignments = ref(new Map<string, string>())

  // Hidden files for visibility toggling
  const hiddenFiles = ref(new Set<string>())

  // Track assignment order for next-available logic
  let nextColorIndex = 0

  /**
   * Get (or assign) a color for the given file path.
   * Returns the same color on repeated calls for the same path.
   */
  function getFileColor(filePath: string): string {
    const existing = colorAssignments.value.get(filePath)
    if (existing) return existing

    const color = FILE_PALETTE[nextColorIndex % FILE_PALETTE.length]
    nextColorIndex++
    colorAssignments.value.set(filePath, color)
    // Trigger reactivity on the Map ref
    colorAssignments.value = new Map(colorAssignments.value)
    return color
  }

  /** All assigned file paths (for iteration). */
  const assignedFiles = computed(() => Array.from(colorAssignments.value.keys()))

  /** Toggle visibility of a file in the log viewer. */
  function toggleFileVisibility(filePath: string) {
    const next = new Set(hiddenFiles.value)
    if (next.has(filePath)) {
      next.delete(filePath)
    } else {
      next.add(filePath)
    }
    hiddenFiles.value = next
  }

  /** Show all files (clear hidden set). */
  function showAll() {
    hiddenFiles.value = new Set()
  }

  /** Hide all currently assigned files. */
  function hideAll() {
    hiddenFiles.value = new Set(colorAssignments.value.keys())
  }

  /** Reset all color assignments and visibility state. */
  function resetColors() {
    colorAssignments.value = new Map()
    hiddenFiles.value = new Set()
    nextColorIndex = 0
  }

  return {
    colorAssignments,
    hiddenFiles,
    assignedFiles,
    getFileColor,
    toggleFileVisibility,
    showAll,
    hideAll,
    resetColors,
  }
})
