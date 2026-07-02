<template>
  <BottomSheet :open="open" @close="$emit('close')">
    <div class="px-5 pb-8">
      <div class="text-center mb-4">
        <div class="text-xs text-clay/60 mb-1 tracking-wider uppercase">编辑记录</div>
      </div>

      <!-- Type Toggle -->
      <div class="flex bg-sand rounded-xl p-1 mb-4">
        <button
          @click="form.type = 'expense'"
          class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
          :class="form.type === 'expense' ? 'bg-coral text-white shadow-sm' : 'text-clay'"
        >支出</button>
        <button
          @click="form.type = 'income'"
          class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
          :class="form.type === 'income' ? 'bg-mint text-white shadow-sm' : 'text-clay'"
        >收入</button>
      </div>

      <!-- Amount -->
      <div class="mb-4">
        <label class="text-xs text-clay/60 mb-1 block">金额</label>
        <div class="flex items-center bg-sand rounded-xl px-4 py-3">
          <span class="text-clay/40 text-lg font-mono mr-1">¥</span>
          <input
            v-model="form.amount"
            type="number"
            step="0.01"
            min="0"
            class="flex-1 bg-transparent text-xl font-mono font-semibold text-bark outline-none"
          />
        </div>
      </div>

      <!-- Category Grid -->
      <div class="mb-3">
        <label class="text-xs text-clay/60 mb-2 block">分类</label>
        <div class="grid grid-cols-5 gap-1">
          <div
            v-for="cat in currentCategories"
            :key="cat.id"
            class="category-chip"
            :class="{ selected: form.categoryId === cat.id }"
            @click="selectCategory(cat)"
          >
            <span class="text-2xl">{{ cat.icon }}</span>
            <span class="text-[10px] text-clay font-medium">{{ cat.name }}</span>
          </div>
        </div>
      </div>

      <!-- Sub Categories -->
      <div v-if="selectedCategory?.children?.length" class="mb-4">
        <div class="flex flex-wrap -ml-2 -mt-2">
          <button
            v-for="child in selectedCategory.children"
            :key="child.id"
            @click="form.subCategoryId = child.id"
            class="ml-2 mt-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
            :class="form.subCategoryId === child.id
              ? 'bg-bark text-cream'
              : 'bg-sand text-clay active:scale-95'"
          >{{ child.name }}</button>
        </div>
      </div>

      <!-- Note & Date -->
      <div class="flex space-x-3 mb-5">
        <div class="flex-1">
          <input
            v-model="form.note"
            type="text"
            placeholder="备注（可选）"
            maxlength="50"
            class="w-full px-3 py-2.5 bg-sand rounded-xl text-sm text-bark placeholder:text-clay/40 outline-none focus:ring-2 focus:ring-peach/40"
          />
        </div>
        <div>
          <input
            v-model="form.recordDate"
            type="date"
            class="px-3 py-2.5 bg-sand rounded-xl text-sm text-bark outline-none focus:ring-2 focus:ring-peach/40"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="flex space-x-3">
        <button
          @click="$emit('delete')"
          class="flex-1 py-3.5 rounded-2xl text-base font-semibold bg-coral/10 text-coral active:scale-[0.98] transition-all"
        >删除</button>
        <button
          @click="submit"
          :disabled="!canSubmit"
          class="flex-1 py-3.5 rounded-2xl text-base font-semibold transition-all active:scale-[0.98]"
          :class="canSubmit
            ? 'bg-bark text-cream shadow-lg shadow-bark/20'
            : 'bg-warm text-clay/50 cursor-not-allowed'"
        >保存</button>
      </div>
    </div>
  </BottomSheet>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BottomSheet from './BottomSheet.vue'
import { useCategoryStore } from '../stores/categories.js'

const props = defineProps({
  open: Boolean,
  record: Object,
})
const emit = defineEmits(['close', 'submit', 'delete'])

const form = ref({ amount: '', type: 'expense', categoryId: '', subCategoryId: '', note: '', recordDate: '' })

const categoryStore = useCategoryStore()

/**
 * 分类数据走 useCategoryStore,与 AddRecordSheet、设置页"分类管理"共用同一份数据源
 *  —— 系统内置 + 当前用户自定义子分类,后端已合并返回
 */
const currentCategories = computed(() =>
  form.value.type === 'expense' ? categoryStore.expenseList : categoryStore.incomeList
)

const selectedCategory = computed(() =>
  currentCategories.value.find(c => c.id === form.value.categoryId)
)

const canSubmit = computed(() =>
  form.value.amount && parseFloat(form.value.amount) > 0 && form.value.categoryId
)

watch(() => props.open, (val) => {
  if (val && props.record) {
    form.value = {
      amount: String(props.record.amount),
      type: props.record.type,
      categoryId: props.record.categoryId,
      subCategoryId: props.record.subCategoryId || '',
      note: props.record.note || '',
      recordDate: props.record.recordDate,
    }
    // 兜底:App.vue 未触发 init 时,弹层打开主动拉一次
    if (!categoryStore.expenseList.length && !categoryStore.incomeList.length) {
      categoryStore.initForUser()
    }
  }
})

watch(() => form.value.type, () => {
  form.value.categoryId = ''
  form.value.subCategoryId = ''
})

function selectCategory(cat) {
  form.value.categoryId = cat.id
  if (!cat.children.find(c => c.id === form.value.subCategoryId)) {
    form.value.subCategoryId = ''
  }
}

function submit() {
  if (!canSubmit.value) return
  emit('submit', {
    amount: parseFloat(form.value.amount),
    type: form.value.type,
    categoryId: form.value.categoryId,
    subCategoryId: form.value.subCategoryId,
    note: form.value.note,
    recordDate: form.value.recordDate,
  })
  emit('close')
}
</script>
