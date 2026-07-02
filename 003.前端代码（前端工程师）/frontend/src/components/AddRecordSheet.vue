<template>
  <BottomSheet :open="open" @close="$emit('close')">
    <div class="px-5 pb-8">
      <!-- Amount -->
      <div class="text-center mb-4">
        <div class="text-xs text-clay/60 mb-1 tracking-wider uppercase">金额</div>
        <div class="flex items-center justify-center space-x-1">
          <span class="text-clay/40 text-2xl font-mono">¥</span>
          <span class="text-3xl font-mono font-semibold text-bark tracking-tight">
            {{ displayAmount || '0' }}
          </span>
        </div>
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

      <!-- Category Grid -->
      <div class="mb-3">
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

      <!-- Number Keyboard -->
      <div class="num-keyboard mb-4">
        <button v-for="n in [1,2,3,4,5,6,7,8,9]" :key="n" class="num-key" @click="inputDigit(String(n))">{{ n }}</button>
        <button class="num-key" @click="inputDigit('.')">.</button>
        <button class="num-key" @click="inputDigit('0')">0</button>
        <button class="num-key !bg-coral/10 !text-coral font-semibold" @click="backspace">⌫</button>
      </div>

      <!-- Submit -->
      <button
        @click="submit"
        :disabled="!canSubmit"
        class="w-full py-3.5 rounded-2xl text-base font-semibold transition-all duration-200 active:scale-[0.98]"
        :class="canSubmit
          ? 'bg-bark text-cream shadow-lg shadow-bark/20'
          : 'bg-warm text-clay/50 cursor-not-allowed'"
      >确认记录</button>
    </div>
  </BottomSheet>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'
import BottomSheet from './BottomSheet.vue'
import { useCategoryStore } from '../stores/categories.js'

const props = defineProps({ open: Boolean })
const emit = defineEmits(['close', 'submit'])

const form = ref({
  amount: '',
  type: 'expense',
  categoryId: '',
  subCategoryId: '',
  note: '',
  recordDate: dayjs().format('YYYY-MM-DD'),
})

const categoryStore = useCategoryStore()

/**
 * 分类数据走 useCategoryStore,和设置页"分类管理"共用同一份数据源:
 *   - 系统内置分类(由后端 seed) + 当前用户自定义子分类(后端按 user_id 隔离)
 *   - App.vue 登录态建立后会调用 categoryStore.initForUser() 预拉一次
 *   - 这里再加一道兜底:store 为空时主动拉(深链 / 首次安装直开弹层)
 */
const currentCategories = computed(() =>
  form.value.type === 'expense' ? categoryStore.expenseList : categoryStore.incomeList
)

const selectedCategory = computed(() =>
  currentCategories.value.find(c => c.id === form.value.categoryId)
)

const displayAmount = computed(() => form.value.amount || '0')

const canSubmit = computed(() =>
  form.value.amount && parseFloat(form.value.amount) > 0 && form.value.categoryId
)

watch(() => form.value.type, () => {
  form.value.categoryId = ''
  form.value.subCategoryId = ''
})

watch(() => props.open, (val) => {
  if (val) {
    form.value = {
      amount: '',
      type: 'expense',
      categoryId: '',
      subCategoryId: '',
      note: '',
      recordDate: dayjs().format('YYYY-MM-DD'),
    }
    // 兜底:App.vue 未触发 init(深链 / 异常场景)时,弹层打开时主动拉一次
    if (!categoryStore.expenseList.length && !categoryStore.incomeList.length) {
      categoryStore.initForUser()
    }
  }
})

function selectCategory(cat) {
  form.value.categoryId = cat.id
  if (!cat.children.find(c => c.id === form.value.subCategoryId)) {
    form.value.subCategoryId = ''
  }
}

function inputDigit(d) {
  const current = form.value.amount
  if (d === '.' && current.includes('.')) return
  if (current.includes('.') && current.split('.')[1].length >= 2) return
  if (current.length >= 10) return
  form.value.amount = current + d
}

function backspace() {
  form.value.amount = form.value.amount.slice(0, -1)
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
