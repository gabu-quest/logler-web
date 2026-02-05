<script setup lang="ts">
import { ref, computed } from 'vue'
import { NDrawer, NDrawerContent, NSpin, NAlert, NText, NTabs, NTabPane, NInput, NDataTable, NButton, NSpace, NBadge } from 'naive-ui'
import { PhX, PhFingerprint, PhMagnifyingGlass, PhGitBranch, PhLink, PhPath } from '@phosphor-icons/vue'
import type { DataTableColumns } from 'naive-ui'
import { useInvestigationStore } from '@/stores/investigation'
import { useFilesStore } from '@/stores/files'
import type { IdInfo } from '@/api/types'

const investigationStore = useInvestigationStore()
const filesStore = useFilesStore()

const searchQuery = ref('')
const activeTab = ref('threads')

const extractedIds = computed(() => investigationStore.extractedIds)

const filteredThreadIds = computed(() => {
  const ids = extractedIds.value?.thread_ids ?? []
  if (!searchQuery.value) return ids
  const query = searchQuery.value.toLowerCase()
  return ids.filter(id => id.id.toLowerCase().includes(query))
})

const filteredCorrelationIds = computed(() => {
  const ids = extractedIds.value?.correlation_ids ?? []
  if (!searchQuery.value) return ids
  const query = searchQuery.value.toLowerCase()
  return ids.filter(id => id.id.toLowerCase().includes(query))
})

const filteredTraceIds = computed(() => {
  const ids = extractedIds.value?.trace_ids ?? []
  if (!searchQuery.value) return ids
  const query = searchQuery.value.toLowerCase()
  return ids.filter(id => id.id.toLowerCase().includes(query))
})

function formatTime(timestamp: string | null): string {
  if (!timestamp) return '-'
  try {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return timestamp
  }
}

function handleViewTimeline(id: string, type: 'thread_id' | 'correlation_id' | 'trace_id') {
  investigationStore.loadThreadTimeline(filesStore.activeFiles, id, type)
}

const columns: DataTableColumns<IdInfo> = [
  {
    title: 'ID',
    key: 'id',
    ellipsis: {
      tooltip: true,
    },
    render(row) {
      return row.id
    },
  },
  {
    title: 'Count',
    key: 'count',
    width: 80,
    sorter: (a, b) => a.count - b.count,
  },
  {
    title: 'First Seen',
    key: 'first_seen',
    width: 130,
    render(row) {
      return formatTime(row.first_seen)
    },
  },
  {
    title: 'Last Seen',
    key: 'last_seen',
    width: 130,
    render(row) {
      return formatTime(row.last_seen)
    },
  },
]

function getRowKey(row: IdInfo) {
  return row.id
}
</script>

<template>
  <NDrawer
    :show="investigationStore.showIdExplorer"
    :width="700"
    placement="right"
    @update:show="val => !val && investigationStore.closeIdExplorer()"
  >
    <NDrawerContent>
      <template #header>
        <NSpace align="center" justify="space-between" style="width: 100%;">
          <NSpace align="center" :size="8">
            <PhFingerprint :size="20" />
            <span>ID Explorer</span>
          </NSpace>
          <NButton quaternary circle size="small" @click="investigationStore.closeIdExplorer">
            <template #icon>
              <PhX :size="18" />
            </template>
          </NButton>
        </NSpace>
      </template>

      <NSpin :show="investigationStore.idsLoading">
        <NAlert
          v-if="investigationStore.idsError"
          type="error"
          :bordered="false"
          style="margin-bottom: 12px;"
        >
          {{ investigationStore.idsError }}
        </NAlert>

        <template v-else-if="extractedIds">
          <!-- Search input -->
          <NInput
            v-model:value="searchQuery"
            placeholder="Search IDs..."
            clearable
            style="margin-bottom: 12px;"
          >
            <template #prefix>
              <PhMagnifyingGlass :size="16" />
            </template>
          </NInput>

          <NTabs v-model:value="activeTab" type="line" size="small">
            <NTabPane name="threads">
              <template #tab>
                <NSpace :size="4" align="center">
                  <PhGitBranch :size="16" />
                  <span>Threads</span>
                  <NBadge
                    :value="filteredThreadIds.length"
                    :max="999"
                    :show-zero="false"
                    type="info"
                  />
                </NSpace>
              </template>

              <NDataTable
                :columns="columns"
                :data="filteredThreadIds"
                :row-key="getRowKey"
                :max-height="400"
                size="small"
                :bordered="false"
                :row-props="(row: IdInfo) => ({
                  style: 'cursor: pointer;',
                  onClick: () => handleViewTimeline(row.id, 'thread_id'),
                })"
              />
            </NTabPane>

            <NTabPane name="correlations">
              <template #tab>
                <NSpace :size="4" align="center">
                  <PhLink :size="16" />
                  <span>Correlations</span>
                  <NBadge
                    :value="filteredCorrelationIds.length"
                    :max="999"
                    :show-zero="false"
                    type="warning"
                  />
                </NSpace>
              </template>

              <NDataTable
                :columns="columns"
                :data="filteredCorrelationIds"
                :row-key="getRowKey"
                :max-height="400"
                size="small"
                :bordered="false"
                :row-props="(row: IdInfo) => ({
                  style: 'cursor: pointer;',
                  onClick: () => handleViewTimeline(row.id, 'correlation_id'),
                })"
              />
            </NTabPane>

            <NTabPane name="traces">
              <template #tab>
                <NSpace :size="4" align="center">
                  <PhPath :size="16" />
                  <span>Traces</span>
                  <NBadge
                    :value="filteredTraceIds.length"
                    :max="999"
                    :show-zero="false"
                    type="success"
                  />
                </NSpace>
              </template>

              <NDataTable
                :columns="columns"
                :data="filteredTraceIds"
                :row-key="getRowKey"
                :max-height="400"
                size="small"
                :bordered="false"
                :row-props="(row: IdInfo) => ({
                  style: 'cursor: pointer;',
                  onClick: () => handleViewTimeline(row.id, 'trace_id'),
                })"
              />
            </NTabPane>
          </NTabs>
        </template>

        <div v-if="!extractedIds && !investigationStore.idsLoading" class="empty-state">
          <NText depth="3">No IDs extracted yet</NText>
        </div>
      </NSpin>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}
</style>
