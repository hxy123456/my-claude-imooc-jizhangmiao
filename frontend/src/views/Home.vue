<template>
  <div class="px-5 pt-2 pb-4">
    <!-- Header -->
    <div class="flex items-center mb-6">
      <div>
        <h1 class="text-2xl font-display text-bark">记账喵</h1>
        <p class="text-xs text-clay/50 mt-0.5 tracking-wide">轻松记录每一笔</p>
      </div>
    </div>

    <!-- Monthly Overview Card -->
    <div class="bg-gradient-to-br from-bark to-clay rounded-3xl p-5 mb-5 shadow-lg shadow-bark/15 fade-in-up">
      <div class="flex items-center justify-between mb-4">
        <span class="text-cream/60 text-xs font-medium tracking-wider uppercase">{{ monthLabel }}</span>
        <div class="w-2 h-2 rounded-full bg-mint animate-pulse"></div>
      </div>
      <div class="grid grid-cols-3 gap-3">
        <div>
          <div class="text-cream/50 text-[10px] mb-1">支出</div>
          <div class="text-cream font-mono font-semibold text-lg">¥{{ formatMoney(stats.totalExpense) }}</div>
        </div>
        <div>
          <div class="text-cream/50 text-[10px] mb-1">收入</div>
          <div class="text-mint font-mono font-semibold text-lg">¥{{ formatMoney(stats.totalIncome) }}</div>
        </div>
        <div>
          <div class="text-cream/50 text-[10px] mb-1">结余</div>
          <div
            class="font-mono font-semibold text-lg"
            :class="stats.balance >= 0 ? 'text-honey' : 'text-coral'"
          >¥{{ formatMoney(Math.abs(stats.balance)) }}</div>
        </div>
      </div>
    </div>

    <!-- 分类支出（本月支出最多的 3 个分类） -->
    <div class="mb-4 fade-in-up stagger-1">
      <div class="flex items-center gap-2 mb-3">
        <div class="w-8 h-8 rounded-lg bg-peach/15 flex items-center justify-center text-sm">📊</div>
        <span class="text-sm text-clay font-medium">分类支出</span>
        <span class="text-[10px] text-clay/40 ml-auto">本月 TOP 3</span>
      </div>

      <div v-if="topCategories.length" class="bg-white/60 backdrop-blur-sm rounded-3xl shadow-lg shadow-bark/5 overflow-hidden">
        <template v-for="(c, idx) in topCategories" :key="c.catId">
          <div class="flex items-center gap-3 px-4 py-3.5">
            <!-- Icon -->
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm"
              :style="{ background: c.bgColor }"
            >{{ c.icon }}</div>
            <!-- 名称 + 占比 -->
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-bark truncate">{{ c.name }}</div>
              <div class="text-[10px] text-clay/40 mt-0.5">占比 {{ c.percent }}%</div>
            </div>
            <!-- 金额 -->
            <div class="font-mono font-semibold text-coral text-sm shrink-0">
              ¥{{ formatMoney(c.amount) }}
            </div>
          </div>
          <div v-if="idx < topCategories.length - 1" class="h-px bg-sand/60 mx-4"></div>
        </template>
      </div>

      <div v-else class="bg-white/60 backdrop-blur-sm rounded-3xl p-8 text-center shadow-lg shadow-bark/5">
        <div class="text-4xl mb-2">📊</div>
        <div class="text-sm text-clay/50">本月还没有支出</div>
        <div class="text-[10px] text-clay/40 mt-1.5">记一笔看看花在哪里最多</div>
      </div>
    </div>

    <!-- 最近记录 -->
    <div class="mb-4 fade-in-up stagger-2">
      <div class="flex items-center gap-2 mb-3">
        <div class="w-8 h-8 rounded-lg bg-peach/15 flex items-center justify-center text-sm">📋</div>
        <span class="text-sm text-clay font-medium">最近记录</span>
        <button
          v-if="store.recentRecords.length"
          @click="router.push('/bills')"
          class="text-[10px] text-coral font-medium active:opacity-70 ml-auto"
        >查看全部 →</button>
      </div>

      <div v-if="!store.recentRecords.length" class="bg-white/60 backdrop-blur-sm rounded-3xl p-8 text-center shadow-lg shadow-bark/5">
        <div class="text-4xl mb-2">🐱</div>
        <div class="text-sm text-clay/50">还没有记录，记一笔吧~</div>
        <div class="text-[10px] text-clay/40 mt-1.5">点底部 ➕ 开始记账</div>
      </div>

      <div v-else class="bg-white/60 backdrop-blur-sm rounded-3xl shadow-lg shadow-bark/5 overflow-hidden">
        <template v-for="(record, idx) in store.recentRecords" :key="record.id">
          <RecordItem
            :record="enrichRecord(record)"
            class="rounded-none px-4 py-3.5"
            @click="$emit('editRecord', record)"
          />
          <div v-if="idx < store.recentRecords.length - 1" class="h-px bg-sand/60 mx-4"></div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import RecordItem from '../components/RecordItem.vue'
import { useRecordStore } from '../stores/records.js'
import { getCategoryName, getCategoryIcon, getCategoryById } from '../utils/categories.js'

const router = useRouter()
const store = useRecordStore()
defineEmits(['editRecord'])

const stats = computed(() => store.monthlyStats)

const monthLabel = computed(() => dayjs().format('YYYY年M月'))

function formatMoney(val) {
  return (val || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const topCategories = computed(() => {
  const map = stats.value.categoryMap || {}
  const total = stats.value.totalExpense || 0
  return Object.entries(map)
    .map(([catId, amount]) => {
      // 强制按 'expense' 查找分类 —— 收入分类不应出现在"分类支出"卡片里
      const cat = getCategoryById(catId, 'expense')
      // 兜底:catId 在支出树里查不到(说明后端又混了 income 进来),直接丢弃该项
      if (!cat) return null
      return {
        catId,
        amount,
        name: cat.name,
        icon: cat.icon,
        bgColor: cat.color + '22',
        percent: total > 0 ? ((amount / total) * 100).toFixed(0) : '0',
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
})

function enrichRecord(record) {
  return {
    ...record,
    categoryName: getCategoryName(record),
    icon: getCategoryIcon(record),
    dateShort: record.recordDate ? dayjs(record.recordDate).format('MM/DD') : '',
  }
}

// 关键：登录后跳转 /home 时显式从后端拉一次当前月聚合 + 最近记录
onMounted(() => {
  if (stats.value.month !== dayjs().format('YYYY-MM') || !stats.value.records) {
    store.init()
  }
})
</script>
