<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { NVirtualList, NText } from 'naive-ui'
import LogEntry from './LogEntry.vue'
import LargeFileBanner from './LargeFileBanner.vue'
import FileColorLegend from './FileColorLegend.vue'
import { useLogsStore } from '@/stores/logs'
import { useUiStore } from '@/stores/ui'
import { useFilesStore } from '@/stores/files'
import { useInvestigationStore } from '@/stores/investigation'
import { useCorrelationsStore } from '@/stores/correlations'
import { useNavigationStore } from '@/stores/navigation'
import type { LogEntry as LogEntryType } from '@/api/types'

const logsStore = useLogsStore()
const uiStore = useUiStore()
const filesStore = useFilesStore()
const investigationStore = useInvestigationStore()
const correlationsStore = useCorrelationsStore()
const navigationStore = useNavigationStore()

const virtualListRef = ref<InstanceType<typeof NVirtualList> | null>(null)

const entries = computed(() => logsStore.filteredEntries)

// Auto-scroll to bottom when new entries arrive
watch(
  () => entries.value.length,
  async () => {
    if (uiStore.autoScroll && virtualListRef.value) {
      await nextTick()
      virtualListRef.value.scrollTo({ position: 'bottom' })
    }
  }
)

// Scroll to focused entry when it changes
watch(
  () => navigationStore.focusedIndex,
  async (index) => {
    if (index >= 0 && virtualListRef.value) {
      await nextTick()
      virtualListRef.value.scrollTo({ index, behavior: 'smooth' })
    }
  }
)

function isEntryFocused(index: number): boolean {
  return navigationStore.focusedIndex === index
}

function handleEntryClick(entry: LogEntryType) {
  investigationStore.loadContext(filesStore.activeFiles, entry)
}

function handleCorrelationClick(traceId: string) {
  correlationsStore.selectClusterByTraceId(traceId)
}
</script>

<template>
  <div class="log-viewer">
    <FileColorLegend />
    <LargeFileBanner />
    <NVirtualList
      ref="virtualListRef"
      :items="entries"
      :item-size="56"
      item-resizable
      class="log-list"
    >
      <template #default="{ item, index }">
        <LogEntry :entry="item" :is-focused="isEntryFocused(index)" @click="handleEntryClick" @correlation-click="handleCorrelationClick" />
      </template>
    </NVirtualList>

    <div v-if="entries.length === 0" class="empty-logs">
      <NText depth="3">No log entries match the current filters</NText>
    </div>
  </div>
</template>

<style scoped>
.log-viewer {
  height: 100%;
  background: var(--color-void, #07080d);
}

.log-list {
  height: 100%;
}

.empty-logs {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
