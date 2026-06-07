<template>
  <div class="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
    <!-- Brand -->
    <div class="text-center mb-10 fade-in-up">
      <div class="text-6xl mb-3">🐱</div>
      <h1 class="text-3xl font-display text-bark mb-1">记账喵</h1>
      <p class="text-sm text-clay/50 tracking-wide">轻松记录每一笔</p>
    </div>

    <!-- Form Card -->
    <div class="w-full max-w-sm bg-white/60 backdrop-blur-sm rounded-3xl p-6 shadow-lg shadow-bark/5 fade-in-up stagger-1">
      <!-- Tab Toggle -->
      <div class="flex bg-sand rounded-xl p-1 mb-6">
        <button
          @click="mode = 'login'"
          class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
          :class="mode === 'login' ? 'bg-bark text-cream shadow-sm' : 'text-clay'"
        >登录</button>
        <button
          @click="mode = 'register'"
          class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
          :class="mode === 'register' ? 'bg-bark text-cream shadow-sm' : 'text-clay'"
        >注册</button>
      </div>

      <!-- Username -->
      <div class="mb-4">
        <label class="text-xs text-clay/60 mb-1.5 block font-medium">用户名</label>
        <input
          v-model="form.username"
          type="text"
          placeholder="请输入用户名"
          autocomplete="username"
          class="w-full px-4 py-3 bg-sand rounded-xl text-sm text-bark placeholder:text-clay/40 outline-none focus:ring-2 focus:ring-peach/40 transition-all"
          @keyup.enter="onSubmit"
        />
      </div>

      <!-- Password -->
      <div class="mb-2">
        <label class="text-xs text-clay/60 mb-1.5 block font-medium">密码</label>
        <div class="relative">
          <input
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="请输入密码"
            autocomplete="current-password"
            class="w-full px-4 py-3 bg-sand rounded-xl text-sm text-bark placeholder:text-clay/40 outline-none focus:ring-2 focus:ring-peach/40 transition-all pr-10"
            @keyup.enter="onSubmit"
          />
          <button
            @click="showPassword = !showPassword"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-clay/40 text-sm active:scale-90 transition-transform"
          >{{ showPassword ? '🙈' : '👁️' }}</button>
        </div>
      </div>

      <!-- Password Hint -->
      <div v-if="mode === 'register'" class="text-[10px] text-clay/40 mb-4 px-1">密码至少4位</div>
      <div v-else class="mb-4"></div>

      <!-- Error -->
      <div v-if="authStore.error" class="mb-4 px-3 py-2 bg-coral/10 rounded-lg text-xs text-coral font-medium fade-in-up">
        {{ authStore.error }}
      </div>

      <!-- Submit -->
      <button
        @click="onSubmit"
        :disabled="!canSubmit || submitting"
        class="w-full py-3.5 rounded-2xl text-base font-semibold transition-all duration-200 active:scale-[0.98]"
        :class="canSubmit && !submitting
          ? 'bg-bark text-cream shadow-lg shadow-bark/20'
          : 'bg-warm text-clay/50 cursor-not-allowed'"
      >
        <span v-if="submitting" class="inline-flex items-center gap-2">
          <span class="inline-block w-4 h-4 border-2 border-cream/30 border-t-cream rounded-full animate-spin"></span>
          处理中...
        </span>
        <span v-else>{{ mode === 'login' ? '登录' : '注册' }}</span>
      </button>
    </div>

    <!-- Footer -->
    <p class="mt-8 text-xs text-clay/30 fade-in-up stagger-2">v1.0.1 · 数据仅存储在本地</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth.js'

const authStore = useAuthStore()

const mode = ref('login')
const form = ref({ username: '', password: '' })
const showPassword = ref(false)
const submitting = ref(false)

const canSubmit = computed(() =>
  form.value.username.trim().length >= 2 &&
  form.value.password.length >= 4
)

async function onSubmit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true

  const fn = mode.value === 'login' ? authStore.login : authStore.register
  await fn(form.value.username.trim(), form.value.password)

  submitting.value = false
}
</script>
