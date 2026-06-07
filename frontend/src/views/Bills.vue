<template>
  <div class="px-5 pt-2 pb-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-display text-bark">账单</h1>
      <span class="text-xs text-clay/50">{{ store.records.length }} 条记录</span>
    </div>

    <!-- Search & Filter -->
    <div class="flex gap-2 mb-4">
      <div class="flex-1 relative">
        <input
          v-model="keyword"
          type="text"
          placeholder="搜索备注..."
          class="w-full pl-9 pr-3 py-2.5 bg-sand rounded-xl text-sm text-bark placeholder:text-clay/40 outline-none focus:ring-2 focus:ring-peach/40"
          @input="onSearch"
        />
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-clay/40 text-sm">🔍</span>
      </div>
      <button
        @click="showFilter = !showFilter"
        class="px-3 py-2.5 bg-sand rounded-xl text-sm active:scale-95 transition-transform"
        :class="selectedFilter ? 'text-coral' : 'text-clay/60'"
      >{{ selectedFilter ? '✕' : '筛选' }}</button>
    </div>

    <!-- Filter Bar -->
    <div v-if="showFilter" class="mb-4 fade-in-up">
      <div class="flex flex-wrap gap-2">
        <button
          @click="selectedFilter = ''"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          :class="!selectedFilter ? 'bg-bark text-cream' : 'bg-sand text-clay'"
        >全部</button>
        <button
          v-for="cat in allCategories"
          :key="cat.id"
          @click="selectedFilter = cat.id"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          :class="selectedFilter === cat.id ? 'bg-bark text-cream' : 'bg-sand text-clay'"
        >{{ cat.icon }} {{ cat.name }}</button>
      </div>
    </div>

    <!-- Records by Date -->
    <div v-if="!groupedRecords.length" class="text-center py-12">
      <div class="text-4xl mb-2">📭</div>
      <div class="text-sm text-clay/50">暂无记录</div>
    </div>

    <div v-else class="space-y-5">
      <div v-for="group in groupedRecords" :key="group.date" class="fade-in-up">
        <!-- Date Header -->
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-bark">{{ formatDate(group.date) }}</span>
            <span class="text-[10px] text-clay/40">{{ getWeekday(group.date) }}</span>
          </div>
          <div class="flex gap-3 text-[11px] font-mono">
            <span v-if="group.dayExpense" class="text-coral">-¥{{ group.dayExpense.toFixed(2) }}</span>
            <span v-if="group.dayIncome" class="text-mint">+¥{{ group.dayIncome.toFixed(2) }}</span>
          </div>
        </div>

        <!-- Records -->
        <div class="space-y-1">
          <div
            v-for="record in group.records"
            :key="record.id"
            class="relative overflow-hidden rounded-2xl"
          >
            <!-- Delete background -->
            <div
              class="absolute right-0 top-0 bottom-0 w-20 bg-coral flex items-center justify-center text-white text-sm font-semibold rounded-r-2xl"
              :style="{ transform: `translateX(${record._deleteX || 0}px)` }"
            >
              删除
            </div>
            <!-- Record foreground -->
            <div
              class="relative bg-sand/50 rounded-2xl transition-transform"
              :style="{ transform: `translateX(${record._slideX || 0}px)` }"
              @touchstart.passive="onSlideStart($event, record)"
              @touchmove.passive="onSlideMove($event, record)"
              @touchend="onSlideEnd($event, record)"
            >
              <RecordItem
                :record="enrichRecord(record)"
                :hasSlideDelete="true"
                @click="$emit('editRecord', record)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'
import RecordItem from '../components/RecordItem.vue'
import { useRecordStore } from '../stores/records.js'
import { getCategoryName, getCategoryIcon, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/categories.js'

const store = useRecordStore()
defineEmits(['editRecord'])

const keyword = ref('')
const showFilter = ref(false)
const selectedFilter = ref('')

const allCategories = computed(() => [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])

const filteredRecords = computed(() => {
  let list = store.records
  if (keyword.value) {
    const kw = keyword.value.toLowerCase()
    list = list.filter(r => r.note.toLowerCase().includes(kw))
  }
  if (selectedFilter.value) {
    list = list.filter(r => r.categoryId === selectedFilter.value)
  }
  return list
})

const groupedRecords = computed(() => {
  const map = {}
  for (const r of filteredRecords.value) {
    if (!map[r.recordDate]) map[r.recordDate] = { date: r.recordDate, records: [], dayExpense: 0, dayIncome: 0 }
    map[r.recordDate].records.push(r)
    if (r.type === 'expense') map[r.recordDate].dayExpense += r.amount
    else map[r.recordDate].dayIncome += r.amount
  }
  return Object.values(map).sort((a, b) => b.date.localeCompare(a.date))
})

function formatDate(dateStr) {
  const d = dayjs(dateStr)
  const today = dayjs().format('YYYY-MM-DD')
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
  if (dateStr === today) return '今天'
  if (dateStr === yesterday) return '昨天'
  return d.format('M月D日')
}

function getWeekday(dateStr) {
  return dayjs(dateStr).format('ddd')
}

function enrichRecord(record) {
  return {
    ...record,
    categoryName: getCategoryName(record),
    icon: getCategoryIcon(record),
  }
}

let searchTimer = null
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    store.searchRecords({ keyword: keyword.value, categoryId: selectedFilter.value })
  }, 300)
}

// Slide to delete
let slideStartX = 0
let slideRecord = null

function onSlideStart(e, record) {
  slideStartX = e.touches[0].clientX
  slideRecord = record
}

function onSlideMove(e, record) {
  const dx = e.touches[0].clientX - slideStartX
  if (dx < 0) {
    record._slideX = Math.max(dx, -80)
  }
}

function onSlideEnd(e, record) {
  if (record._slideX < -40) {
    store.remove(record.id)
  }
  record._slideX = 0
  slideRecord = null
}
</script>
