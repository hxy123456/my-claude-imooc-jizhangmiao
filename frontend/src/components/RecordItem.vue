<template>
  <div
    class="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-150 active:scale-[0.98]"
    :class="[showDelete ? '' : 'cursor-pointer', hasSlideDelete ? 'pr-[90px]' : '']"
    @click="!showDelete && $emit('click')"
  >
    <div
      class="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
      :style="{ background: bgColor }"
    >
      {{ record.icon }}
    </div>
    <div class="flex-1 min-w-0">
      <div class="text-sm font-medium text-bark truncate">{{ record.categoryName }}</div>
      <div v-if="record.note" class="text-xs text-clay/60 truncate mt-0.5">{{ record.note }}</div>
    </div>
    <div class="text-right shrink-0">
      <div
        class="text-sm font-semibold font-mono"
        :class="record.type === 'expense' ? 'text-coral' : 'text-mint'"
      >
        {{ record.type === 'expense' ? '-' : '+' }}¥{{ record.amount.toFixed(2) }}
      </div>
      <div
        v-if="record.dateShort"
        class="text-[10px] text-clay/40 mt-0.5 font-mono tracking-tight"
      >{{ record.dateShort }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getCategoryById } from '../utils/categories.js'

const props = defineProps({
  record: Object,
  showDelete: { type: Boolean, default: false },
  hasSlideDelete: { type: Boolean, default: false },
})

defineEmits(['click', 'delete'])

const bgColor = computed(() => {
  const cat = getCategoryById(props.record.categoryId, props.record.type)
  return cat ? cat.color + '18' : '#AAAAAA18'
})
</script>
