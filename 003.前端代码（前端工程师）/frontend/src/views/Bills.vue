<template>
  <div class="px-5 pt-2 pb-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-display text-bark">账单</h1>
      <div class="flex items-center space-x-2">
        <button
          @click="prevMonth"
          class="w-8 h-8 rounded-lg bg-sand flex items-center justify-center text-clay/60 text-sm active:scale-95 transition-transform"
        >‹</button>
        <span class="text-sm font-medium text-bark min-w-[5rem] text-center">{{ displayMonth }}</span>
        <button
          @click="nextMonth"
          class="w-8 h-8 rounded-lg bg-sand flex items-center justify-center text-sm active:scale-95 transition-transform"
          :class="isCurrentMonth ? 'text-clay/30 cursor-not-allowed' : 'text-clay/60'"
          :disabled="isCurrentMonth"
        >›</button>
      </div>
    </div>

    <!-- Search & Filter -->
    <div class="flex space-x-2 mb-4">
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
      <div class="flex flex-wrap -ml-2 -mt-2">
        <button
          @click="selectedFilter = ''"
          class="ml-2 mt-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          :class="!selectedFilter ? 'bg-bark text-cream' : 'bg-sand text-clay'"
        >全部</button>
        <button
          v-for="cat in allCategories"
          :key="cat.id"
          @click="selectedFilter = cat.id"
          class="ml-2 mt-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
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
          <div class="flex items-center space-x-2">
            <span class="text-sm font-medium text-bark">{{ formatDate(group.date) }}</span>
            <span class="text-[10px] text-clay/40">{{ getWeekday(group.date) }}</span>
          </div>
          <div class="flex space-x-3 text-[11px] font-mono">
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
            <!-- Delete button (behind record, revealed on swipe) -->
            <button
              type="button"
              class="absolute right-0 top-0 bottom-0 w-20 bg-coral flex items-center justify-center text-white text-sm font-semibold rounded-r-2xl"
              :class="swipeState.recordId === record.id && swipeState.locked ? '' : 'pointer-events-none'"
              @click.stop="askDelete(record)"
            >删除</button>
            <!-- Record foreground (slides left to reveal delete).
                 bg-sand 纯色不可透：保证删除按钮在未滑动时完全不可见
                 paddingRight 随滑动同步增长：金额文字始终保持原位，不与删除按钮重叠 -->
            <div
              class="relative bg-sand rounded-2xl select-none"
              :class="{ 'transition-all duration-200': !(swipeState.recordId === record.id && swipeState.dragging) }"
              :style="{
                transform: `translateX(${getSwipeOffset(record.id)}px)`,
                paddingRight: `${-getSwipeOffset(record.id)}px`,
              }"
              @touchstart="onSwipeStart($event, record)"
              @touchmove="onSwipeMove($event, record)"
              @touchend="onSwipeEnd($event, record)"
              @click="onRecordClick(record)"
            >
              <RecordItem
                :record="enrichRecord(record)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirm Modal(避免误滑直接删) -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showConfirm"
          class="fixed inset-0 z-50 flex items-center justify-center px-6"
          @click.self="cancelDelete"
        >
          <div class="absolute inset-0 bg-bark/40 backdrop-blur-sm"></div>
          <div class="relative w-full max-w-xs bg-cream rounded-3xl p-6 shadow-2xl shadow-bark/30 fade-in-up">
            <div class="text-center mb-5">
              <div class="text-4xl mb-2">🗑️</div>
              <h3 class="text-lg font-display text-bark">删除这条记录？</h3>
              <p class="text-xs text-clay/50 mt-1.5 leading-relaxed">
                删除后无法恢复<br/>请确认是否继续
              </p>
            </div>
            <div class="flex space-x-2">
              <button
                @click="cancelDelete"
                :disabled="deleting"
                class="flex-1 py-3 rounded-2xl bg-sand text-clay text-sm font-medium active:scale-[0.98] transition-transform disabled:opacity-50"
              >取消</button>
              <button
                @click="confirmDelete"
                :disabled="deleting"
                class="flex-1 py-3 rounded-2xl bg-coral text-white text-sm font-semibold active:scale-[0.98] transition-transform shadow-md shadow-coral/30 disabled:opacity-50"
              >
                <span v-if="deleting" class="inline-flex items-center space-x-1.5">
                  <span class="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  删除中
                </span>
                <span v-else>确认删除</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, reactive } from 'vue'
