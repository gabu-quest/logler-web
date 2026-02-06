<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NDrawer,
  NDrawerContent,
  NTabs,
  NTabPane,
  NInput,
  NButton,
  NSpace,
  NTag,
  NText,
  NEmpty,
  NCollapse,
  NCollapseItem,
  NAlert,
  NCode,
  NDivider,
  NSpin,
  NScrollbar,
  NTooltip,
  NInputGroup,
} from 'naive-ui'
import {
  PhGear,
  PhTestTube,
  PhBookOpen,
  PhCopy,
  PhCheck,
  PhFloppyDisk,
  PhTrash,
  PhPlus,
} from '@phosphor-icons/vue'
import { api } from '@/api/client'
import type { FormatDefinition, FormatTestResult } from '@/api/types'
import { ds } from '@/design/tokens'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

// State
const loading = ref(false)
const activeTab = ref('current')

// Current config
const configPath = ref<string | null>(null)
const formats = ref<Record<string, FormatDefinition>>({})
const configError = ref<string | null>(null)

// Built-in formats
const builtinFormats = ref<Record<string, FormatDefinition>>({})
const builtinLoaded = ref(false)

// Regex tester
const testRegex = ref('')
const testSampleLines = ref('')
const testResults = ref<FormatTestResult[]>([])
const testNamedGroups = ref<string[]>([])
const testError = ref<string | null>(null)
const testing = ref(false)

// Edit state
const newFormatName = ref('')
const newFormatRegex = ref('')
const newFormatTimestamp = ref('')
const newFormatPatterns = ref('')
const saving = ref(false)
const copiedFormat = ref<string | null>(null)

const hasFormats = computed(() => Object.keys(formats.value).length > 0)

// Load current config when drawer opens
watch(() => props.show, async (visible) => {
  if (visible) {
    await loadConfig()
  }
})

async function loadConfig() {
  loading.value = true
  configError.value = null
  try {
    const response = await api.getFormatConfig()
    if (!response.available) {
      configError.value = response.error || 'Format config not available'
      return
    }
    configPath.value = response.config_path
    formats.value = response.formats
    if (response.error) {
      configError.value = response.error
    }
  } catch (e) {
    configError.value = String(e)
  } finally {
    loading.value = false
  }
}

async function loadBuiltins() {
  if (builtinLoaded.value) return
  try {
    const response = await api.getBuiltinFormats()
    builtinFormats.value = response.formats
    builtinLoaded.value = true
  } catch (e) {
    // Silently fail
  }
}

async function runTest() {
  if (!testRegex.value.trim()) return
  testing.value = true
  testError.value = null
  testResults.value = []
  testNamedGroups.value = []

  const lines = testSampleLines.value
    .split('\n')
    .filter(l => l.trim().length > 0)

  if (lines.length === 0) {
    testError.value = 'Paste some sample log lines to test against'
    testing.value = false
    return
  }

  try {
    const response = await api.testFormatRegex({
      regex: testRegex.value,
      sample_lines: lines,
    })
    if (response.error) {
      testError.value = response.error
    } else {
      testResults.value = response.results
      testNamedGroups.value = response.named_groups
    }
  } catch (e) {
    testError.value = String(e)
  } finally {
    testing.value = false
  }
}

function copyToTest(regex: string) {
  testRegex.value = regex
  activeTab.value = 'test'
}

function useBuiltin(name: string) {
  const fmt = builtinFormats.value[name]
  if (!fmt) return
  formats.value[name] = { ...fmt }
  activeTab.value = 'current'
}

function addNewFormat() {
  const name = newFormatName.value.trim()
  if (!name) return

  formats.value[name] = {
    regex: newFormatRegex.value,
    timestamp_format: newFormatTimestamp.value || null,
    file_patterns: newFormatPatterns.value
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0),
  }

  // Reset form
  newFormatName.value = ''
  newFormatRegex.value = ''
  newFormatTimestamp.value = ''
  newFormatPatterns.value = ''
}

function removeFormat(name: string) {
  delete formats.value[name]
}

async function saveConfig() {
  saving.value = true
  try {
    await api.saveFormatConfig({ formats: formats.value })
    await loadConfig()
  } catch (e) {
    configError.value = String(e)
  } finally {
    saving.value = false
  }
}

function copyRegex(regex: string, name: string) {
  navigator.clipboard.writeText(regex)
  copiedFormat.value = name
  setTimeout(() => {
    copiedFormat.value = null
  }, 1500)
}

function handleTabChange(tab: string) {
  activeTab.value = tab
  if (tab === 'builtin') {
    loadBuiltins()
  }
}

</script>

