<script setup lang="ts">
import { computed } from 'vue'
import { NDrawer, NDrawerContent, NSpin, NAlert, NText, NTag, NSpace, NButton, NStatistic, NGrid, NGi, NScrollbar } from 'naive-ui'
import { PhX, PhGitBranch, PhClock, PhWarning, PhCircle } from '@phosphor-icons/vue'
import { useInvestigationStore } from '@/stores/investigation'
import { useFilesStore } from '@/stores/files'
import type { LogEntry } from '@/api/types'
import { ds } from '@/design/tokens'

const investigationStore = useInvestigationStore()
const filesStore = useFilesStore()

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

const timeline = computed(() => investigationStore.threadTimeline)
const entries = computed(() => timeline.value?.entries ?? [])

function formatDuration(ms: number | null): string {
  if (ms === null) return '-'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
  return `${(ms / 60000).toFixed(2)}m`
}

function formatTime(timestamp: string | null): string {
  if (!timestamp) return ''
  try {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    } as Intl.DateTimeFormatOptions)
  } catch {
    return timestamp
  }
}

function getLevelColor(level: string): string {
  return levelColors[level] || '#808080'
}

function isError(entry: LogEntry): boolean {
  return ['ERROR', 'CRITICAL', 'FATAL'].includes(entry.level)
}

function handleEntryClick(entry: LogEntry) {
  investigationStore.loadContext(filesStore.activeFiles, entry)
}
</script>

<template>
  <NDrawer
    :show="investigationStore.showThreadPanel"
    :width="700"
    placement="right"
    @update:show="val => !val && investigationStore.closeThreadPanel()"
  >
    <NDrawerContent>
      <template #header>
        <NSpace align="center" justify="space-between" style="width: 100%;">
          <NSpace align="center" :size="8">
            <PhGitBranch :size="20" />
            <span>Thread Timeline</span>
            <NTag v-if="timeline" size="small" :bordered="false" type="info">
              {{ timeline.identifier_type }}: {{ timeline.identifier }}
            </NTag>
          </NSpace>
          <NButton quaternary circle size="small" @click="investigationStore.closeThreadPanel">
            <template #icon>
              <PhX :size="18" />
            </template>
          </NButton>
        </NSpace>
      </template>

      <NSpin :show="investigationStore.threadLoading">
        <NAlert
          v-if="investigationStore.threadError"
          type="error"
          :bordered="false"
          style="margin-bottom: 12px;"
        >
          {{ investigationStore.threadError }}
        </NAlert>

        <template v-else-if="timeline">
          <!-- Stats header -->
          <div class="stats-header">
            <NGrid :cols="4" :x-gap="12">
              <NGi>
                <NStatistic label="Duration" :value="formatDuration(timeline.duration_ms)">
                  <template #prefix>
                    <PhClock :size="16" style="margin-right: 4px;" />
                  </template>
                </NStatistic>
              </NGi>
              <NGi>
                <NStatistic label="Entries" :value="timeline.entries.length" />
              </NGi>
              <NGi>
                <NStatistic label="Spans" :value="timeline.span_count" />
              </NGi>
              <NGi>
                <NStatistic label="Errors" :value="timeline.error_count">
                  <template #prefix>
                    <PhWarning v-if="timeline.error_count > 0" :size="16" style="color: #ff3b3b; margin-right: 4px;" />
                  </template>
                </NStatistic>
              </NGi>
            </NGrid>

            <NSpace v-if="timeline.service_names.length > 0" :size="4" style="margin-top: 12px;">
              <NText depth="3" style="font-size: 12px;">Services:</NText>
              <NTag
                v-for="service in timeline.service_names"
                :key="service"
                size="small"
                :bordered="false"
                type="success"
              >
                {{ service }}
              </NTag>
            </NSpace>
          </div>

          <!-- Timeline entries -->
          <NScrollbar style="max-height: calc(100vh - 280px);">
            <div class="timeline-entries">
              <div
                v-for="(entry, index) in entries"
                :key="`${entry.file}-${entry.line_number}`"
                class="timeline-entry"
                :class="{ 'is-error': isError(entry) }"
                @click="handleEntryClick(entry)"
              >
                <div class="timeline-marker">
                  <div class="marker-line" :class="{ first: index === 0, last: index === entries.length - 1 }" />
                  <PhCircle
                    :size="10"
                    :weight="isError(entry) ? 'fill' : 'regular'"
                    :style="{ color: getLevelColor(entry.level) }"
                  />
                </div>
                <div class="entry-content">
                  <div class="entry-header">
                    <NSpace :size="6" align="center">
                      <NText class="timestamp" depth="3">{{ formatTime(entry.timestamp) }}</NText>
                      <NTag
                        :bordered="false"
                        size="tiny"
                        :style="{ background: getLevelColor(entry.level) + '20', color: getLevelColor(entry.level) }"
                      >
                        {{ entry.level }}
                      </NTag>
                      <NTag
                        v-if="entry.service_name"
                        :bordered="false"
                        size="tiny"
                        type="success"
                      >
                        {{ entry.service_name }}
                      </NTag>
                      <NTag
                        v-if="entry.span_id"
                        :bordered="false"
                        size="tiny"
                        type="info"
                      >
                        span:{{ entry.span_id.substring(0, 8) }}
                      </NTag>
                    </NSpace>
                  </div>
                  <div class="entry-message">
                    <NText class="message">{{ entry.message }}</NText>
                  </div>
                </div>
              </div>
            </div>
          </NScrollbar>
        </template>

        <div v-if="!timeline && !investigationStore.threadLoading" class="empty-state">
          <NText depth="3">No thread timeline loaded</NText>
        </div>
      </NSpin>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.stats-header {
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 6px;
  margin-bottom: 16px;
}

.timeline-entries {
  display: flex;
  flex-direction: column;
}

.timeline-entry {
  display: flex;
  padding: 8px 0;
  cursor: pointer;
  transition: background-color 0.15s;
}

.timeline-entry:hover {
  background: rgba(255, 255, 255, 0.03);
}

.timeline-entry.is-error {
  background: rgba(255, 59, 59, 0.06);
}

.timeline-entry.is-error:hover {
  background: rgba(255, 59, 59, 0.1);
}

.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 24px;
  flex-shrink: 0;
  position: relative;
}

.marker-line {
  position: absolute;
  width: 2px;
  background: rgba(255, 255, 255, 0.1);
  top: 0;
  bottom: 0;
}

.marker-line.first {
  top: 50%;
}

.marker-line.last {
  bottom: 50%;
}

.entry-content {
  flex: 1;
  min-width: 0;
  padding-left: 8px;
}

.entry-header {
  margin-bottom: 4px;
}

.timestamp {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px;
}

.message {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 12px;
  word-break: break-word;
  white-space: pre-wrap;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}
</style>
