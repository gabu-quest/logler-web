<script setup lang="ts">
import { computed } from 'vue'
import { NSpace, NSelect, NInputNumber, NButton, NTooltip, NTag } from 'naive-ui'
import { PhFunnel, PhSpinner, PhX } from '@phosphor-icons/vue'
import { useInvestigationStore } from '@/stores/investigation'
import { useFilesStore } from '@/stores/files'
import type { SampleStrategy } from '@/api/types'

const investigationStore = useInvestigationStore()
const filesStore = useFilesStore()

const strategyOptions = [
  {
    label: 'Errors Focused',
    value: 'errors_focused' as SampleStrategy,
    description: 'Prioritize error and warning entries',
  },
  {
    label: 'Diverse',
    value: 'diverse' as SampleStrategy,
    description: 'Mix of levels and time periods',
  },
  {
    label: 'Representative',
    value: 'representative' as SampleStrategy,
    description: 'Statistical sampling across log levels',
  },
  {
    label: 'Chronological',
    value: 'chronological' as SampleStrategy,
    description: 'Even distribution across time',
  },
]

const selectedStrategy = computed({
  get: () => investigationStore.sampleStrategy,
  set: (val: SampleStrategy) => investigationStore.setSampleStrategy(val),
})

const sampleSize = computed({
  get: () => investigationStore.sampleSize,
  set: (val: number | null) => investigationStore.setSampleSize(val ?? 100),
})

async function handleSample() {
  if (!filesStore.hasActiveFiles) return
  await investigationStore.loadSmartSample(filesStore.activeFiles)
  investigationStore.applySample()
}

function handleClear() {
  investigationStore.clearSample()
}

const sampleResult = computed(() => investigationStore.sampleData)
const isSampled = computed(() => investigationStore.sampleActive)
</script>

<template>
  <div class="sample-controls">
    <NSpace align="center" :size="8">
      <!-- Show sampled status when active -->
      <template v-if="isSampled && sampleResult">
        <NTag type="info" size="small" :bordered="false">
          Sampled: {{ sampleResult.sample_count }} / {{ sampleResult.original_count }}
        </NTag>
        <NButton
          size="tiny"
          quaternary
          @click="handleClear"
        >
          <template #icon>
            <PhX :size="14" />
          </template>
          Show Full
        </NButton>
      </template>

      <!-- Show sampling controls when not active -->
      <template v-else>
        <NTooltip trigger="hover">
          <template #trigger>
            <PhFunnel :size="16" style="flex-shrink: 0;" />
          </template>
          Smart sampling helps you focus on relevant log entries
        </NTooltip>

        <NSelect
          v-model:value="selectedStrategy"
          :options="strategyOptions"
          size="small"
          style="width: 140px;"
        />

        <NInputNumber
          v-model:value="sampleSize"
          :min="10"
          :max="1000"
          :step="10"
          size="small"
          style="width: 80px;"
          placeholder="Size"
        />

        <NButton
          size="small"
          type="primary"
          :loading="investigationStore.sampleLoading"
          :disabled="!filesStore.hasActiveFiles"
          @click="handleSample"
        >
          <template #icon>
            <PhSpinner v-if="investigationStore.sampleLoading" :size="14" class="spin" />
          </template>
          Sample
        </NButton>
      </template>
    </NSpace>
  </div>
</template>

<style scoped>
.sample-controls {
  display: inline-flex;
  align-items: center;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spin {
  animation: spin 1s linear infinite;
}
</style>
