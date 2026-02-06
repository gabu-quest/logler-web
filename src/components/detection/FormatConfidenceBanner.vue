<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { NAlert, NTag, NSpace, NButton } from 'naive-ui'
import { PhWarning, PhCheck } from '@phosphor-icons/vue'
import { useFilesStore } from '@/stores/files'
import { useUiStore } from '@/stores/ui'
import { api } from '@/api/client'
import type { FormatDetectionResult } from '@/api/types'

const filesStore = useFilesStore()
const uiStore = useUiStore()

const detections = ref<Record<string, FormatDetectionResult>>({})
const loading = ref(false)
const dismissed = ref(false)

const hasLowConfidence = ref(false)

async function detectFormats() {
  if (filesStore.activeFiles.length === 0) return

  loading.value = true
  try {
    const response = await api.detectFormats({
      paths: filesStore.activeFiles,
      sample_size: 30,
    })
    detections.value = response.files
    hasLowConfidence.value = Object.values(response.files).some(
      d => d.confidence < 0.7
    )
  } catch {
    // Silently fail — banner is informational
  } finally {
    loading.value = false
  }
}

function dismiss() {
  dismissed.value = true
}

function confidenceType(confidence: number): 'success' | 'warning' | 'error' {
  if (confidence >= 0.8) return 'success'
  if (confidence >= 0.5) return 'warning'
  return 'error'
}

function formatLabel(format: string): string {
  if (format === 'json') return 'JSON'
  if (format === 'syslog') return 'Syslog'
  if (format === 'common_log') return 'Apache CLF'
  if (format === 'logfmt') return 'Logfmt'
  if (format === 'unknown') return 'Unknown'
  if (format.startsWith('custom:')) return format.slice(7)
  return format
}

function fileName(path: string): string {
  return path.split('/').pop() || path
}

onMounted(() => {
  if (filesStore.hasActiveFiles) {
    detectFormats()
  }
})

watch(
  () => filesStore.activeFiles,
  (newFiles) => {
    if (newFiles.length > 0) {
      dismissed.value = false
      detectFormats()
    } else {
      detections.value = {}
    }
  },
  { deep: true },
)
</script>

<template>
  <NAlert
    v-if="!dismissed && !loading && Object.keys(detections).length > 0"
    :type="hasLowConfidence ? 'warning' : 'info'"
    :closable="true"
    class="format-banner"
    @close="dismiss"
  >
    <template #header>
      <NSpace align="center" :size="8">
        <component :is="hasLowConfidence ? PhWarning : PhCheck" :size="16" weight="regular" />
        <span>Format Detection</span>
      </NSpace>
    </template>
    <NSpace :size="16" align="center" wrap>
      <NSpace
        v-for="(detection, path) in detections"
        :key="path"
        align="center"
        :size="4"
      >
        <span class="file-label">{{ fileName(String(path)) }}:</span>
        <NTag
          :type="confidenceType(detection.confidence)"
          size="small"
          :bordered="false"
        >
          {{ formatLabel(detection.format) }}
          ({{ Math.round(detection.confidence * 100) }}%)
        </NTag>
        <NTag v-if="detection.mixed" size="small" :bordered="false" type="warning">
          mixed
        </NTag>
      </NSpace>
      <NButton
        v-if="hasLowConfidence"
        text
        size="small"
        type="primary"
        @click="uiStore.openFormatSettings()"
      >
        Configure format
      </NButton>
    </NSpace>
  </NAlert>
</template>

<style scoped>
.format-banner {
  margin: 0;
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-top: none;
}

.file-label {
  font-size: 12px;
  opacity: 0.8;
  font-family: monospace;
}
</style>
