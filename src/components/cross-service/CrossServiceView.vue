<script setup lang="ts">
import { computed } from 'vue'
import { NDrawer, NDrawerContent, NSpin, NAlert, NText, NTag, NSpace, NButton, NScrollbar, NTooltip } from 'naive-ui'
import { PhX, PhNetwork, PhClock } from '@phosphor-icons/vue'
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

const serviceColors = [
  ds.color.palette.neonCyan,
  ds.color.palette.neonMagenta,
  ds.color.palette.acidGreen,
  ds.color.palette.amber,
  ds.color.palette.violet,
]

const crossServiceData = computed(() => investigationStore.crossServiceData)
const lanes = computed(() => crossServiceData.value?.lanes ?? [])

// Calculate timeline range
const timelineRange = computed(() => {
  if (!crossServiceData.value) return { start: 0, end: 0, duration: 0 }
  const start = crossServiceData.value.start_time ? new Date(crossServiceData.value.start_time).getTime() : 0
  const end = crossServiceData.value.end_time ? new Date(crossServiceData.value.end_time).getTime() : 0
  return { start, end, duration: end - start }
})

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

function getServiceColor(index: number): string {
  return serviceColors[index % serviceColors.length]
}

function getEntryPosition(entry: LogEntry): number {
  if (!entry.timestamp || timelineRange.value.duration === 0) return 0
  const entryTime = new Date(entry.timestamp).getTime()
  const position = ((entryTime - timelineRange.value.start) / timelineRange.value.duration) * 100
  return Math.max(0, Math.min(100, position))
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
    :show="investigationStore.showCrossServiceView"
    :width="900"
    placement="right"
    @update:show="val => !val && investigationStore.closeCrossServiceView()"
  >
    <NDrawerContent>
      <template #header>
        <NSpace align="center" justify="space-between" style="width: 100%;">
          <NSpace align="center" :size="8">
            <PhNetwork :size="20" />
            <span>Cross-Service Timeline</span>
            <NTag v-if="crossServiceData?.identifier" size="small" :bordered="false" type="info">
              {{ crossServiceData.identifier }}
            </NTag>
          </NSpace>
          <NButton quaternary circle size="small" @click="investigationStore.closeCrossServiceView">
            <template #icon>
              <PhX :size="18" />
            </template>
          </NButton>
        </NSpace>
      </template>

      <NSpin :show="investigationStore.crossServiceLoading">
        <NAlert
          v-if="investigationStore.crossServiceError"
          type="error"
          :bordered="false"
          style="margin-bottom: 12px;"
        >
          {{ investigationStore.crossServiceError }}
        </NAlert>

        <template v-else-if="crossServiceData">
          <!-- Summary bar -->
          <div class="summary-bar">
            <NSpace align="center" :size="16">
              <NSpace align="center" :size="4">
                <PhClock :size="16" />
                <NText>Total: {{ formatDuration(crossServiceData.total_duration_ms) }}</NText>
              </NSpace>
              <NText depth="3">|</NText>
              <NText>{{ lanes.length }} services</NText>
              <NText depth="3">|</NText>
              <NText>
                {{ formatTime(crossServiceData.start_time) }} - {{ formatTime(crossServiceData.end_time) }}
              </NText>
            </NSpace>
          </div>

          <!-- Swimlane visualization -->
          <NScrollbar style="max-height: calc(100vh - 200px);">
            <div class="swimlanes">
              <div
                v-for="(lane, laneIndex) in lanes"
                :key="lane.service_name"
                class="lane"
              >
                <div class="lane-header">
                  <NSpace align="center" :size="8">
                    <div
                      class="service-indicator"
                      :style="{ backgroundColor: getServiceColor(laneIndex) }"
                    />
                    <NText strong>{{ lane.service_name }}</NText>
                    <NTag size="tiny" :bordered="false">{{ lane.entries.length }}</NTag>
                    <NTag v-if="lane.error_count > 0" size="tiny" :bordered="false" type="error">
                      {{ lane.error_count }} errors
                    </NTag>
                  </NSpace>
                  <NText depth="3" style="font-size: 11px;">
                    {{ formatDuration(lane.duration_ms) }}
                  </NText>
                </div>

                <div class="lane-timeline">
                  <div class="timeline-bar" />
                  <NTooltip
                    v-for="entry in lane.entries"
                    :key="`${entry.file}-${entry.line_number}`"
                    trigger="hover"
                    placement="top"
                  >
                    <template #trigger>
                      <div
                        class="entry-marker"
                        :class="{ 'is-error': isError(entry) }"
                        :style="{
                          left: `${getEntryPosition(entry)}%`,
                          backgroundColor: isError(entry) ? ds.color.semantic.error : getServiceColor(laneIndex),
                        }"
                        @click="handleEntryClick(entry)"
                      />
                    </template>
                    <div style="max-width: 300px;">
                      <NSpace vertical :size="4">
                        <NSpace :size="4" align="center">
                          <NText class="timestamp">{{ formatTime(entry.timestamp) }}</NText>
                          <NTag
                            :bordered="false"
                            size="tiny"
                            :style="{ background: getLevelColor(entry.level) + '20', color: getLevelColor(entry.level) }"
                          >
                            {{ entry.level }}
                          </NTag>
                        </NSpace>
                        <NText style="font-size: 12px; word-break: break-word;">{{ entry.message }}</NText>
                      </NSpace>
                    </div>
                  </NTooltip>
                </div>
              </div>
            </div>

            <!-- Time axis -->
            <div class="time-axis">
              <NText depth="3" style="font-size: 10px;">{{ formatTime(crossServiceData.start_time) }}</NText>
              <NText depth="3" style="font-size: 10px;">{{ formatTime(crossServiceData.end_time) }}</NText>
            </div>
          </NScrollbar>
        </template>

        <div v-if="!crossServiceData && !investigationStore.crossServiceLoading" class="empty-state">
          <NText depth="3">No cross-service timeline loaded</NText>
        </div>
      </NSpin>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.summary-bar {
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 6px;
  margin-bottom: 16px;
}

.swimlanes {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.lane {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
}

.lane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.service-indicator {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.lane-timeline {
  position: relative;
  height: 24px;
  margin: 8px 0;
}

.timeline-bar {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-50%);
}

.entry-marker {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  z-index: 1;
}

.entry-marker:hover {
  transform: translate(-50%, -50%) scale(1.4);
  box-shadow: 0 0 8px currentColor;
}

.entry-marker.is-error {
  box-shadow: 0 0 4px v-bind('ds.color.semantic.error');
}

.time-axis {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  margin-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.timestamp {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}
</style>
