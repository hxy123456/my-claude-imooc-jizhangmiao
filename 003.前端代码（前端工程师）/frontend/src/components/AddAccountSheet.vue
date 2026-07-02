<template>
  <BottomSheet :open="open" @close="onClose">
    <div class="px-5 pb-8">
      <!-- Title -->
      <div class="text-center mb-5">
        <div class="text-3xl mb-2">{{ form.icon || '💳' }}</div>
        <h2 class="text-lg font-display text-bark">添加账户</h2>
        <p class="text-xs text-clay/50 mt-1">选个图标，再给账户起个名字</p>
      </div>

      <!-- Icon Picker -->
      <div class="mb-5">
        <div class="text-xs text-clay/60 mb-2 font-medium">选择图标</div>
        <div class="grid grid-cols-8 gap-2">
          <button
            v-for="ic in icons"
            :key="ic"
            @click="form.icon = ic"
            type="button"
            class="aspect-square rounded-xl flex items-center justify-center text-2xl transition-all duration-150 active:scale-90"
            :class="form.icon === ic
              ? 'bg-bark shadow-md scale-105'
              : 'bg-sand hover:bg-warm'"
          >{{ ic }}</button>
        </div>
      </div>

      <!-- Name Input -->
      <div class="mb-6">
        <label class="text-xs text-clay/60 mb-1.5 block font-medium">账户名称</label>
        <input
          v-model="form.name"
          type="text"
          maxlength="10"
          placeholder="如：工资卡 / 余额宝"
          class="w-full px-4 py-3 bg-sand rounded-xl text-sm text-bark placeholder:text-clay/40 outline-none focus:ring-2 focus:ring-peach/40 transition-all"
          @keyup.enter="onSave"
        />
        <div class="text-[10px] text-clay/40 mt-1.5 px-1 text-right">
          {{ (form.name || '').length }} / 10
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
import { ACCOUNT_ICONS } from '../stores/accounts.js'

const props = defineProps({ open: Boolean })
const emit = defineEmits(['close', 'save'])

const icons = ACCOUNT_ICONS

const form = ref({ name: '', icon: '💳' })

const canSave = computed(() => (form.value.name || '').trim().length > 0)

/** 弹窗打开时重置表单；关闭由 BottomSheet 触发父组件 */
watch(() => props.open, (val) => {
  if (val) {
    form.value = { name: '', icon: '💳' }
  }
})

function onClose() {
  emit('close')
}

function onSave() {
  if (!canSave.value) return
  emit('save', {
    name: form.value.name.trim(),
    icon: form.value.icon,
  })
}
</script>
