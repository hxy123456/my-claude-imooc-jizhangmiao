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
            <!-- Delete background (滑到阈值后变可点 button,点了才弹确认浮窗) -->
            <button
              type="button"
              class="absolute right-0 top-0 bottom-0 w-20 bg-coral flex items-center justify-center text-white text-sm font-semibold rounded-r-2xl transition-opacity cursor-pointer z-10"
              :class="(record._slideX && record._slideX < -10) ? 'opacity-100' : 'opacity-0 pointer-events-none'"
              :style="{ transform: `translateX(${record._deleteX || 0}px)` }"
              @click="askDelete(record)"
            >删除</button>
            <!-- Record foreground -->
            <div
              class="relative z-0 bg-sand/50 rounded-2xl transition-transform"
              :style="{
                transform: `translateX(${record._slideX || 0}px)`,
                // 金额默认靠右,只有删除按钮出现时(滑动超过 10px)才给右侧让出 90px
                paddingRight: `${(record._slideX && record._slideX < 0) ? Math.min(90, -record._slideX) : 0}px`,
              }"
              @touchstart.passive="onSlideStart($event, record)"
              @touchmove.passive="onSlideMove($event, record)"
              @touchend="onSlideEnd($event, record)"
            >
              <RecordItem
                :record="enrichRecord(record)"
                @click="$emit('editRecord', record)"
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
            <div class="flex gap-2">
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
                <span v-if="deleting" class="inline-flex items-center gap-1.5">
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
import { ref, computed, watch, onMounted } from 'vue'
import dayjs from 'dayjs'
import RecordItem from '../components/RecordItem.vue'
import { useRecordStore } from '../stores/records.js'
import { getCategoryName, getCategoryIcon, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/categories.js'

const store = useRecordStore()
const emit = defineEmits(['editRecord', 'showToast'])

const keyword = ref('')
const showFilter = ref(false)
const selectedFilter = ref('')

/** 删除确认浮窗状态 */
const showConfirm = ref(false)
const pendingDelete = ref(null)   // 待删除的 record(完整对象,确认时直接 remove id)
const deleting = ref(false)

const allCategories = computed(() => [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])

/** 进入 Bills 页：从后端拉一次（默认按当前月） */
onMounted(() => {
  const month = dayjs().format('YYYY-MM')
  store.searchRecords({ month })
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
    const month = dayjs().format('YYYY-MM')
    store.searchRecords({ keyword: keyword.value, categoryId: selectedFilter.value, month })
  }, 300)
}

// 监听筛选变化立即重查
watch(selectedFilter, () => {
  const month = dayjs().format('YYYY-MM')
  store.searchRecords({ keyword: keyword.value, categoryId: selectedFilter.value, month })
})

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
  // 旧逻辑:滑过 -40 直接 store.remove —— 已废弃
  // 新逻辑:滑够阈值就停在 -80,让删除按钮完全可见可点;
  //        没滑够就把行复位(回弹)
  if (record._slideX < -40) {
    record._slideX = -80  // 停在最大位移,删除按钮 100% 可见
  } else {
    record._slideX = 0
  }
  slideRecord = null
}

/* -------------------- 删除确认(避免误滑直接删) -------------------- */

/** 用户点了删除按钮 —— 弹确认浮窗 */
function askDelete(record) {
  pendingDelete.value = record
  showConfirm.value = true
}

/** 取消删除 —— 关浮窗 + 把行复位(回弹) */
function cancelDelete() {
  if (deleting.value) return
  if (pendingDelete.value) {
    pendingDelete.value._slideX = 0
  }
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
  }
}
</script>
