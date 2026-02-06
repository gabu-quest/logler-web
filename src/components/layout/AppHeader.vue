<script setup lang="ts">
import { NButton, NSpace, NTag, NText, NBadge, NTooltip, NDivider } from 'naive-ui'
import { PhFolderOpen, PhPlugsConnected, PhPlugs, PhFingerprint, PhNetwork, PhGear } from '@phosphor-icons/vue'
import SampleControls from '@/components/sample/SampleControls.vue'
import FormatSettings from '@/components/formats/FormatSettings.vue'
import { useUiStore } from '@/stores/ui'
import { useFilesStore } from '@/stores/files'
import { useLogsStore } from '@/stores/logs'
import { useInvestigationStore } from '@/stores/investigation'

const uiStore = useUiStore()
const filesStore = useFilesStore()
const logsStore = useLogsStore()
const investigationStore = useInvestigationStore()

function openIdExplorer() {
  if (filesStore.hasActiveFiles) {
    investigationStore.loadExtractedIds(filesStore.activeFiles)
  }
}

function openCrossServiceTimeline() {
  if (filesStore.hasActiveFiles) {
    investigationStore.loadCrossServiceTimeline(filesStore.activeFiles)
  }
}
</script>

<template>
  <div class="header-container">
    <div class="header-left">
      <NSpace align="center" :size="12">
        <img src="/favicon.svg" alt="Logler" class="logo" width="28" height="28" />
        <NText strong style="font-size: 18px;">Logler</NText>

        <NButton
          type="primary"
          size="small"
          @click="uiStore.openFileBrowser"
        >
          <template #icon>
            <PhFolderOpen weight="bold" />
          </template>
          Open File
        </NButton>

        <NTooltip v-if="filesStore.hasActiveFiles" trigger="hover">
          <template #trigger>
            <NButton
              size="small"
              quaternary
              @click="openIdExplorer"
            >
              <template #icon>
                <PhFingerprint :size="18" />
              </template>
              IDs
            </NButton>
          </template>
          Browse all thread, correlation, and trace IDs
        </NTooltip>

        <NTooltip v-if="filesStore.hasActiveFiles" trigger="hover">
          <template #trigger>
            <NButton
              size="small"
              quaternary
              @click="openCrossServiceTimeline"
            >
              <template #icon>
                <PhNetwork :size="18" />
              </template>
              Services
            </NButton>
          </template>
          View cross-service timeline
        </NTooltip>

        <NTooltip trigger="hover">
          <template #trigger>
            <NButton
              size="small"
              quaternary
              @click="uiStore.openFormatSettings"
            >
              <template #icon>
                <PhGear :size="18" />
              </template>
              Formats
            </NButton>
          </template>
          Configure log format patterns
        </NTooltip>

        <template v-if="filesStore.hasActiveFiles">
          <NDivider vertical />
          <SampleControls />
        </template>
      </NSpace>
    </div>

    <div class="header-center">
      <NSpace v-if="filesStore.hasActiveFiles" align="center" :size="8">
        <NTag
          v-for="file in filesStore.activeFiles"
          :key="file"
          size="small"
          :bordered="false"
        >
          {{ file.split('/').pop() }}
        </NTag>
        <NText depth="3" v-if="logsStore.partialLoad">
          ({{ logsStore.totalAvailable.toLocaleString() }} total, quick load)
        </NText>
      </NSpace>
    </div>

    <div class="header-right">
      <NSpace align="center" :size="12">
        <NBadge :dot="true" :type="uiStore.wsConnected ? 'success' : 'error'">
          <component
            :is="uiStore.wsConnected ? PhPlugsConnected : PhPlugs"
            :size="20"
            weight="regular"
          />
        </NBadge>
      </NSpace>
    </div>

    <FormatSettings v-model:show="uiStore.showFormatSettings" />
  </div>
</template>

<style scoped>
.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

.header-left,
.header-center,
.header-right {
  display: flex;
  align-items: center;
}

.header-center {
  flex: 1;
  justify-content: center;
}

.logo {
  border-radius: 4px;
}
</style>
