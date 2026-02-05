<script setup lang="ts">
import { computed } from 'vue'
import { NAlert, NSpace, NSelect, NButton, NText } from 'naive-ui'
import { PhWarning } from '@phosphor-icons/vue'
import { useLogsStore } from '@/stores/logs'
import { useUiStore } from '@/stores/ui'
import { useFilesStore } from '@/stores/files'
import { useInvestigationStore } from '@/stores/investigation'
import type { SampleStrategy } from '@/api/types'

const logsStore = useLogsStore()
const uiStore = useUiStore()
const filesStore = useFilesStore()
const investigationStore = useInvestigationStore()

const LARGE_FILE_THRESHOLD = 5000

const strategyOptions = [
  { label: 'Errors Focused', value: 'errors_focused' as SampleStrategy },
  { label: 'Diverse', value: 'diverse' as SampleStrategy },
  { label: 'Representative', value: 'representative' as SampleStrategy },
  { label: 'Chronological', value: 'chronological' as SampleStrategy },
]

const selectedStrategy = computed({
  get: () => investigationStore.sampleStrategy,
  set: (val: SampleStrategy) => investigationStore.setSampleStrategy(val),
})

const showBanner = computed(() => {
  return (
    logsStore.entries.length > LARGE_FILE_THRESHOLD &&
    !uiStore.samplingBannerDismissed &&
    !investigationStore.sampleActive
  )
})

async function handleApplySampling() {
  if (!filesStore.hasActiveFiles) return
  await investigationStore.loadSmartSample(filesStore.activeFiles)
  investigationStore.applySample()
}

function handleDismiss() {
  uiStore.dismissSamplingBanner()
}
</script>

<template>
  <NAlert
    v-if="showBanner"
    type="warning"
    closable
    @close="handleDismiss"
    class="large-file-banner"
  >
    <template #icon>
      <PhWarning :size="20" />
    </template>
    <NSpace align="center" :size="12">
      <NText>
        Large file detected ({{ logsStore.entries.length.toLocaleString() }} entries).
        Consider sampling for better performance.
      </NText>
      <NSelect
        v-model:value="selectedStrategy"
        :options="strategyOptions"
        size="small"
        style="width: 140px;"
      />
      <NButton
        size="small"
        type="primary"
        :loading="investigationStore.sampleLoading"
        @click="handleApplySampling"
      >
        Apply Sampling
      </NButton>
    </NSpace>
  </NAlert>
</template>

<style scoped>
.large-file-banner {
  margin: 8px 12px;
}
</style>
