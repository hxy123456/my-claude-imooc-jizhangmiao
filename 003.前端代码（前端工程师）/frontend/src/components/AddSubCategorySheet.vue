<template>
  <BottomSheet :open="open" @close="onClose">
    <div class="px-5 pb-8">
      <!-- Title -->
      <div class="text-center mb-5">
        <div class="text-3xl mb-2">{{ parentIcon }}</div>
        <h2 class="text-lg font-display text-bark">添加子分类</h2>
        <p class="text-xs text-clay/50 mt-1">
          归属父类：<span class="font-medium" :style="{ color: parentColor }">{{ parentName }}</span>
        </p>
      </div>

      <!-- Name Input -->
      <div class="mb-6">
        <label class="text-xs text-clay/60 mb-1.5 block font-medium">子分类名称</label>
        <input
          v-model="form.name"
          type="text"
          maxlength="8"
          placeholder="如：宵夜 / 红包 / 加班餐"
          class="w-full px-4 py-3 bg-sand rounded-xl text-sm text-bark placeholder:text-clay/40 outline-none focus:ring-2 focus:ring-peach/40 transition-all"
          @keyup.enter="onSave"
        />
        <div class="text-[10px] text-clay/40 mt-1.5 px-1 text-right">
          {{ (form.name || '').length }} / 8
        </div>
      </div>

      <!-- Actions -->
      <div class="flex space-x-3">
        <button
          @click="onClose"
          type="button"
          class="flex-1 py-3.5 rounded-2xl bg-sand text-clay text-sm font-medium active:scale-[0.98] transition-transform"
        >取消</button>
        <button
          @click="onSave"
          :disabled="!canSave"
          type="button"
          class="flex-1 py-3.5 rounded-2xl text-sm font-semibold active:scale-[0.98] transition-all shadow-md"
          :class="canSave
            ? 'bg-bark text-cream shadow-bark/20'
            : 'bg-warm text-clay/50 cursor-not-allowed shadow-none'"
        >保存</button>
      </div>
    </div>
  </BottomSheet>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BottomSheet from './BottomSheet.vue'

const props = defineProps({
  open: Boolean,
  /** 父分类信息（用于显示在标题） */
  parent: { type: Object, default: () => null },
})
const emit = defineEmits(['close', 'save'])

const form = ref({ name: '' })

const canSave = computed(() => (form.value.name || '').trim().length > 0)

const parentName = computed(() => props.parent?.name || '')
const parentIcon = computed(() => props.parent?.icon || '🏷️')
const parentColor = computed(() => props.parent?.color || '#5C4A3A')

watch(() => props.open, (val) => {
  if (val) {
    form.value = { name: '' }
  }
})

function onClose() {
  emit('close')
}

function onSave() {
  if (!canSave.value) return
  emit('save', { name: form.value.name.trim() })
}
</script>
