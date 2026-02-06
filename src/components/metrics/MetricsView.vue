<script setup lang="ts">
import { onMounted, watch } from 'vue'
import {
  NButton,
  NSelect,
  NSpace,
  NSpin,
  NEmpty,
  NAlert,
} from 'naive-ui'
import { PhArrowsClockwise } from '@phosphor-icons/vue'
import { useMetricsStore } from '@/stores/metrics'
import { useFilesStore } from '@/stores/files'
import MetricsChart from './MetricsChart.vue'
import MetricsStats from './MetricsStats.vue'

const metricsStore = useMetricsStore()
const filesStore = useFilesStore()

const bucketOptions = [
  { label: '100ms', value: '100ms' },
  { label: '500ms', value: '500ms' },
  { label: '1s', value: '1s' },
  { label: '5s', value: '5s' },
  { label: '10s', value: '10s' },
  { label: '30s', value: '30s' },
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
]

function fieldOptions() {
  return metricsStore.availableFields.map(f => ({ label: f, value: f }))
}

function handleExtract() {
  if (filesStore.activeFiles.length > 0) {
    metricsStore.extractMetrics(
      filesStore.activeFiles,
      undefined,
      metricsStore.bucketSize,
    )
  }
}

function handleFieldChange(fields: string[]) {
  metricsStore.setSelectedFields(fields)
}

function handleBucketChange(size: string) {
  metricsStore.setBucketSize(size)
  handleExtract()
}

// Auto-extract on mount if files are loaded
onMounted(() => {
  if (filesStore.hasActiveFiles && !metricsStore.hasMetrics) {
    handleExtract()
  }
})

// Re-extract when active files change
watch(
  () => filesStore.activeFiles,
  (newFiles) => {
    if (newFiles.length > 0) {
      metricsStore.clearMetrics()
      handleExtract()
    }
  },
  { deep: true },
)
</script>

<template>
  <div class="metrics-view">
    <div class="metrics-toolbar">
      <NSpace align="center" :size="12">
        <NSelect
          v-if="metricsStore.availableFields.length > 0"
          :value="metricsStore.selectedFields"
          :options="fieldOptions()"
          multiple
          clearable
          placeholder="Select fields..."
          style="min-width: 300px;"
          @update:value="handleFieldChange"
        />
        <NSelect
          :value="metricsStore.bucketSize"
          :options="bucketOptions"
          style="width: 100px;"
          @update:value="handleBucketChange"
        />
        <NButton
          size="small"
          :loading="metricsStore.metricsLoading"
          @click="handleExtract"
        >
          <template #icon>
            <PhArrowsClockwise :size="16" weight="regular" />
          </template>
          Refresh
        </NButton>
      </NSpace>
    </div>

    <NSpin :show="metricsStore.metricsLoading" style="height: calc(100% - 48px);">
      <template v-if="metricsStore.metricsError">
        <NAlert type="error" :title="metricsStore.metricsError" style="margin: 16px;" />
      </template>

      <template v-else-if="metricsStore.metricsData && Object.keys(metricsStore.metricsData.fields).length > 0">
        <div class="metrics-content">
          <MetricsChart
            v-if="metricsStore.selectedFields.length > 0"
            :data="metricsStore.metricsData"
            :selected-fields="metricsStore.selectedFields"
          />

          <div class="metrics-stats-list">
            <MetricsStats
              v-for="field in metricsStore.selectedFields"
              :key="field"
              :field-name="field"
              :data="metricsStore.metricsData.fields[field]"
            />
          </div>
        </div>
      </template>

      <template v-else-if="metricsStore.metricsData">
        <NEmpty description="No numeric fields found in log entries" style="margin-top: 80px;">
          <template #extra>
            Numeric fields like "duration=123ms" or "temperature=22.5" will appear here.
          </template>
        </NEmpty>
      </template>

      <template v-else>
        <NEmpty description="Extract numeric metrics from log files" style="margin-top: 80px;">
          <template #extra>
            <NButton type="primary" @click="handleExtract">
              Extract Metrics
            </NButton>
          </template>
        </NEmpty>
      </template>
    </NSpin>
  </div>
</template>

<style scoped>
.metrics-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.metrics-toolbar {
  padding: 8px 16px;
  border-bottom: 1px solid rgba(230, 241, 255, 0.1);
  flex-shrink: 0;
}

.metrics-content {
  flex: 1;
  overflow-y: auto;
}

.metrics-stats-list {
  padding-bottom: 16px;
}
</style>
