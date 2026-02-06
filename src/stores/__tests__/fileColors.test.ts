import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFileColorsStore } from '../fileColors'

describe('fileColors store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('getFileColor', () => {
    it('assigns a color from the palette', () => {
      const store = useFileColorsStore()
      const color = store.getFileColor('/logs/app.log')
      // First color in palette is light blue
      expect(color).toBe('#4fc3f7')
    })

    it('returns same color on repeated calls', () => {
      const store = useFileColorsStore()
      const first = store.getFileColor('/logs/app.log')
      const second = store.getFileColor('/logs/app.log')
      expect(second).toBe(first)
    })

    it('cycles through palette for different files', () => {
      const store = useFileColorsStore()
      const color1 = store.getFileColor('/logs/app.log')
      const color2 = store.getFileColor('/logs/error.log')
      const color3 = store.getFileColor('/logs/access.log')

      expect(color1).toBe('#4fc3f7') // light blue
      expect(color2).toBe('#ce93d8') // light purple
      expect(color3).toBe('#ff6e40') // deep orange

      // All different
      expect(new Set([color1, color2, color3]).size).toBe(3)
    })

    it('wraps around after exhausting palette', () => {
      const store = useFileColorsStore()
      // Assign 14 files (full palette)
      for (let i = 0; i < 14; i++) {
        store.getFileColor(`/logs/file-${i}.log`)
      }
      // 15th file wraps to first color
      const wrapped = store.getFileColor('/logs/file-14.log')
      expect(wrapped).toBe('#4fc3f7')
    })
  })

  describe('assignedFiles', () => {
    it('starts empty', () => {
      const store = useFileColorsStore()
      expect(store.assignedFiles).toEqual([])
    })

    it('lists files after assignment', () => {
      const store = useFileColorsStore()
      store.getFileColor('/logs/app.log')
      store.getFileColor('/logs/error.log')
      expect(store.assignedFiles).toEqual(['/logs/app.log', '/logs/error.log'])
    })
  })

  describe('toggleFileVisibility', () => {
    it('hides a file', () => {
      const store = useFileColorsStore()
      store.getFileColor('/logs/app.log')

      store.toggleFileVisibility('/logs/app.log')

      expect(store.hiddenFiles.has('/logs/app.log')).toBe(true)
    })

    it('shows a hidden file on second toggle', () => {
      const store = useFileColorsStore()
      store.getFileColor('/logs/app.log')

      store.toggleFileVisibility('/logs/app.log')
      expect(store.hiddenFiles.has('/logs/app.log')).toBe(true)

      store.toggleFileVisibility('/logs/app.log')
      expect(store.hiddenFiles.has('/logs/app.log')).toBe(false)
    })
  })

  describe('showAll / hideAll', () => {
    it('hideAll hides all assigned files', () => {
      const store = useFileColorsStore()
      store.getFileColor('/logs/app.log')
      store.getFileColor('/logs/error.log')

      store.hideAll()

      expect(store.hiddenFiles.has('/logs/app.log')).toBe(true)
      expect(store.hiddenFiles.has('/logs/error.log')).toBe(true)
      expect(store.hiddenFiles.size).toBe(2)
    })

    it('showAll clears hidden set', () => {
      const store = useFileColorsStore()
      store.getFileColor('/logs/app.log')
      store.getFileColor('/logs/error.log')
      store.hideAll()

      store.showAll()

      expect(store.hiddenFiles.size).toBe(0)
    })
  })

  describe('resetColors', () => {
    it('clears all assignments and hidden state', () => {
      const store = useFileColorsStore()
      store.getFileColor('/logs/app.log')
      store.getFileColor('/logs/error.log')
      store.toggleFileVisibility('/logs/app.log')

      store.resetColors()

      expect(store.assignedFiles).toEqual([])
      expect(store.hiddenFiles.size).toBe(0)
      // After reset, first assignment starts at palette[0] again
      const color = store.getFileColor('/logs/new.log')
      expect(color).toBe('#4fc3f7')
    })
  })
})
