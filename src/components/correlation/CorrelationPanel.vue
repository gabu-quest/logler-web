<script setup lang="ts">
import { computed } from 'vue'
import {
  NDrawer,
  NDrawerContent,
  NText,
  NTag,
  NSpace,
  NButton,
  NStatistic,
  NGrid,
  NGi,
  NScrollbar,
  NDivider,
} from 'naive-ui'
import { PhX, PhLink, PhClock } from '@phosphor-icons/vue'
import { useCorrelationsStore } from '@/stores/correlations'
import { ds } from '@/design/tokens'

const correlationsStore = useCorrelationsStore()

// Use a loose typed view for the cluster since it can be CorrelationCluster or EventCorrelationCluster
const cluster = computed(() => {
  const c = correlationsStore.selectedCluster
  if (!c) return null
  return c as {
    virtual_trace_id: string
    rule_type: string
    group?: string
    entry_count: number
    entries: Array<{ file?: string; line_number?: number; level?: string; timestamp?: string; message?: string }>
    shared_value?: string
    source_field?: string
    target_field?: string
    window?: string
    anchor_message?: string
    anchor_file?: string
    anchor_line?: number
    anchor_timestamp?: string
  }
})

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

function getLevelColor(level: string): string {
  return levelColors[level?.toUpperCase()] || '#808080'
}

function formatTime(timestamp: string | null | undefined): string {
  if (!timestamp) return ''
  try {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    } as Intl.DateTimeFormatOptions)
  } catch {
    return timestamp
  }
}

const ruleTypeLabel = computed(() => {
  if (!cluster.value) return ''
  const labels: Record<string, string> = {
    field_match: 'Field Match',
    temporal: 'Temporal',
    event_window: 'Event Window',
    event_trigger: 'Event Trigger',
  }
  return labels[cluster.value.rule_type] || cluster.value.rule_type
})
</script>

<template>
  <NDrawer
    :show="correlationsStore.showPanel"
    :width="680"
    placement="right"
    @update:show="val => !val && correlationsStore.closePanel()"
  >
    <NDrawerContent>
      <template #header>
        <NSpace align="center" justify="space-between" style="width: 100%;">
          <NSpace align="center" :size="8">
            <PhLink :size="20" />
            <span>Correlation Cluster</span>
            <NTag v-if="cluster" size="small" :bordered="false" :style="{ background: '#8b5cf620', color: '#8b5cf6' }">
              {{ cluster.virtual_trace_id }}
            </NTag>
          </NSpace>
          <NButton quaternary circle size="small" @click="correlationsStore.closePanel">
            <template #icon>
              <PhX :size="18" />
            </template>
          </NButton>
        </NSpace>
      </template>

      <template v-if="cluster">
        <!-- Cluster stats -->
        <div class="stats-header">
          <NGrid :cols="3" :x-gap="12">
            <NGi>
              <NStatistic label="Rule Type" :value="ruleTypeLabel">
                <template #prefix>
                  <PhLink v-if="cluster.rule_type === 'field_match'" :size="16" style="margin-right: 4px;" />
                  <PhClock v-else :size="16" style="margin-right: 4px;" />
                </template>
              </NStatistic>
            </NGi>
            <NGi>
              <NStatistic v-if="cluster.group" label="Group" :value="cluster.group" />
              <NStatistic v-else label="Window" :value="cluster.window || '—'" />
            </NGi>
            <NGi>
              <NStatistic label="Entries" :value="cluster.entry_count" />
            </NGi>
          </NGrid>

          <NSpace v-if="cluster.rule_type === 'field_match'" :size="8" style="margin-top: 12px;">
            <NText depth="3" style="font-size: 12px;">Shared value:</NText>
            <NTag size="small" :bordered="false" type="warning">
              {{ cluster.shared_value }}
            </NTag>
            <NText depth="3" style="font-size: 12px;">
              ({{ cluster.source_field }} = {{ cluster.target_field }})
            </NText>
          </NSpace>

          <NSpace v-if="cluster.rule_type === 'temporal' || cluster.rule_type === 'event_window' || cluster.rule_type === 'event_trigger'" :size="8" style="margin-top: 12px;">
            <NText depth="3" style="font-size: 12px;">Window:</NText>
            <NTag size="small" :bordered="false" type="info">
              {{ cluster.window }}
            </NTag>
            <NText v-if="cluster.anchor_message" depth="3" style="font-size: 12px;">
              Anchor: {{ cluster.anchor_message }}
            </NText>
            <NTag v-if="cluster.anchor_file" size="small" :bordered="false" :style="{ background: '#8b5cf620', color: '#8b5cf6' }">
              {{ cluster.anchor_file }}
            </NTag>
          </NSpace>
        </div>

        <NDivider style="margin: 12px 0;" />

        <!-- Correlated entries -->
        <NScrollbar style="max-height: calc(100vh - 320px);">
          <div class="cluster-entries">
            <div
              v-for="(entry, index) in cluster.entries"
              :key="index"
              class="cluster-entry"
            >
              <div class="entry-content">
                <NSpace :size="6" align="center">
                  <NText class="timestamp" depth="3">{{ formatTime(entry.timestamp) }}</NText>
                  <NTag
                    v-if="entry.level"
                    :bordered="false"
                    size="tiny"
                    :style="{ background: getLevelColor(entry.level) + '20', color: getLevelColor(entry.level) }"
                  >
                    {{ entry.level }}
                  </NTag>
                  <NTag
                    :bordered="false"
                    size="tiny"
                    :style="{ background: '#8b5cf620', color: '#8b5cf6' }"
                  >
                    {{ entry.file }}
                  </NTag>
                </NSpace>
                <div class="entry-message">
                  <NText class="message">{{ entry.message }}</NText>
                </div>
              </div>
            </div>
          </div>
        </NScrollbar>
      </template>

      <div v-else class="empty-state">
        <NText depth="3">Select a correlation cluster to view details</NText>
      </div>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.stats-header {
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 6px;
}

.cluster-entries {
  display: flex;
  flex-direction: column;
}

.cluster-entry {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.cluster-entry:hover {
  background: rgba(255, 255, 255, 0.03);
}

.entry-content {
  min-width: 0;
}

.timestamp {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px;
}

.entry-message {
  margin-top: 4px;
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
