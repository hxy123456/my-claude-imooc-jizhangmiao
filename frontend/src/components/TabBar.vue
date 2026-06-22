<template>
  <div class="fixed bottom-0 left-0 right-0 z-30 bg-cream/95 backdrop-blur-lg border-t border-warm/40">
    <div class="flex items-end justify-around pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <!-- 左侧 2 个 tab：首页 / 账单 -->
      <router-link
        v-for="tab in leftTabs"
        :key="tab.key"
        :to="`/${tab.key}`"
        class="flex-1 flex flex-col items-center gap-1.5 py-2 transition-all duration-200"
        :class="isActive(tab) ? 'text-coral' : 'text-clay/60'"
      >
        <span class="text-xl leading-none">{{ tab.icon }}</span>
        <span class="text-[11px] font-medium tracking-wide leading-none">{{ tab.label }}</span>
      </router-link>

      <!-- 中间凸起 +：不导航，只触发 add 事件 -->
      <button
        type="button"
        @click="$emit('add')"
        class="flex-1 flex justify-center -mt-5"
        aria-label="记一笔"
      >
        <span
          class="w-14 h-14 rounded-full bg-coral text-white text-3xl shadow-lg shadow-coral/40 flex items-center justify-center active:scale-90 transition-transform ring-4 ring-cream"
        >+</span>
      </button>

      <!-- 右侧 2 个 tab：统计 / 我的 -->
      <router-link
        v-for="tab in rightTabs"
        :key="tab.key"
        :to="`/${tab.key}`"
        class="flex-1 flex flex-col items-center gap-1.5 py-2 transition-all duration-200"
        :class="isActive(tab) ? 'text-coral' : 'text-clay/60'"
      >
        <span class="text-xl leading-none">{{ tab.icon }}</span>
        <span class="text-[11px] font-medium tracking-wide leading-none">{{ tab.label }}</span>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'

defineEmits(['add'])

const route = useRoute()

const leftTabs = [
  { key: 'home',    icon: '🏠', label: '首页',  match: ['Home'] },
  { key: 'bills',   icon: '📋', label: '账单',  match: ['Bills'] },
]
const rightTabs = [
  { key: 'stats',    icon: '📊', label: '统计', match: ['Stats'] },
  // 我的 tab 高亮：设置主页 + 账户管理 + 分类管理三个路由都算
  { key: 'settings', icon: '👤', label: '我的', match: ['Settings', 'SettingsAccounts', 'SettingsCategories'] },
]

/**
 * 高亮判断：
 *  1) 优先精确匹配 route.name（主 tab）
 *  2) 兜底：路径前缀（防止后续再新增 SettingsXxx 子路由时漏掉）
 */
function isActive(tab) {
  if (!tab.match) return false
  if (tab.match.includes(route.name)) return true
  return route.path === `/${tab.key}` || route.path.startsWith(`/${tab.key}/`)
}
</script>
