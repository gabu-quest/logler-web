import { onMounted, onUnmounted } from 'vue'

export interface Shortcut {
  key: string
  description: string
  handler: () => void
  condition?: () => boolean
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  function handleKeyDown(event: KeyboardEvent) {
    // Skip if user is typing in an input
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return
    }

    // Find matching shortcut
    const shortcut = shortcuts.find((s) => {
      if (s.key !== event.key) return false
      if (s.condition && !s.condition()) return false
      return true
    })

    if (shortcut) {
      event.preventDefault()
      shortcut.handler()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return { shortcuts }
}
