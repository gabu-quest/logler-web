<script setup lang="ts">
import { computed, ref } from 'vue'
import { NSpace, NText, NButton, NTag } from 'naive-ui'
import { PhEye, PhEyeSlash, PhCaretDown, PhCaretUp } from '@phosphor-icons/vue'
import { useFilesStore } from '@/stores/files'
import { useFileColorsStore } from '@/stores/fileColors'
import { useLogsStore } from '@/stores/logs'

const filesStore = useFilesStore()
const fileColorsStore = useFileColorsStore()
const logsStore = useLogsStore()

const collapsed = ref(false)

/** Only show when multiple files are open */
const show = computed(() => filesStore.isInterleaved)

/** Count entries per file from the raw (unfiltered) entries */
const fileCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const entry of logsStore.entries) {
    if (entry.file) {
      counts.set(entry.file, (counts.get(entry.file) || 0) + 1)
    }
  }
  return counts
})

/** File list with colors and counts */
const fileItems = computed(() => {
  return filesStore.activeFiles.map((filePath) => {
    const parts = filePath.replace(/\\/g, '/').split('/')
    const shortName = parts[parts.length - 1] || filePath
    return {
      path: filePath,
      shortName,
      color: fileColorsStore.getFileColor(filePath),
      count: fileCounts.value.get(filePath) || 0,
      hidden: fileColorsStore.hiddenFiles.has(filePath),
    }
  })
})

function toggleFile(filePath: string) {
  fileColorsStore.toggleFileVisibility(filePath)
}
</script>

<template>
  <div v-if="show" class="file-color-legend">
    <div class="legend-header" @click="collapsed = !collapsed">
      <NSpace :size="6" align="center">
        <component :is="collapsed ? PhCaretDown : PhCaretUp" :size="14" weight="regular" />
        <NText depth="3" class="legend-title">Files ({{ fileItems.length }})</NText>
      </NSpace>
      <NSpace v-if="!collapsed" :size="4">
        <NButton quaternary size="tiny" @click.stop="fileColorsStore.showAll()">
          Show All
        </NButton>
        <NButton quaternary size="tiny" @click.stop="fileColorsStore.hideAll()">
          Hide All
        </NButton>
      </NSpace>
    </div>
    <div v-if="!collapsed" class="legend-files">
      <div
        v-for="file in fileItems"
        :key="file.path"
        class="legend-file-row"
        :class="{ 'is-hidden': file.hidden }"
        @click="toggleFile(file.path)"
      >
        <NSpace :size="8" align="center">
          <span class="color-dot" :style="{ background: file.color }" />
          <NText :depth="file.hidden ? 3 : 1" class="file-name">{{ file.shortName }}</NText>
          <NTag :bordered="false" size="tiny" :style="{ opacity: file.hidden ? 0.4 : 1 }">
            {{ file.count.toLocaleString() }}
          </NTag>
          <component :is="file.hidden ? PhEyeSlash : PhEye" :size="14" weight="regular" :style="{ opacity: 0.6 }" />
        </NSpace>
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-color-legend {
  padding: 6px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
}

.legend-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}

.legend-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.legend-files {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 4px;
}

.legend-file-row {
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  transition: background 100ms ease;
}

.legend-file-row:hover {
  background: rgba(255, 255, 255, 0.04);
}

.legend-file-row.is-hidden {
  opacity: 0.5;
}

.color-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.file-name {
  font-size: 12px;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
}
</style>
