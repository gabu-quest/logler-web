<script setup lang="ts">
import { computed } from 'vue'
import { NText, NTag, NSpace, NTooltip } from 'naive-ui'
import type { LogEntry as LogEntryType } from '@/api/types'
import { useFilesStore } from '@/stores/files'
import { useFileColorsStore } from '@/stores/fileColors'

const props = defineProps<{
  entry: LogEntryType
  isFocused?: boolean
}>()

const emit = defineEmits<{
  click: [entry: LogEntryType]
}>()

const filesStore = useFilesStore()
const fileColorsStore = useFileColorsStore()

function handleClick() {
  emit('click', props.entry)
}

const levelColors: Record<string, string> = {
  TRACE: '#808080',
  DEBUG: '#00e5ff',
  INFO: '#a8ff60',
  WARN: '#ffcc00',
  WARNING: '#ffcc00',
  ERROR: '#ff3b3b',
  CRITICAL: '#ff3b3b',
  FATAL: '#ff3b3b',
}

const levelColor = computed(() => levelColors[props.entry.level] || '#808080')

const formattedTime = computed(() => {
  if (!props.entry.timestamp) return ''
  try {
    const date = new Date(props.entry.timestamp)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    } as Intl.DateTimeFormatOptions)
  } catch {
    return props.entry.timestamp
  }
})

/** Whether we are in multi-file (interleaved) mode and this entry has a file field */
const isMultiFile = computed(() => filesStore.isInterleaved && !!props.entry.file)

/** Color assigned to this entry's source file */
const fileColor = computed(() => {
  if (!props.entry.file) return undefined
  return fileColorsStore.getFileColor(props.entry.file)
})

/** Short filename (last path segment) for the badge */
const shortFilename = computed(() => {
  if (!props.entry.file) return ''
  const parts = props.entry.file.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || props.entry.file
})

/** Left border style: file color in multi-file mode */
const entryStyle = computed(() => {
  if (isMultiFile.value && fileColor.value) {
    return { borderLeft: `3px solid ${fileColor.value}`, paddingLeft: '9px' }
  }
  return undefined
})
</script>

<template>
  <div
    class="log-entry"
    :class="{ 'is-focused': isFocused && !isMultiFile, 'is-focused-multi': isFocused && isMultiFile }"
    :style="isMultiFile ? entryStyle : undefined"
    @click="handleClick"
  >
    <div class="entry-header">
      <NSpace :size="8" align="center">
        <NText class="line-number" depth="3">{{ entry.line_number }}</NText>
        <NText class="timestamp" depth="3">{{ formattedTime }}</NText>
        <NTag
          :bordered="false"
          size="tiny"
          :style="{ background: levelColor + '20', color: levelColor }"
        >
          {{ entry.level }}
        </NTag>
        <NTooltip v-if="isMultiFile" :delay="300">
          <template #trigger>
            <NTag
              :bordered="false"
              size="tiny"
              :style="{ background: fileColor + '20', color: fileColor }"
            >
              {{ shortFilename }}
            </NTag>
          </template>
          {{ entry.file }}
        </NTooltip>
        <NTag
          v-if="entry.thread_id"
          :bordered="false"
          size="tiny"
          type="info"
        >
          {{ entry.thread_id }}
        </NTag>
        <NTag
          v-if="entry.correlation_id"
          :bordered="false"
          size="tiny"
          type="warning"
        >
          {{ entry.correlation_id }}
        </NTag>
        <NTag
          v-if="entry.service_name"
          :bordered="false"
          size="tiny"
          type="success"
        >
          {{ entry.service_name }}
        </NTag>
      </NSpace>
    </div>
    <div class="entry-message">
      <NText class="message">{{ entry.message }}</NText>
    </div>
  </div>
</template>

<style scoped>
.log-entry {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 13px;
}

.log-entry:hover {
  background: rgba(255, 255, 255, 0.03);
}

.log-entry.is-focused {
  background: rgba(0, 229, 255, 0.06);
  border-left: 3px solid #00e5ff;
  padding-left: 9px;
}

.log-entry.is-focused-multi {
  background: rgba(0, 229, 255, 0.06);
}

.entry-header {
  margin-bottom: 4px;
}

.line-number {
  font-size: 11px;
  min-width: 40px;
}

.timestamp {
  font-size: 11px;
}

.message {
  word-break: break-word;
  white-space: pre-wrap;
}
</style>
