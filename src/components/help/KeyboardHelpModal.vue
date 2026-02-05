<script setup lang="ts">
import { NModal, NText, NTag } from 'naive-ui'
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()

const shortcuts = [
  { key: 'j', description: 'Next entry' },
  { key: 'k', description: 'Previous entry' },
  { key: 'Enter', description: 'Open context for focused entry' },
  { key: 'Escape', description: 'Close all panels' },
  { key: '1', description: 'Switch to Logs view' },
  { key: '2', description: 'Switch to Hierarchy view' },
  { key: '3', description: 'Switch to Waterfall view' },
  { key: '4', description: 'Switch to SQL view' },
  { key: 'o', description: 'Open file browser' },
  { key: '?', description: 'Toggle this help' },
]
</script>

<template>
  <NModal
    v-model:show="uiStore.showHelpModal"
    preset="card"
    title="Keyboard Shortcuts"
    style="width: 400px;"
    :bordered="false"
    :segmented="{ content: true }"
  >
    <div class="shortcuts-grid">
      <div
        v-for="shortcut in shortcuts"
        :key="shortcut.key"
        class="shortcut-row"
      >
        <NTag size="small" :bordered="false" class="key-tag">
          {{ shortcut.key }}
        </NTag>
        <NText class="shortcut-description">{{ shortcut.description }}</NText>
      </div>
    </div>
  </NModal>
</template>

<style scoped>
.shortcuts-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.shortcut-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.key-tag {
  min-width: 48px;
  text-align: center;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
}

.shortcut-description {
  font-size: 13px;
}
</style>
