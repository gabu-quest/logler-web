<script setup lang="ts">
import { NStatistic, NGrid, NGi, NTag } from 'naive-ui'
import type { MetricsFieldData } from '@/api/types'

const props = defineProps<{
  fieldName: string
  data: MetricsFieldData
}>()
</script>

<template>
  <div class="metrics-stats">
    <div class="stats-header">
      <span class="field-name">{{ props.fieldName }}</span>
      <NTag v-if="props.data.unit" size="small" :bordered="false" type="info">
        {{ props.data.unit }}
      </NTag>
      <NTag size="small" :bordered="false">
        {{ props.data.count }} samples
      </NTag>
      <NTag
        v-if="props.data.anomalies.length > 0"
        size="small"
        :bordered="false"
        type="warning"
      >
        {{ props.data.anomalies.length }} anomalies
      </NTag>
    </div>
    <NGrid :cols="7" :x-gap="12" :y-gap="8">
      <NGi>
        <NStatistic label="Min" :value="props.data.stats.min" />
      </NGi>
      <NGi>
        <NStatistic label="Max" :value="props.data.stats.max" />
      </NGi>
      <NGi>
        <NStatistic label="Mean" :value="Number(props.data.stats.mean.toFixed(2))" />
      </NGi>
      <NGi>
        <NStatistic label="Median" :value="Number(props.data.stats.median.toFixed(2))" />
      </NGi>
      <NGi>
        <NStatistic label="Stddev" :value="Number(props.data.stats.stddev.toFixed(2))" />
      </NGi>
      <NGi>
        <NStatistic label="P95" :value="Number(props.data.stats.p95.toFixed(2))" />
      </NGi>
      <NGi>
        <NStatistic label="P99" :value="Number(props.data.stats.p99.toFixed(2))" />
      </NGi>
    </NGrid>
  </div>
</template>

<style scoped>
.metrics-stats {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(230, 241, 255, 0.1);
}

.stats-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.field-name {
  font-weight: 600;
  font-size: 14px;
  color: #00e5ff;
}
</style>
