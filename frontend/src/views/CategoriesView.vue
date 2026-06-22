<template>
  <div class="px-5 pt-2 pb-4">
    <!-- Header -->
    <div class="flex items-center mb-5">
      <button
        @click="router.back()"
        class="w-9 h-9 rounded-xl bg-sand flex items-center justify-center text-clay/60 text-sm active:scale-95 transition-transform mr-3"
        title="返回"
      >←</button>
      <h1 class="text-2xl font-display text-bark flex-1">分类管理</h1>
    </div>

    <!-- Type Toggle -->
    <div class="flex bg-sand rounded-xl p-1 mb-5 fade-in-up">
      <button
        @click="activeType = 'expense'"
        class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
        :class="activeType === 'expense'
          ? 'bg-coral text-white shadow-sm'
          : 'text-clay'"
      >支出</button>
      <button
        @click="activeType = 'income'"
        class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
        :class="activeType === 'income'
          ? 'bg-mint text-white shadow-sm'
          : 'text-clay'"
      >收入</button>
    </div>

    <!-- Parent Category Cards -->
    <div class="space-y-3 fade-in-up stagger-1">
      <div
        v-for="p in currentList"
        :key="p.id"
        class="bg-white/60 backdrop-blur-sm rounded-3xl shadow-lg shadow-bark/5 overflow-hidden"
      >
        <!-- Parent Header -->
        <div class="flex items-center gap-3 px-5 py-3.5">
          <div
            class="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm"
            :style="{ background: tintFor(p.color) }"
          >{{ p.icon }}</div>
          <div class="flex-1">
            <div class="text-sm text-bark font-medium">{{ p.name }}</div>
            <div class="text-[10px] text-clay/40 mt-0.5">
              {{ p.children.length }} 个子分类
              <span v-if="customCountOf(p) > 0">· 自定义 {{ customCountOf(p) }}</span>
            </div>
          </div>
          <button
            @click="openAddSheet(p)"
            class="px-2.5 py-1 rounded-lg bg-bark text-cream text-[10px] font-semibold active:scale-95 transition-transform shadow-sm shadow-bark/20"
          >+ 子分类</button>
        </div>

        <!-- Sub Category Pills -->
        <div class="px-5 pb-4">
          <div v-if="p.children.length" class="flex flex-wrap gap-2">
            <div
              v-for="c in p.children"
              :key="c.id"
              class="inline-flex items-center justify-center gap-1.5 min-w-[64px] px-3 py-1.5 rounded-lg bg-sand text-xs"
              :class="c.isSystem ? 'text-clay' : 'text-bark font-medium'"
            >
              <span>{{ c.name }}</span>
              <button
                v-if="!c.isSystem"
                @click="onDeleteChild(p.id, c)"
                class="w-5 h-5 rounded-md flex items-center justify-center text-coral text-[10px] active:scale-90 transition-transform hover:bg-coral/10"
                title="删除自定义子分类"
              >✕</button>
            </div>
          </div>
          <div v-else class="text-[10px] text-clay/40 py-1">该父类暂无子分类</div>
        </div>
      </div>
    </div>

    <!-- Add Sub Category Sheet -->
    <AddSubCategorySheet
      :open="showSheet"
      :parent="activeParent"
      @close="closeSheet"
      @save="onSave"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCategoryStore } from '../stores/categories.js'
import AddSubCategorySheet from '../components/AddSubCategorySheet.vue'

const router = useRouter()
const categoryStore = useCategoryStore()

const activeType = ref('expense')
const showSheet = ref(false)
const activeParent = ref(null)

onMounted(() => {
  if (!categoryStore.expenseList.length && !categoryStore.incomeList.length) {
    categoryStore.initForUser()
  }
})

const currentList = computed(() =>
  activeType.value === 'expense' ? categoryStore.expenseList : categoryStore.incomeList
)

function customCountOf(p) {
  return p.children.filter(c => !c.isSystem).length
}

/** 把分类的 color 提亮 80% 当图标底色 */
function tintFor(hex) {
  if (!hex) return '#F5EDE3'
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  // 与 cream 调合（cream = #FFF8F0 = 255,248,240），按 85% 混合
  const mix = (c) => Math.round(c + (255 - c) * 0.85)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

function openAddSheet(parent) {
  activeParent.value = parent
  showSheet.value = true
}

function closeSheet() {
  showSheet.value = false
  activeParent.value = null
}

async function onSave({ name }) {
  if (!activeParent.value) return
  const created = await categoryStore.addChild(
    activeType.value,
    activeParent.value.id,
    name,
  )
  if (created) closeSheet()
}

async function onDeleteChild(_parentId, child) {
  await categoryStore.removeChild(activeType.value, child.id)
}
</script>
