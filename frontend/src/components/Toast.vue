<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="visible"
        class="fixed top-16 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 rounded-full bg-bark text-cream text-sm font-medium shadow-lg shadow-bark/20 toast-enter"
      >
        {{ message }}
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  message: String,
  duration: { type: Number, default: 1500 },
})

const visible = ref(false)
let timer = null

watch(() => props.message, (val) => {
  if (val) {
    visible.value = true
    clearTimeout(timer)
    timer = setTimeout(() => { visible.value = false }, props.duration)
  }
})
</script>

<style scoped>
.toast-enter-active { transition: all 0.3s ease; }
.toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from { opacity: 0; transform: translate(-50%, -10px) scale(0.9); }
.toast-leave-to { opacity: 0; transform: translate(-50%, -10px) scale(0.9); }
</style>
