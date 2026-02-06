<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart, ScatterChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
  MarkPointComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { MetricsExtractResponse } from '@/api/types'
import { ds } from '@/design/tokens'

use([
  LineChart,
  ScatterChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
  MarkPointComponent,
  CanvasRenderer,
])

const props = defineProps<{
  data: MetricsExtractResponse
  selectedFields: string[]
}>()

const chartOption = computed(() => {
  const series: any[] = []
  const legend: string[] = []
  const fieldColors = [
    ds.color.palette.neonCyan,
    ds.color.palette.acidGreen,
    ds.color.palette.amber,
    ds.color.palette.violet,
    ds.color.palette.neonMagenta,
  ]

  props.selectedFields.forEach((fieldName, idx) => {
    const fieldData = props.data.fields[fieldName]
    if (!fieldData) return

    const color = fieldColors[idx % fieldColors.length]
    legend.push(fieldName)

    if (fieldData.buckets && fieldData.buckets.length > 0) {
      // Bucketed view: line chart with avg values
      const lineData = fieldData.buckets.map(b => [b.start, b.avg])
      series.push({
        name: fieldName,
        type: 'line',
        data: lineData,
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { color, width: 2 },
        itemStyle: { color },
        areaStyle: { color, opacity: 0.08 },
      })

      // Add anomaly markers as scatter points
      if (fieldData.anomalies.length > 0) {
        const anomalyData = fieldData.anomalies
          .filter(a => a.timestamp)
          .map(a => ({
            value: [a.timestamp, a.value],
            name: `z=${a.z_score.toFixed(1)}`,
          }))

        if (anomalyData.length > 0) {
          series.push({
            name: `${fieldName} anomalies`,
            type: 'scatter',
            data: anomalyData,
            symbolSize: 10,
            itemStyle: { color: ds.color.palette.neonRed },
            z: 10,
          })
          legend.push(`${fieldName} anomalies`)
        }
      }
    }
  })

  return {
    backgroundColor: 'transparent',
    legend: {
      data: legend,
      textStyle: { color: ds.color.mode.dark.text2 },
      top: 4,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: ds.color.palette.panel2,
      borderColor: ds.color.mode.dark.border,
      textStyle: { color: ds.color.mode.dark.text1 },
    },
    grid: {
      left: 60,
      right: 20,
      top: 40,
      bottom: 60,
    },
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: ds.color.mode.dark.border } },
      axisLabel: { color: ds.color.mode.dark.text3 },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: ds.color.mode.dark.border } },
      axisLabel: { color: ds.color.mode.dark.text3 },
      splitLine: { lineStyle: { color: ds.color.mode.dark.border, opacity: 0.3 } },
    },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      {
        type: 'slider',
        start: 0,
        end: 100,
        height: 20,
        bottom: 10,
        borderColor: ds.color.mode.dark.border,
        textStyle: { color: ds.color.mode.dark.text3 },
      },
    ],
    series,
  }
})
</script>

<template>
  <div class="metrics-chart">
    <VChart
      :option="chartOption"
      autoresize
      style="height: 100%; min-height: 300px;"
    />
  </div>
</template>

<style scoped>
.metrics-chart {
  height: 400px;
  padding: 8px 16px;
}
</style>