import dayjs from 'dayjs'
import RecordItem from '../components/RecordItem.vue'
import { useRecordStore } from '../stores/records.js'
import { getCategoryName, getCategoryIcon, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/categories.js'

const store = useRecordStore()
const emit = defineEmits(['editRecord', 'showToast'])

const keyword = ref('')
const showFilter = ref(false)
const selectedFilter = ref('')
const currentMonth = ref(dayjs().format('YYYY-MM'))

const displayMonth = computed(() => {
  const [y, m] = currentMonth.value.split('-')
  return `${y}年${Number(m)}月`
})

/** 当前月份是否已是本月（不允许再往后翻） */
const isCurrentMonth = computed(() => currentMonth.value === dayjs().format('YYYY-MM'))

/** 删除确认浮窗状态 */
const showConfirm = ref(false)
const pendingDelete = ref(null)   // 待删除的 record(完整对象,确认时直接 remove id)
const deleting = ref(false)

const allCategories = computed(() => [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])

function prevMonth() {
  currentMonth.value = dayjs(currentMonth.value).subtract(1, 'month').format('YYYY-MM')
  doSearch()
}

function nextMonth() {
  if (isCurrentMonth.value) return
  currentMonth.value = dayjs(currentMonth.value).add(1, 'month').format('YYYY-MM')
  doSearch()
}

/** 统一切换月份 / 筛选后的查询入口 */
function doSearch() {
  store.searchRecords({
    keyword: keyword.value,
    categoryId: selectedFilter.value,
    month: currentMonth.value,
  })
}

/** 进入 Bills 页：从后端拉一次（默认按当前月） */
onMounted(() => {
  doSearch()
})

const filteredRecords = computed(() => {
  let list = store.records
  if (keyword.value) {
    const kw = keyword.value.toLowerCase()
    list = list.filter(r => (r.note || '').toLowerCase().includes(kw))
  }
  if (selectedFilter.value) {
    list = list.filter(r =>
      r.categoryId === selectedFilter.value ||
      r.subCategoryId === selectedFilter.value
    )
  }
  return list
})

const groupedRecords = computed(() => {
  const map = {}
  for (const r of filteredRecords.value) {
    if (!map[r.recordDate]) map[r.recordDate] = { date: r.recordDate, records: [], dayExpense: 0, dayIncome: 0 }
    map[r.recordDate].records.push(r)
    if (r.type === 'expense') map[r.recordDate].dayExpense += Number(r.amount)
    else map[r.recordDate].dayIncome += Number(r.amount)
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
    doSearch()
  }, 300)
}

// 监听筛选变化立即重查
watch(selectedFilter, () => {
  doSearch()
})

// --------------- 滑动删除（reactive 集中管理，不写在 store 对象上） ---------------
const swipeState = reactive({
  recordId: null,   // 当前滑动的记录 id
  startX: 0,
  startY: 0,
  offset: 0,        // 当前偏移 -80~0
  locked: false,    // 滑过阈值后锁定露出删除按钮
  dragging: false,  // 已识别为横滑（禁用 CSS transition，跟手）
})

function getSwipeOffset(recordId) {
  if (swipeState.recordId === recordId) {
    if (swipeState.locked) return -80
    return swipeState.offset
  }
  return 0
}

/** 关闭所有滑开状态 */
function closeSwipe() {
  swipeState.recordId = null
  swipeState.offset = 0
  swipeState.locked = false
  swipeState.dragging = false
}

function onSwipeStart(e, record) {
  // 另一行已锁开 → 先关掉
  if (swipeState.locked && swipeState.recordId !== record.id) {
    closeSwipe()
  }
  swipeState.recordId = record.id
  swipeState.startX = e.touches[0].clientX
  swipeState.startY = e.touches[0].clientY
  swipeState.offset = 0
  swipeState.locked = false
  swipeState.dragging = false
}

function onSwipeMove(e, record) {
  if (swipeState.recordId !== record.id) return

  const dx = e.touches[0].clientX - swipeState.startX
  const dy = e.touches[0].clientY - swipeState.startY
  const adx = Math.abs(dx)
  const ady = Math.abs(dy)

  // 方向判定：横滑 ≥ 8px 且 水平 ≥ 垂直×0.7 → 拦截；垂直为主 → 放弃
  if (!swipeState.dragging) {
    if (adx > 8 && adx > ady * 0.7) {
      swipeState.dragging = true
    } else if (ady > 8 && ady > adx * 0.7) {
      closeSwipe()
      return
    } else {
      return
    }
  }

  // 已确认为横滑：阻止页面滚动，只允许左滑
  if (dx < 0) {
    e.preventDefault()
    swipeState.offset = Math.max(dx, -80)
  } else if (dx > 0 && swipeState.offset < 0) {
    swipeState.offset = Math.min(dx + swipeState.offset, 0)
  }
}

function onSwipeEnd(e, record) {
  if (swipeState.recordId !== record.id) return
  swipeState.dragging = false

  if (swipeState.offset < -40) {
    swipeState.locked = true
    swipeState.offset = -80
  } else {
    closeSwipe()
  }
}

/** 点击行：已滑开→关闭；否则→编辑 */
function onRecordClick(record) {
  if (swipeState.recordId === record.id && swipeState.locked) {
    closeSwipe()
    return
  }
  emit('editRecord', record)
}

/* -------------------- 删除确认(避免误滑直接删) -------------------- */

/** 用户点了删除按钮 —— 弹确认浮窗 */
function askDelete(record) {
  pendingDelete.value = record
  showConfirm.value = true
}

/** 取消删除 —— 关浮窗 + 复位滑动 */
function cancelDelete() {
  if (deleting.value) return
  closeSwipe()
  showConfirm.value = false
  pendingDelete.value = null
}

/** 确认删除 —— 调用 store,关浮窗,Toast */
async function confirmDelete() {
  if (deleting.value || !pendingDelete.value) return
  deleting.value = true
  const id = pendingDelete.value.id
  try {
    await store.remove(id)
    emit('showToast', '已删除')
  } catch (e) {
    emit('showToast', '删除失败,请重试')
  } finally {
    deleting.value = false
    showConfirm.value = false
    pendingDelete.value = null
    closeSwipe()
  }
}
</script>
