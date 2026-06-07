<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="sheet-overlay" @click="$emit('close')"></div>
    </Transition>
    <div
      ref="panelRef"
      class="sheet-panel"
      :class="{ open: open && !dragging }"
      :style="dragging ? { transform: `translateY(${dragY}px)` } : {}"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend="onTouchEnd"
    >
      <div class="flex justify-center pt-3 pb-2">
        <div class="w-10 h-1 rounded-full bg-warm"></div>
      </div>
      <slot></slot>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

defineProps({ open: Boolean })
defineEmits(['close'])

const panelRef = ref(null)
const dragging = ref(false)
const dragY = ref(0)
let startY = 0
let currentY = 0

function onTouchStart(e) {
  startY = e.touches[0].clientY
  currentY = 0
  dragging.value = true
}

function onTouchMove(e) {
  currentY = e.touches[0].clientY - startY
  if (currentY > 0) {
    dragY.value = currentY
  }
}

function onTouchEnd() {
  dragging.value = false
  if (currentY > 120) {
    dragY.value = 0
    // close handled by parent
  }
  dragY.value = 0
  currentY = 0
}
</script>

<style scoped>
.sheet-enter-active { transition: opacity 0.3s ease; }
.sheet-leave-active { transition: opacity 0.25s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
</style>
