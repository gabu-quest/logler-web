import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUiStore } from '../ui'

describe('ui store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('view mode', () => {
    it('defaults to logs view', () => {
      const store = useUiStore()
      expect(store.viewMode).toBe('logs')
    })

    it('setViewMode changes the view mode', () => {
      const store = useUiStore()

      store.setViewMode('hierarchy')
      expect(store.viewMode).toBe('hierarchy')

      store.setViewMode('waterfall')
      expect(store.viewMode).toBe('waterfall')

      store.setViewMode('sql')
      expect(store.viewMode).toBe('sql')

      store.setViewMode('metrics')
      expect(store.viewMode).toBe('metrics')
    })
  })

  describe('modal toggles', () => {
    it('openFileBrowser sets showFileBrowser to true', () => {
      const store = useUiStore()
      expect(store.showFileBrowser).toBe(false)

      store.openFileBrowser()
      expect(store.showFileBrowser).toBe(true)
    })

    it('closeFileBrowser sets showFileBrowser to false', () => {
      const store = useUiStore()
      store.showFileBrowser = true

      store.closeFileBrowser()
      expect(store.showFileBrowser).toBe(false)
    })

    it('toggleHelpModal toggles showHelpModal', () => {
      const store = useUiStore()
      expect(store.showHelpModal).toBe(false)

      store.toggleHelpModal()
      expect(store.showHelpModal).toBe(true)

      store.toggleHelpModal()
      expect(store.showHelpModal).toBe(false)
    })

    it('openFormatSettings sets showFormatSettings to true', () => {
      const store = useUiStore()
      store.openFormatSettings()
      expect(store.showFormatSettings).toBe(true)
    })

    it('closeFormatSettings sets showFormatSettings to false', () => {
      const store = useUiStore()
      store.showFormatSettings = true
      store.closeFormatSettings()
      expect(store.showFormatSettings).toBe(false)
    })
  })

  describe('closeAllPanels', () => {
    it('closes all modal and panel states', () => {
      const store = useUiStore()
      store.showFileBrowser = true
      store.showInterleaveDetails = true
      store.showHelpModal = true
      store.showFormatSettings = true

      store.closeAllPanels()

      expect(store.showFileBrowser).toBe(false)
      expect(store.showInterleaveDetails).toBe(false)
      expect(store.showHelpModal).toBe(false)
      expect(store.showFormatSettings).toBe(false)
    })
  })

  describe('sampling banner', () => {
    it('dismissSamplingBanner sets dismissed to true', () => {
      const store = useUiStore()
      expect(store.samplingBannerDismissed).toBe(false)

      store.dismissSamplingBanner()
      expect(store.samplingBannerDismissed).toBe(true)
    })
  })

  describe('auto scroll', () => {
    it('toggleAutoScroll flips autoScroll state', () => {
      const store = useUiStore()
      expect(store.autoScroll).toBe(true)

      store.toggleAutoScroll()
      expect(store.autoScroll).toBe(false)

      store.toggleAutoScroll()
      expect(store.autoScroll).toBe(true)
    })
  })
})
