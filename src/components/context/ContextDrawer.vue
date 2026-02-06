<script setup lang="ts">
import { computed } from 'vue'
import { NDrawer, NDrawerContent, NSpin, NAlert, NText, NTag, NSpace, NButton } from 'naive-ui'
import { PhX, PhMagnifyingGlassPlus, PhLink } from '@phosphor-icons/vue'
import { useInvestigationStore } from '@/stores/investigation'
import { useFilesStore } from '@/stores/files'
import { useCorrelationsStore } from '@/stores/correlations'
import type { ContextEntry, LogEntry } from '@/api/types'
import { ds } from '@/design/tokens'

const investigationStore = useInvestigationStore()
const filesStore = useFilesStore()
const correlationsStore = useCorrelationsStore()

const levelColors: Record<string, string> = {
  TRACE: '#808080',
  DEBUG: ds.color.palette.neonCyan,
  INFO: ds.color.semantic.success,
  WARN: ds.color.semantic.warning,
  WARNING: ds.color.semantic.warning,
  ERROR: ds.color.semantic.error,
  CRITICAL: ds.color.semantic.error,
  FATAL: ds.color.semantic.error,
}

const entries = computed(() => investigationStore.contextData?.entries ?? [])
const targetLine = computed(() => investigationStore.contextData?.target_line)

function formatTime(timestamp: string | null): string {
  if (!timestamp) return ''
  try {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return timestamp
  }
}

function getLevelColor(level: string): string {
  return levelColors[level] || '#808080'
}

function handleEntryClick(entry: ContextEntry) {
  if (entry.line_number === targetLine.value) return

  // Re-center context on clicked entry
  const logEntry: LogEntry = entry
  investigationStore.loadContext(filesStore.activeFiles, logEntry)
}

function handleFollowThread(identifier: string, type: string) {
  investigationStore.loadThreadTimeline(filesStore.activeFiles, identifier, type)
}

function handleCorrelateAround() {
  const entry = investigationStore.selectedEntry
  if (!entry) return
  correlationsStore.correlateAroundEntry(filesStore.activeFiles, entry)
}
</script>

<template>
  <NDrawer
    :show="investigationStore.showContextDrawer"
    :width="600"
    placement="right"
    @update:show="val => !val && investigationStore.closeContextDrawer()"
  >
    <NDrawerContent>
      <template #header>
        <NSpace align="center" justify="space-between" style="width: 100%;">
          <NSpace align="center" :size="8">
            <PhMagnifyingGlassPlus :size="20" />
            <span>Context View</span>
            <NTag v-if="investigationStore.selectedEntry" size="small" :bordered="false">
              Line {{ investigationStore.selectedEntry.line_number }}
            </NTag>
          </NSpace>
          <NButton quaternary circle size="small" @click="investigationStore.closeContextDrawer">
            <template #icon>
              <PhX :size="18" />
            </template>
          </NButton>
        </NSpace>
      </template>

      <!-- Correlate action bar -->
      <div v-if="investigationStore.selectedEntry && filesStore.isInterleaved" class="correlate-bar">
        <NButton
          size="small"
          :loading="correlationsStore.eventLoading"
          @click="handleCorrelateAround"
        >
          <template #icon>
            <PhLink :size="14" />
          </template>
          Correlate Around This
        </NButton>
      </div>

      <NSpin :show="investigationStore.contextLoading">
        <NAlert
          v-if="investigationStore.contextError"
          type="error"
          :bordered="false"
          style="margin-bottom: 12px;"
        >
          {{ investigationStore.contextError }}
        </NAlert>

        <div v-else class="context-entries">
          <div
            v-for="entry in entries"
            :key="`${entry.file}-${entry.line_number}`"
            class="context-entry"
            :class="{ 'is-target': entry.is_target }"
            @click="handleEntryClick(entry)"
          >
            <div class="entry-header">
              <NSpace :size="6" align="center">
                <NText class="line-number" depth="3">{{ entry.line_number }}</NText>
                <NText class="timestamp" depth="3">{{ formatTime(entry.timestamp) }}</NText>
                <NTag
                  :bordered="false"
                  size="tiny"
                  :style="{ background: getLevelColor(entry.level) + '20', color: getLevelColor(entry.level) }"
                >
                  {{ entry.level }}
                </NTag>
                <NTag
                  v-if="entry.thread_id"
                  :bordered="false"
                  size="tiny"
                  type="info"
                  style="cursor: pointer;"
                  @click.stop="handleFollowThread(entry.thread_id, 'thread_id')"
                >
                  {{ entry.thread_id }}
                </NTag>
                <NTag
                  v-if="entry.correlation_id"
                  :bordered="false"
                  size="tiny"
                  type="warning"
                  style="cursor: pointer;"
                  @click.stop="handleFollowThread(entry.correlation_id, 'correlation_id')"
                >
                  {{ entry.correlation_id }}
                </NTag>
              </NSpace>
            </div>
            <div class="entry-message">
              <NText class="message">{{ entry.message }}</NText>
            </div>
          </div>
        </div>

        <div v-if="entries.length === 0 && !investigationStore.contextLoading" class="empty-state">
          <NText depth="3">No context available</NText>
        </div>
      </NSpin>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.correlate-bar {
  padding: 8px 0 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 8px;
}

.context-entries {
  display: flex;
  flex-direction: column;
}

.context-entry {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.context-entry:hover {
  background: rgba(255, 255, 255, 0.03);
}

.context-entry.is-target {
  background: rgba(0, 229, 255, 0.08);
  border-left: 3px solid v-bind('ds.color.palette.neonCyan');
  margin-left: -3px;
}

.entry-header {
  margin-bottom: 4px;
}

.line-number {
  font-size: 10px;
  min-width: 36px;
}

.timestamp {
  font-size: 10px;
}

.message {
  word-break: break-word;
  white-space: pre-wrap;
  font-size: 12px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}
</style>