<template>
  <NDrawer
    :show="show"
    :width="680"
    placement="right"
    @update:show="emit('update:show', $event)"
  >
    <NDrawerContent title="Log Format Settings" closable>
      <template #header>
        <NSpace align="center" :size="8">
          <PhGear :size="20" />
          <span>Log Format Settings</span>
        </NSpace>
      </template>

      <NSpin :show="loading">
        <NTabs
          :value="activeTab"
          type="line"
          size="small"
          @update:value="handleTabChange"
        >
          <!-- Current Config Tab -->
          <NTabPane name="current" tab="Config">
            <template #tab>
              <PhGear :size="14" style="margin-right: 4px;" />
              Config
            </template>

            <div class="tab-content">
              <NAlert
                v-if="configError"
                type="warning"
                :title="configError"
                style="margin-bottom: 12px;"
                closable
                @close="configError = null"
              />

              <NText v-if="configPath" depth="3" style="font-size: 12px; display: block; margin-bottom: 12px;">
                {{ configPath }}
              </NText>
              <NText v-else depth="3" style="font-size: 12px; display: block; margin-bottom: 12px;">
                No .logler/formats.yaml found. Add formats below or use a built-in.
              </NText>

              <!-- Existing formats -->
              <template v-if="hasFormats">
                <div
                  v-for="(fmt, name) in formats"
                  :key="name"
                  class="format-card"
                >
                  <div class="format-header">
                    <NText strong>{{ name }}</NText>
                    <NSpace :size="4">
                      <NTooltip trigger="hover">
                        <template #trigger>
                          <NButton
                            size="tiny"
                            quaternary
                            @click="copyToTest(fmt.regex)"
                          >
                            <template #icon>
                              <PhTestTube :size="14" />
                            </template>
                          </NButton>
                        </template>
                        Test this regex
                      </NTooltip>
                      <NButton
                        size="tiny"
                        quaternary
                        type="error"
                        @click="removeFormat(name as string)"
                      >
                        <template #icon>
                          <PhTrash :size="14" />
                        </template>
                      </NButton>
                    </NSpace>
                  </div>

                  <NCode
                    :code="fmt.regex"
                    language="regex"
                    style="font-size: 11px; margin: 6px 0;"
                  />

                  <NSpace :size="6">
                    <NTag
                      v-for="pattern in fmt.file_patterns"
                      :key="pattern"
                      size="small"
                      :bordered="false"
                    >
                      {{ pattern }}
                    </NTag>
                    <NTag
                      v-if="fmt.timestamp_format"
                      size="small"
                      :bordered="false"
                      type="info"
                    >
                      {{ fmt.timestamp_format }}
                    </NTag>
                  </NSpace>
                </div>
              </template>

              <NDivider style="margin: 16px 0;" />

              <!-- Add new format -->
              <NText depth="3" style="font-size: 12px; display: block; margin-bottom: 8px;">
                Add Format
              </NText>
              <NSpace vertical :size="8">
                <NInput
                  v-model:value="newFormatName"
                  placeholder="Format name (e.g. my_app)"
                  size="small"
                />
                <NInput
                  v-model:value="newFormatRegex"
                  placeholder="Regex with (?P<name>...) groups"
                  size="small"
                  type="textarea"
                  :autosize="{ minRows: 2, maxRows: 4 }"
                />
                <NInputGroup>
                  <NInput
                    v-model:value="newFormatTimestamp"
                    placeholder="Timestamp format (optional)"
                    size="small"
                  />
                  <NInput
                    v-model:value="newFormatPatterns"
                    placeholder="File patterns, comma-separated"
                    size="small"
                  />
                </NInputGroup>
                <NButton
                  size="small"
                  :disabled="!newFormatName.trim() || !newFormatRegex.trim()"
                  @click="addNewFormat"
                >
                  <template #icon>
                    <PhPlus :size="14" />
                  </template>
                  Add
                </NButton>
              </NSpace>

              <NDivider style="margin: 16px 0;" />

              <NButton
                type="primary"
                size="small"
                :loading="saving"
                :disabled="!hasFormats"
                @click="saveConfig"
              >
                <template #icon>
                  <PhFloppyDisk :size="14" />
                </template>
                Save to .logler/formats.yaml
              </NButton>
            </div>
          </NTabPane>

          <!-- Built-in Library Tab -->
          <NTabPane name="builtin" tab="Built-in Library">
            <template #tab>
              <PhBookOpen :size="14" style="margin-right: 4px;" />
              Built-in Library
            </template>

            <div class="tab-content">
              <NText depth="3" style="font-size: 12px; display: block; margin-bottom: 12px;">
                Pre-defined formats for common log types. Click "Use" to add to your config.
              </NText>

              <NScrollbar style="max-height: calc(100vh - 200px);">
                <NCollapse>
                  <NCollapseItem
                    v-for="(fmt, name) in builtinFormats"
                    :key="name"
                    :name="name"
                    :title="(name as string).replace(/_/g, ' ')"
                  >
                    <NCode
                      :code="fmt.regex"
                      language="regex"
                      style="font-size: 11px; margin-bottom: 8px;"
                    />
                    <NSpace :size="6" style="margin-bottom: 8px;">
                      <NTag
                        v-for="pattern in fmt.file_patterns"
                        :key="pattern"
                        size="small"
                        :bordered="false"
                      >
                        {{ pattern }}
                      </NTag>
                      <NTag
                        v-if="fmt.timestamp_format"
                        size="small"
                        :bordered="false"
                        type="info"
                      >
                        {{ fmt.timestamp_format }}
                      </NTag>
                    </NSpace>
                    <NSpace :size="8">
                      <NButton
                        size="tiny"
                        @click="useBuiltin(name as string)"
                      >
                        <template #icon>
                          <PhPlus :size="14" />
                        </template>
                        Use
                      </NButton>
                      <NButton
                        size="tiny"
                        quaternary
                        @click="copyToTest(fmt.regex)"
                      >
                        <template #icon>
                          <PhTestTube :size="14" />
                        </template>
                        Test
                      </NButton>
                      <NButton
                        size="tiny"
                        quaternary
                        @click="copyRegex(fmt.regex, name as string)"
                      >
                        <template #icon>
                          <component
                            :is="copiedFormat === name ? PhCheck : PhCopy"
                            :size="14"
                          />
                        </template>
                        {{ copiedFormat === name ? 'Copied' : 'Copy' }}
                      </NButton>
                    </NSpace>
                  </NCollapseItem>
                </NCollapse>
              </NScrollbar>

              <NEmpty
                v-if="builtinLoaded && Object.keys(builtinFormats).length === 0"
                description="No built-in formats available"
              />
            </div>
          </NTabPane>

          <!-- Regex Tester Tab -->
          <NTabPane name="test" tab="Regex Tester">
            <template #tab>
              <PhTestTube :size="14" style="margin-right: 4px;" />
              Regex Tester
            </template>

            <div class="tab-content">
              <NSpace vertical :size="12">
                <div>
                  <NText depth="3" style="font-size: 12px; display: block; margin-bottom: 4px;">
                    Regex Pattern (must use named groups)
                  </NText>
                  <NInput
                    v-model:value="testRegex"
                    type="textarea"
                    placeholder="(?P<timestamp>\d{4}-\d{2}-\d{2}) (?P<level>\w+) (?P<message>.*)"
                    :autosize="{ minRows: 2, maxRows: 5 }"
                    size="small"
                  />
                </div>

                <div>
                  <NText depth="3" style="font-size: 12px; display: block; margin-bottom: 4px;">
                    Sample Log Lines (one per line)
                  </NText>
                  <NInput
                    v-model:value="testSampleLines"
                    type="textarea"
                    placeholder="Paste sample log lines here..."
                    :autosize="{ minRows: 4, maxRows: 10 }"
                    size="small"
                  />
                </div>

                <NButton
                  type="primary"
                  size="small"
                  :loading="testing"
                  :disabled="!testRegex.trim()"
                  @click="runTest"
                >
                  <template #icon>
                    <PhTestTube :size="14" />
                  </template>
                  Test Regex
                </NButton>

                <NAlert
                  v-if="testError"
                  type="error"
                  :title="testError"
                  closable
                  @close="testError = null"
                />

                <!-- Results -->
                <template v-if="testResults.length > 0">
                  <NText depth="3" style="font-size: 12px;">
                    Named groups: {{ testNamedGroups.join(', ') }}
                  </NText>

                  <NScrollbar style="max-height: 400px;">
                    <div
                      v-for="(result, i) in testResults"
                      :key="i"
                      class="test-result"
                      :class="{ matched: result.matched }"
                    >
                      <div class="test-result-header">
                        <NTag
                          :type="result.matched ? 'success' : 'error'"
                          size="small"
                          :bordered="false"
                        >
                          {{ result.matched ? 'Match' : 'No match' }}
                        </NTag>
                        <NText depth="3" style="font-size: 11px; font-family: var(--font-mono);">
                          {{ result.line.substring(0, 80) }}{{ result.line.length > 80 ? '...' : '' }}
                        </NText>
                      </div>
                      <div v-if="result.matched" class="test-result-groups">
                        <NTag
                          v-for="(value, key) in result.groups"
                          :key="key"
                          size="small"
                          :bordered="false"
                          style="margin: 2px;"
                        >
                          <NText depth="3" style="font-size: 10px;">{{ key }}:</NText>
                          {{ value }}
                        </NTag>
                      </div>
                    </div>
                  </NScrollbar>
                </template>
              </NSpace>
            </div>
          </NTabPane>
        </NTabs>
      </NSpin>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.tab-content {
  padding: 8px 0;
}

.format-card {
  padding: 10px 12px;
  border-radius: 5px;
  background: v-bind('ds.color.mode.dark.surface2');
  margin-bottom: 8px;
}

.format-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.test-result {
  padding: 8px 10px;
  border-radius: 3px;
  background: v-bind('ds.color.mode.dark.surface2');
  margin-bottom: 6px;
  border-left: 3px solid v-bind('ds.color.semantic.error');
}

.test-result.matched {
  border-left-color: v-bind('ds.color.semantic.success');
}

.test-result-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.test-result-groups {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid v-bind('ds.color.mode.dark.divider');
}
</style>
