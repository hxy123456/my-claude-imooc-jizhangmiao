<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="open"
        class="sheet-overlay"
        @click="$emit('close')"
        @touchstart.prevent="onOverlayTouch"
      ></div>
    </Transition>
    <div
      ref="panelRef"
      class="sheet-panel"
      :class="{ open: open && !dragging }"
      :style="dragging ? {
        transform: `translateY(${dragY}px) translateZ(0)`,
        '-webkit-transform': `translateY(${dragY}px) translateZ(0)`,
        transition: 'none',
      } : {}"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
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
import { ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps({ open: Boolean })
const emit = defineEmits(['close'])

const panelRef = ref(null)
const dragging = ref(false)
const dragY = ref(0)
let startY = 0
let currentY = 0
// 保存 body 滚动位置，关闭弹层时恢复（iOS position:fixed 会导致 scrollTop 归零）
let savedScrollY = 0

/** iOS 滚动锁定：弹层打开时阻止背景页面滚动 */
function lockBodyScroll() {
  savedScrollY = window.scrollY || document.documentElement.scrollTop || 0
  document.body.style.position = 'fixed'
  document.body.style.top = `-${savedScrollY}px`
  document.body.style.width = '100%'
}

function unlockBodyScroll() {
  document.body.style.position = ''
  document.body.style.top = ''
  document.body.style.width = ''
  window.scrollTo(0, savedScrollY)
  savedScrollY = 0
}

watch(() => props.open, (val) => {
  if (val) {
    lockBodyScroll()
    dragY.value = 0
    currentY = 0
  } else {
    unlockBodyScroll()
  }
})

onBeforeUnmount(() => {
  // 组件卸载时如果弹层还开着，恢复 body 样式
  if (props.open) {
    unlockBodyScroll()
  }
})

/** iOS Safari 有时 click 事件不触发在 fixed overlay 上，
    用 touchstart 作为兜底——用户手指碰到遮罩层就关 */
function onOverlayTouch() {
  emit('close')
}

function onTouchStart(e) {
  // 只处理 sheet-panel 自身的触摸（从顶部拖拽把手开始的下拉）
  // 检查触摸是否在 panel 顶部区域（handle 附近）
  const touch = e.touches[0]
  const panelTop = panelRef.value?.getBoundingClientRect()?.top || 0
  // 只在距 panel 顶部 60px 范围内响应下拉手势
  if (touch.clientY - panelTop > 60) return

  startY = touch.clientY
  currentY = 0
  dragging.value = true
}

function onTouchMove(e) {
  if (!dragging.value) return
  currentY = e.touches[0].clientY - startY
  if (currentY > 0) {
    // 下拉时阻止页面其他滚动行为
    e.preventDefault()
    dragY.value = currentY
  }
}

function onTouchEnd() {
  if (!dragging.value) return
  dragging.value = false
  if (currentY > 120) {
    // 下拉超过阈值 → 关闭弹层
    dragY.value = 0
    currentY = 0
    unlockBodyScroll()
    emit('close')
  } else {
    // 回弹
    dragY.value = 0
    currentY = 0
  }
}
</script>

<style scoped>
.sheet-enter-active { transition: opacity 0.3s ease; }
.sheet-leave-active { transition: opacity 0.25s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
</style>
