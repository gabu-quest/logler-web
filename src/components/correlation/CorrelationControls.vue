<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  NButton,
  NText,
  NSpace,
  NSelect,
  NAlert,
} from 'naive-ui'
import { PhLink, PhPlay } from '@phosphor-icons/vue'
import { useCorrelationsStore } from '@/stores/correlations'
import { useFilesStore } from '@/stores/files'

const correlationsStore = useCorrelationsStore()
const filesStore = useFilesStore()

const selectedRule = ref<string | null>(null)

// Load config when files change
watch(
  () => filesStore.activeFiles,
  (paths) => {
    if (paths.length > 0) {
      const dir = paths[0].replace(/\/[^/]+$/, '')
      correlationsStore.loadConfig(dir)
    }
  },
  { immediate: true },
)

const ruleOptions = ref<Array<{ label: string; value: string }>>([])

watch(
  () => correlationsStore.configData,
  (config) => {
    if (!config) {
      ruleOptions.value = []
      return
    }
    ruleOptions.value = Object.entries(config.groups).map(([name, group]) => ({
      label: `${name} (${group.rule_count} rule${group.rule_count !== 1 ? 's' : ''})`,
      value: name,
    }))
  },
)

function handleRun() {
  if (filesStore.activeFiles.length === 0) return
  correlationsStore.runCorrelations(filesStore.activeFiles, selectedRule.value || undefined)
}

function handleClear() {
  correlationsStore.clearResults()
  selectedRule.value = null
}

function handleViewClusters() {
  if (correlationsStore.runResult && correlationsStore.runResult.clusters.length > 0) {
    correlationsStore.selectCluster(correlationsStore.runResult.clusters[0])
  }
}
</script>

<template>
  <div v-if="correlationsStore.hasConfig" class="correlation-controls">
    <NText depth="3" style="font-size: 12px; margin-bottom: 8px; display: block;">
      Correlations
    </NText>

    <NSelect
      v-model:value="selectedRule"
      :options="ruleOptions"
      placeholder="All rules"
      clearable
      size="small"
      style="margin-bottom: 8px;"
    />

    <NSpace :size="6">
      <NButton
        size="small"
        type="primary"
        :loading="correlationsStore.runLoading"
        :disabled="filesStore.activeFiles.length === 0"
        @click="handleRun"
      >
        <template #icon>
          <PhPlay :size="14" />
        </template>
        Run
      </NButton>
      <NButton
        v-if="correlationsStore.hasResults"
        size="small"
        @click="handleViewClusters"
      >
        <template #icon>
          <PhLink :size="14" />
        </template>
        {{ correlationsStore.runResult!.total_clusters }} clusters
      </NButton>
      <NButton
        v-if="correlationsStore.hasResults"
        size="small"
        quaternary
        @click="handleClear"
      >
        Clear
      </NButton>
    </NSpace>

    <NAlert
      v-if="correlationsStore.runError"
      type="warning"
      :bordered="false"
      style="margin-top: 8px; font-size: 12px;"
      closable
    >
      {{ correlationsStore.runError }}
    </NAlert>

    <div v-if="correlationsStore.hasResults" class="result-summary">
      <NText depth="3" style="font-size: 11px;">
        {{ correlationsStore.runResult!.total_entries_correlated }} entries linked
        across {{ correlationsStore.runResult!.total_clusters }} clusters
      </NText>
    </div>
  </div>
</template>

<style scoped>
.correlation-controls {
  margin-bottom: 8px;
}

.result-summary {
  margin-top: 6px;
}
</style>
