<template>
  <div class="px-5 pt-2 pb-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-display text-bark">记账喵</h1>
        <p class="text-xs text-clay/50 mt-0.5 tracking-wide">轻松记录每一笔</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="$emit('logout')"
          class="w-9 h-9 rounded-xl bg-sand flex items-center justify-center text-clay/60 text-sm active:scale-95 transition-transform"
          title="退出登录"
        >🚪</button>
        <button class="w-9 h-9 rounded-xl bg-sand flex items-center justify-center text-clay/60 text-sm active:scale-95 transition-transform">
          ⚙️
        </button>
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

    <!-- Today -->
    <div class="flex items-center justify-between mb-4 fade-in-up stagger-1">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-peach/15 flex items-center justify-center text-sm">☀️</div>
        <span class="text-sm text-clay font-medium">今日支出</span>
      </div>
      <span class="font-mono font-semibold text-bark">¥{{ formatMoney(store.todayExpense) }}</span>
    </div>

    <!-- Recent Records -->
    <div class="fade-in-up stagger-2">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-medium text-bark">最近记录</span>
        <button
          v-if="store.recentRecords.length"
          @click="router.push('/bills')"
          class="text-xs text-coral font-medium active:opacity-70"
        >查看全部 →</button>
      </div>

      <div v-if="!store.recentRecords.length" class="text-center py-8">
        <div class="text-4xl mb-2">🐱</div>
        <div class="text-sm text-clay/50">还没有记录，记一笔吧~</div>
      </div>

      <div v-else class="space-y-2">
        <RecordItem
          v-for="record in store.recentRecords"
          :key="record.id"
          :record="enrichRecord(record)"
          @click="$emit('editRecord', record)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import RecordItem from '../components/RecordItem.vue'
import { useRecordStore } from '../stores/records.js'
import { getCategoryName, getCategoryIcon } from '../utils/categories.js'

const router = useRouter()
const store = useRecordStore()
defineEmits(['editRecord', 'logout'])

const stats = computed(() => store.monthlyStats)

const monthLabel = computed(() => dayjs().format('YYYY年M月'))

function formatMoney(val) {
  return (val || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function enrichRecord(record) {
  return {
    ...record,
    categoryName: getCategoryName(record),
    icon: getCategoryIcon(record),
  }
}
</script>
