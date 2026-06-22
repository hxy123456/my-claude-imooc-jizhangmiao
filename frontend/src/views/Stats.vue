<template>
  <div class="px-5 pt-2 pb-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <h1 class="text-xl font-display text-bark">统计</h1>
      <div class="flex items-center gap-2">
        <button @click="prevMonth" class="w-8 h-8 rounded-lg bg-sand flex items-center justify-center text-clay/60 text-sm active:scale-95 transition-transform">‹</button>
        <span class="text-sm font-medium text-bark min-w-[5rem] text-center">{{ displayMonth }}</span>
        <button @click="nextMonth" class="w-8 h-8 rounded-lg bg-sand flex items-center justify-center text-clay/60 text-sm active:scale-95 transition-transform">›</button>
      </div>
    </div>

    <!-- Monthly Overview -->
    <div class="grid grid-cols-3 gap-3 mb-5 fade-in-up">
      <div class="bg-sand rounded-2xl p-3 text-center">
        <div class="text-[10px] text-clay/50 mb-1">支出</div>
        <div class="font-mono font-semibold text-bark text-sm">¥{{ formatMoney(stats.totalExpense) }}</div>
      </div>
      <div class="bg-sand rounded-2xl p-3 text-center">
        <div class="text-[10px] text-clay/50 mb-1">收入</div>
        <div class="font-mono font-semibold text-mint text-sm">¥{{ formatMoney(stats.totalIncome) }}</div>
      </div>
      <div class="bg-sand rounded-2xl p-3 text-center">
        <div class="text-[10px] text-clay/50 mb-1">结余</div>
        <div
          class="font-mono font-semibold text-sm"
          :class="stats.balance >= 0 ? 'text-bark' : 'text-coral'"
        >¥{{ formatMoney(stats.balance) }}</div>
      </div>
    </div>

    <!-- Category Pie Chart -->
    <div class="bg-sand/50 rounded-2xl p-4 mb-5 fade-in-up stagger-1">
      <div class="text-sm font-medium text-bark mb-3">分类占比</div>
      <div ref="pieChartRef" class="w-full h-48"></div>
      <!-- Category List -->
      <div class="mt-3 space-y-2">
        <div
          v-for="item in categoryRanking"
          :key="item.id"
          class="flex items-center gap-3"
        >
          <span class="text-lg">{{ item.icon }}</span>
          <span class="text-sm text-clay flex-1">{{ item.name }}</span>
          <div class="flex-1 h-1.5 bg-warm rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :style="{ width: item.percent + '%', background: item.color }"
            ></div>
          </div>
          <span class="text-xs font-mono text-bark w-16 text-right">¥{{ formatMoney(item.amount) }}</span>
        </div>
      </div>
    </div>

    <!-- Daily Trend Chart -->
    <div class="bg-sand/50 rounded-2xl p-4 mb-5 fade-in-up stagger-2">
      <div class="text-sm font-medium text-bark mb-3">日消费趋势</div>
      <div ref="barChartRef" class="w-full h-44"></div>
    </div>

    <!-- Category Ranking -->
    <div class="bg-sand/50 rounded-2xl p-4 fade-in-up stagger-3">
      <div class="text-sm font-medium text-bark mb-3">分类排行</div>
      <div class="space-y-3">
        <div
          v-for="(item, idx) in categoryRanking"
          :key="item.id"
          class="flex items-center gap-3"
        >
          <div
            class="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-semibold"
            :class="idx === 0 ? 'bg-coral text-white' : idx === 1 ? 'bg-peach text-white' : idx === 2 ? 'bg-honey text-bark' : 'bg-warm text-clay'"
          >{{ idx + 1 }}</div>
          <span class="text-lg">{{ item.icon }}</span>
          <span class="text-sm text-bark flex-1">{{ item.name }}</span>
          <span class="text-sm font-mono font-semibold text-bark">¥{{ formatMoney(item.amount) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import dayjs from 'dayjs'
import * as echarts from 'echarts/core'
import { PieChart, BarChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useRecordStore } from '../stores/records.js'
import { EXPENSE_CATEGORIES } from '../utils/categories.js'

echarts.use([PieChart, BarChart, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer])

const store = useRecordStore()

const pieChartRef = ref(null)
const barChartRef = ref(null)
let pieChart = null
let barChart = null

const currentMonth = ref(dayjs().format('YYYY-MM'))

const displayMonth = computed(() => {
  const [y, m] = currentMonth.value.split('-')
  return `${y}年${parseInt(m)}月`
})

const stats = computed(() => store.monthlyStats)

const categoryRanking = computed(() => {
  const map = stats.value.categoryMap || {}
  const items = Object.entries(map).map(([id, amount]) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.id === id)
    return {
      id,
      name: cat ? cat.name : id,
      icon: cat ? cat.icon : '📋',
      color: cat ? cat.color : '#AAAAAA',
      amount,
      percent: stats.value.totalExpense > 0 ? (amount / stats.value.totalExpense * 100) : 0,
    }
  })
  items.sort((a, b) => b.amount - a.amount)
  return items
})

function prevMonth() {
  currentMonth.value = dayjs(currentMonth.value).subtract(1, 'month').format('YYYY-MM')
  store.setMonth(currentMonth.value)
}

function nextMonth() {
  currentMonth.value = dayjs(currentMonth.value).add(1, 'month').format('YYYY-MM')
  store.setMonth(currentMonth.value)
}

function formatMoney(val) {
  return (val || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function renderPieChart() {
  if (!pieChartRef.value) return
  if (!pieChart) {
    pieChart = echarts.init(pieChartRef.value)
  }
  const data = categoryRanking.value.map(item => ({
    name: item.name,
    value: item.amount,
    itemStyle: { color: item.color },
  }))
  pieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: false,
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' } },
      data,
    }],
  }, true)
}

function renderBarChart() {
  if (!barChartRef.value) return
  if (!barChart) {
    barChart = echarts.init(barChartRef.value)
  }
  const [year, month] = currentMonth.value.split('-').map(Number)
  const daysInMonth = dayjs(currentMonth.value).daysInMonth()
  const dailyMap = stats.value.dailyMap || {}

  const xData = []
  const yData = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    xData.push(d)
    yData.push(dailyMap[dateStr] || 0)
  }

  barChart.setOption({
    tooltip: { trigger: 'axis', formatter: (p) => `${p[0].axisValue}日: ¥${p[0].value.toFixed(2)}` },
    grid: { left: 40, right: 10, top: 10, bottom: 24 },
    xAxis: { type: 'category', data: xData, axisLabel: { fontSize: 9, color: '#8B7355' }, axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { fontSize: 9, color: '#8B7355', formatter: '¥{value}' }, splitLine: { lineStyle: { color: '#E8DDD0', type: 'dashed' } } },
    series: [{
      type: 'bar',
      data: yData,
      barWidth: '60%',
      itemStyle: { color: '#E8654A', borderRadius: [3, 3, 0, 0] },
    }],
  }, true)
}

watch(() => stats.value, () => {
  nextTick(() => {
    renderPieChart()
    renderBarChart()
  })
}, { deep: true })

onMounted(() => {
  // 进入统计页：拉一次当前月聚合
  if (stats.value.month !== currentMonth.value) {
    store.setMonth(currentMonth.value)
  }
  nextTick(() => {
    renderPieChart()
    renderBarChart()
  })
  window.addEventListener('resize', () => {
    pieChart?.resize()
    barChart?.resize()
  })
})
</script>
