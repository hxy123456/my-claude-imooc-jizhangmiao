<template>
  <div class="fixed bottom-0 left-0 right-0 z-30 bg-cream/95 backdrop-blur-lg border-t border-warm/40">
    <div class="flex items-center justify-around py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <router-link
        v-for="tab in tabs"
        :key="tab.key"
        :to="`/${tab.key}`"
        class="flex flex-col items-center gap-0.5 px-6 py-1 transition-all duration-200"
        :class="$route.name === tab.key.charAt(0).toUpperCase() + tab.key.slice(1) ? 'text-coral' : 'text-clay/60'"
      >
        <span class="text-xl">{{ tab.icon }}</span>
        <span class="text-[11px] font-medium tracking-wide">{{ tab.label }}</span>
      </router-link>
    </div>
  </div>
</template>

<script setup>
const tabs = [
  { key: 'home', icon: '🏠', label: '首页' },
  { key: 'bills', icon: '📋', label: '账单' },
  { key: 'stats', icon: '📊', label: '统计' },
]
</script>
