<script setup lang="ts">
import { computed } from 'vue'
import { NDrawer, NDrawerContent, NSpin, NAlert, NText, NTag, NSpace, NButton, NGrid, NGi, NStatistic, NScrollbar, NDivider } from 'naive-ui'
import { PhX, PhArrowsLeftRight, PhWarning, PhCircle } from '@phosphor-icons/vue'
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

const comparison = computed(() => investigationStore.comparisonData)

function formatDuration(ms: number | null): string {
  if (ms === null) return '-'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
  return `${(ms / 60000).toFixed(2)}m`
}

function formatDurationDiff(ms: number | null): string {
  if (ms === null) return '-'
  const sign = ms > 0 ? '+' : ''
  return `${sign}${formatDuration(Math.abs(ms))}`
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
    :show="investigationStore.showCompareView"
    :width="1000"
    placement="right"
    @update:show="val => !val && investigationStore.closeCompareView()"
  >
    <NDrawerContent>
      <template #header>
        <NSpace align="center" justify="space-between" style="width: 100%;">
          <NSpace align="center" :size="8">
            <PhArrowsLeftRight :size="20" />
            <span>Thread Comparison</span>
          </NSpace>
          <NButton quaternary circle size="small" @click="investigationStore.closeCompareView">
            <template #icon>
              <PhX :size="18" />
            </template>
          </NButton>
        </NSpace>
      </template>

      <NSpin :show="investigationStore.compareLoading">
        <NAlert
          v-if="investigationStore.compareError"
          type="error"
          :bordered="false"
          style="margin-bottom: 12px;"
        >
          {{ investigationStore.compareError }}
        </NAlert>

        <template v-else-if="comparison">
          <!-- Comparison Summary -->
          <div class="comparison-summary">
            <NGrid :cols="2" :x-gap="24">
              <NGi>
                <div class="timeline-header">
                  <NTag type="info" :bordered="false">{{ comparison.id1 }}</NTag>
                  <NSpace :size="12" style="margin-top: 8px;">
                    <NStatistic label="Duration" :value="formatDuration(comparison.timeline1.duration_ms)" />
                    <NStatistic label="Entries" :value="comparison.timeline1.entries.length" />
                    <NStatistic label="Errors" :value="comparison.timeline1.error_count">
                      <template #prefix>
                        <PhWarning v-if="comparison.timeline1.error_count > 0" :size="14" style="color: #ff3b3b;" />
                      </template>
                    </NStatistic>
                  </NSpace>
                </div>
              </NGi>
              <NGi>
                <div class="timeline-header">
                  <NTag type="warning" :bordered="false">{{ comparison.id2 }}</NTag>
                  <NSpace :size="12" style="margin-top: 8px;">
                    <NStatistic label="Duration" :value="formatDuration(comparison.timeline2.duration_ms)" />
                    <NStatistic label="Entries" :value="comparison.timeline2.entries.length" />
                    <NStatistic label="Errors" :value="comparison.timeline2.error_count">
                      <template #prefix>
                        <PhWarning v-if="comparison.timeline2.error_count > 0" :size="14" style="color: #ff3b3b;" />
                      </template>
                    </NStatistic>
                  </NSpace>
                </div>
              </NGi>
            </NGrid>

            <!-- Difference stats -->
            <NDivider style="margin: 16px 0;" />
            <NGrid :cols="4" :x-gap="12">
              <NGi>
                <NStatistic label="Duration Diff" :value="formatDurationDiff(comparison.duration_diff_ms)" />
              </NGi>
              <NGi>
                <NStatistic label="Entry Diff" :value="comparison.entry_count_diff > 0 ? `+${comparison.entry_count_diff}` : String(comparison.entry_count_diff)" />
              </NGi>
              <NGi>
                <NStatistic label="Error Diff" :value="comparison.error_count_diff > 0 ? `+${comparison.error_count_diff}` : String(comparison.error_count_diff)" />
              </NGi>
              <NGi>
                <div>
                  <NText depth="3" style="font-size: 12px;">Common Services</NText>
                  <NSpace :size="4" style="margin-top: 4px;">
                    <NTag
                      v-for="service in comparison.common_services"
                      :key="service"
                      size="tiny"
                      :bordered="false"
                      type="success"
                    >
                      {{ service }}
                    </NTag>
                    <NText v-if="comparison.common_services.length === 0" depth="3">-</NText>
                  </NSpace>
                </div>
              </NGi>
            </NGrid>
          </div>

          <!-- Side by side timelines -->
          <NGrid :cols="2" :x-gap="16" style="margin-top: 16px;">
            <NGi>
              <NScrollbar style="max-height: calc(100vh - 400px);">
                <div class="timeline-entries">
                  <div
                    v-for="(entry, index) in comparison.timeline1.entries"
                    :key="`t1-${entry.file}-${entry.line_number}`"
                    class="timeline-entry"
                    :class="{ 'is-error': isError(entry) }"
                    @click="handleEntryClick(entry)"
                  >
                    <div class="timeline-marker">
                      <div class="marker-line" :class="{ first: index === 0, last: index === comparison.timeline1.entries.length - 1 }" />
                      <PhCircle
                        :size="8"
                        :weight="isError(entry) ? 'fill' : 'regular'"
                        :style="{ color: getLevelColor(entry.level) }"
                      />
                    </div>
                    <div class="entry-content">
                      <NSpace :size="4" align="center">
                        <NText class="timestamp" depth="3">{{ formatTime(entry.timestamp) }}</NText>
                        <NTag
                          :bordered="false"
                          size="tiny"
                          :style="{ background: getLevelColor(entry.level) + '20', color: getLevelColor(entry.level) }"
                        >
                          {{ entry.level }}
                        </NTag>
                      </NSpace>
                      <NText class="message" style="font-size: 11px;">{{ entry.message }}</NText>
                    </div>
                  </div>
                </div>
              </NScrollbar>
            </NGi>
            <NGi>
              <NScrollbar style="max-height: calc(100vh - 400px);">
                <div class="timeline-entries">
                  <div
                    v-for="(entry, index) in comparison.timeline2.entries"
                    :key="`t2-${entry.file}-${entry.line_number}`"
                    class="timeline-entry"
                    :class="{ 'is-error': isError(entry) }"
                    @click="handleEntryClick(entry)"
                  >
                    <div class="timeline-marker">
                      <div class="marker-line" :class="{ first: index === 0, last: index === comparison.timeline2.entries.length - 1 }" />
                      <PhCircle
                        :size="8"
                        :weight="isError(entry) ? 'fill' : 'regular'"
                        :style="{ color: getLevelColor(entry.level) }"
                      />
                    </div>
                    <div class="entry-content">
                      <NSpace :size="4" align="center">
                        <NText class="timestamp" depth="3">{{ formatTime(entry.timestamp) }}</NText>
                        <NTag
                          :bordered="false"
                          size="tiny"
                          :style="{ background: getLevelColor(entry.level) + '20', color: getLevelColor(entry.level) }"
                        >
                          {{ entry.level }}
                        </NTag>
                      </NSpace>
                      <NText class="message" style="font-size: 11px;">{{ entry.message }}</NText>
                    </div>
                  </div>
                </div>
              </NScrollbar>
            </NGi>
          </NGrid>
        </template>

        <div v-if="!comparison && !investigationStore.compareLoading" class="empty-state">
          <NText depth="3">No comparison loaded</NText>
        </div>
      </NSpin>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.comparison-summary {
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 6px;
}

.timeline-header {
  padding: 8px 0;
}

.timeline-entries {
  display: flex;
  flex-direction: column;
}

.timeline-entry {
  display: flex;
  padding: 6px 0;
  cursor: pointer;
  transition: background-color 0.15s;
}

.timeline-entry:hover {
  background: rgba(255, 255, 255, 0.03);
}

.timeline-entry.is-error {
  background: rgba(255, 59, 59, 0.06);
}

.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 20px;
  flex-shrink: 0;
  position: relative;
}

.marker-line {
  position: absolute;
  width: 1px;
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
  padding-left: 6px;
}

.timestamp {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10px;
}

.message {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  word-break: break-word;
  white-space: pre-wrap;
  display: block;
  margin-top: 2px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}
</style>
