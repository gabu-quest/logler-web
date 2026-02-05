<script setup lang="ts">
import { NLayout, NLayoutHeader, NLayoutSider, NLayoutContent } from 'naive-ui'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import MainContent from '@/components/layout/MainContent.vue'
import FileBrowser from '@/components/file-browser/FileBrowser.vue'
import ContextDrawer from '@/components/context/ContextDrawer.vue'
import ThreadTimelinePanel from '@/components/thread/ThreadTimelinePanel.vue'
import IdExplorer from '@/components/ids/IdExplorer.vue'
import CompareView from '@/components/compare/CompareView.vue'
import CrossServiceView from '@/components/cross-service/CrossServiceView.vue'
import KeyboardHelpModal from '@/components/help/KeyboardHelpModal.vue'
import { useUiStore } from '@/stores/ui'
import { useNavigationStore } from '@/stores/navigation'
import { useFilesStore } from '@/stores/files'
import { useInvestigationStore } from '@/stores/investigation'
import { useKeyboardShortcuts, type Shortcut } from '@/composables/useKeyboardShortcuts'
import { useUrlState } from '@/composables/useUrlState'

const uiStore = useUiStore()
const navigationStore = useNavigationStore()
const filesStore = useFilesStore()
const investigationStore = useInvestigationStore()

const shortcuts: Shortcut[] = [
  {
    key: 'j',
    description: 'Next entry',
    handler: () => navigationStore.focusNext(),
    condition: () => filesStore.hasActiveFiles,
  },
  {
    key: 'k',
    description: 'Previous entry',
    handler: () => navigationStore.focusPrev(),
    condition: () => filesStore.hasActiveFiles,
  },
  {
    key: 'Enter',
    description: 'Open context',
    handler: () => {
      const entry = navigationStore.focusedEntry
      if (entry) {
        investigationStore.loadContext(filesStore.activeFiles, entry)
      }
    },
    condition: () => navigationStore.focusedEntry !== null,
  },
  {
    key: 'Escape',
    description: 'Close panels',
    handler: () => uiStore.closeAllPanels(),
  },
  {
    key: '1',
    description: 'Logs view',
    handler: () => uiStore.setViewMode('logs'),
  },
  {
    key: '2',
    description: 'Hierarchy view',
    handler: () => uiStore.setViewMode('hierarchy'),
  },
  {
    key: '3',
    description: 'Waterfall view',
    handler: () => uiStore.setViewMode('waterfall'),
  },
  {
    key: '4',
    description: 'SQL view',
    handler: () => uiStore.setViewMode('sql'),
  },
  {
    key: 'o',
    description: 'Open file',
    handler: () => uiStore.openFileBrowser(),
  },
  {
    key: '?',
    description: 'Help',
    handler: () => uiStore.toggleHelpModal(),
  },
]

useKeyboardShortcuts(shortcuts)
useUrlState()
</script>

<template>
  <n-layout class="app-layout" has-sider position="absolute">
    <n-layout-sider
      bordered
      :width="280"
      content-style="padding: 0;"
      :native-scrollbar="false"
    >
      <AppSidebar />
    </n-layout-sider>

    <n-layout>
      <n-layout-header bordered style="height: 56px; padding: 0 16px;">
        <AppHeader />
      </n-layout-header>

      <n-layout-content content-style="padding: 0;">
        <MainContent />
      </n-layout-content>
    </n-layout>

    <!-- File Browser Modal -->
    <FileBrowser
      v-model:show="uiStore.showFileBrowser"
    />

    <!-- Context Drawer -->
    <ContextDrawer />

    <!-- Thread Timeline Panel -->
    <ThreadTimelinePanel />

    <!-- ID Explorer -->
    <IdExplorer />

    <!-- Compare View -->
    <CompareView />

    <!-- Cross-Service Timeline View -->
    <CrossServiceView />

    <!-- Keyboard Help Modal -->
    <KeyboardHelpModal />
  </n-layout>
</template>

<style scoped>
.app-layout {
  height: 100vh;
}
</style>
