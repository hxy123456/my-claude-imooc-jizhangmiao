<template>
  <div class="px-5 pt-2 pb-4">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-display text-bark">设置</h1>
    </div>

    <!-- Profile Card -->
    <div class="bg-white/60 backdrop-blur-sm rounded-3xl p-5 shadow-lg shadow-bark/5 fade-in-up">
      <div class="flex items-center gap-4 mb-4">
        <!-- 头像：可点击上传 -->
        <button
          type="button"
          @click="pickFile"
          :disabled="uploading"
          class="relative w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center text-2xl font-display text-cream shadow-md active:scale-95 transition-transform disabled:opacity-70"
          :style="user.avatar ? {} : { background: avatarGradient }"
          :title="user.avatar ? '点击更换头像' : '点击上传头像'"
        >
          <img
            v-if="user.avatar"
            :src="user.avatar"
            :key="user.avatar"
            class="w-full h-full object-cover"
            alt="avatar"
            @error="onImgError"
          />
          <span v-else>{{ avatarLetter }}</span>
          <!-- 上传中遮罩 -->
          <span
            v-if="uploading"
            class="absolute inset-0 bg-bark/40 flex items-center justify-center"
          >
            <span class="inline-block w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
          </span>
          <!-- 右下角"相机"小图标，提示可点击 -->
          <span
            v-if="!uploading"
            class="absolute right-0 bottom-0 w-5 h-5 rounded-full bg-white text-[10px] leading-none flex items-center justify-center shadow"
            :class="user.avatar ? 'text-coral' : 'text-clay/70'"
          >📷</span>
        </button>
        <input
          ref="fileInput"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          class="hidden"
          @change="onFileChange"
        />
        <div class="flex-1 min-w-0">
          <div class="text-lg font-semibold text-bark truncate">{{ user.username || '未登录' }}</div>
          <div class="text-xs text-clay/50 mt-0.5">用户 ID #{{ user.id || '—' }}</div>
        </div>
      </div>

      <div class="h-px bg-sand/60 my-3"></div>

      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs text-clay/60">用户名</span>
          <span class="text-sm text-bark font-mono">{{ user.username || '—' }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-clay/60">注册时间</span>
          <span class="text-sm text-bark font-mono" :title="createdAtRaw">{{ createdAtDisplay }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-clay/60">已加入</span>
          <span class="text-sm text-bark font-mono">{{ joinedForDisplay }}</span>
        </div>
      </div>
    </div>

    <!-- Manage Card (V1.2) -->
    <div class="mt-5 bg-white/60 backdrop-blur-sm rounded-3xl shadow-lg shadow-bark/5 fade-in-up stagger-1">
      <button
        @click="router.push('/settings/accounts')"
        class="w-full flex items-center justify-between px-5 py-4 text-left active:bg-sand/30 transition-colors"
      >
        <span class="flex items-center gap-3">
          <span class="text-lg">💳</span>
          <span class="text-sm text-bark font-medium">账户管理</span>
        </span>
        <span class="flex items-center gap-2">
          <span class="text-xs text-clay/50">{{ accountCount }} 个</span>
          <span class="text-clay/40">→</span>
        </span>
      </button>
      <div class="h-px bg-sand/60 mx-5"></div>
      <button
        @click="router.push('/settings/categories')"
        class="w-full flex items-center justify-between px-5 py-4 text-left active:bg-sand/30 transition-colors"
      >
        <span class="flex items-center gap-3">
          <span class="text-lg">🏷️</span>
          <span class="text-sm text-bark font-medium">分类管理</span>
        </span>
        <span class="flex items-center gap-2">
          <span class="text-xs text-clay/50">{{ categoryCount }} 项</span>
          <span class="text-clay/40">→</span>
        </span>
      </button>
    </div>

    <!-- Account Actions -->
    <div class="mt-5 bg-white/60 backdrop-blur-sm rounded-3xl shadow-lg shadow-bark/5 fade-in-up stagger-2">
      <button
        @click="refreshProfile"
        :disabled="refreshing"
        class="w-full flex items-center justify-between px-5 py-4 text-left active:bg-sand/30 transition-colors disabled:opacity-50"
      >
        <span class="text-sm text-bark">刷新资料</span>
        <span class="text-xs text-clay/50">
          <span v-if="refreshing" class="inline-flex items-center gap-1.5">
            <span class="inline-block w-3 h-3 border-2 border-clay/30 border-t-clay rounded-full animate-spin"></span>
            刷新中
          </span>
          <span v-else>↻</span>
        </span>
      </button>
      <div class="h-px bg-sand/60 mx-5"></div>
      <button
        @click="$emit('requestLogout')"
        class="w-full flex items-center justify-between px-5 py-4 text-left active:bg-sand/30 transition-colors"
      >
        <span class="text-sm text-coral font-medium">退出登录</span>
        <span class="text-coral">→</span>
      </button>
    </div>

    <!-- Footer -->
    <p class="mt-6 text-center text-[10px] text-clay/30 fade-in-up stagger-3">v1.2.0 · 数据存储在云端</p>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { useAuthStore } from '../stores/auth.js'
import { useAccountStore } from '../stores/accounts.js'
import { useCategoryStore } from '../stores/categories.js'
import { authApi, usersApi, ApiError } from '../utils/apiClient.js'

const emit = defineEmits(['requestLogout', 'showToast'])

const router = useRouter()
const authStore = useAuthStore()
const accountStore = useAccountStore()
const categoryStore = useCategoryStore()
const refreshing = ref(false)
const uploading = ref(false)
const fileInput = ref(null)

/** V1.2 入口：展示账户数 / 自定义分类数（仅用户自建部分） */
const accountCount = computed(() => accountStore.list.length)
const categoryCount = computed(() => categoryStore.customCount)

/** 从 store 读取用户信息（已由 /me 加载） */
const user = computed(() => authStore.currentUser || {})

/* ----------------- 头像上传 ----------------- */

/** 触发文件选择 */
function pickFile() {
  if (uploading.value) return
  fileInput.value?.click()
}

/** 客户端预校验：大小 ≤ 2MB，类型 png/jpg/jpeg/webp */
const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp']

function validateFile(file) {
  if (!file) return '未选择文件'
  if (!ALLOWED_MIME.includes(file.type)) {
    return '仅支持 PNG / JPG / WEBP 格式'
  }
  if (file.size > MAX_BYTES) {
    return `图片不能超过 ${(MAX_BYTES / 1024 / 1024).toFixed(0)} MB`
  }
  return null
}

async function onFileChange(e) {
  const file = e.target.files?.[0]
  // 立刻清空 value，允许重复选择同一文件
  e.target.value = ''
  if (!file) return
  const err = validateFile(file)
  if (err) {
    emit('showToast', err)
    return
  }
  uploading.value = true
  try {
    const data = await usersApi.uploadAvatar(file)
    // 后端返回 { avatar: <url>, user: <含 avatar 字段的最新用户> }
    if (data?.user) {
      authStore.setUser(data.user)
    } else if (data?.avatar) {
      // 兜底：手动 patch 当前 user
      authStore.setUser({ ...user.value, avatar: data.avatar })
    }
    emit('showToast', '头像已更新 ✓')
  } catch (e) {
    const msg = e instanceof ApiError ? e.message : '上传失败，请重试'
    // eslint-disable-next-line no-console
    console.warn('[settings] 头像上传失败:', e)
    emit('showToast', msg)
  } finally {
    uploading.value = false
  }
}

/** <img> 加载失败（例如旧 URL 已失效）—— 退回渐变占位 */
function onImgError() {
  // eslint-disable-next-line no-console
  console.warn('[settings] 头像加载失败，回退到默认占位')
  if (user.value) {
    authStore.setUser({ ...user.value, avatar: null })
  }
}

/**
 * 服务端返回的 createdAt 形如 "2026-06-09T07:17:23.000Z"
 * dayjs 默认能解析；toString 用本地时区展示
 */
const createdAtRaw = computed(() => user.value.createdAt || '')
const createdAtDisplay = computed(() => {
  if (!createdAtRaw.value) return '—'
  return dayjs(createdAtRaw.value).format('YYYY-MM-DD HH:mm')
})

/** "已加入 N 天" */
const joinedForDisplay = computed(() => {
  if (!createdAtRaw.value) return '—'
  const days = dayjs().startOf('day').diff(dayjs(createdAtRaw.value).startOf('day'), 'day')
  if (days <= 0) return '今天'
  if (days === 1) return '1 天'
  if (days < 30) return `${days} 天`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} 个月`
  return `${Math.floor(days / 365)} 年`
})

/** 头像首字母（默认用 "🐱"） */
const avatarLetter = computed(() => {
  const u = (user.value.username || '').trim()
  if (!u) return '🐱'
  return u.charAt(0).toUpperCase()
})

/** 头像背景渐变（按用户名 hash 出一个稳定色相） */
const avatarGradient = computed(() => {
  const u = user.value.username || ''
  let hash = 0
  for (let i = 0; i < u.length; i++) hash = (hash * 31 + u.charCodeAt(i)) >>> 0
  const hue = hash % 360
  return `linear-gradient(135deg, hsl(${hue}, 55%, 55%), hsl(${(hue + 40) % 360}, 50%, 45%))`
})

/** 重新拉取一次 /me，保证 createdAt 等信息最新 */
async function refreshProfile() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    const data = await authApi.me()
    if (data?.user) {
      authStore.setUser(data.user)
      emit('showToast', '资料已刷新')
    }
  } catch (e) {
    // 静默失败：保留旧值
    // eslint-disable-next-line no-console
    console.warn('[settings] 刷新失败:', e.message)
    emit('showToast', '刷新失败：' + (e?.message || '网络错误'))
  } finally {
    refreshing.value = false
  }
}

/** 进入页面时如果没有 currentUser，主动拉一次（应对从外部深链 / 缓存清空的场景） */
onMounted(async () => {
  if (!authStore.currentUser && authStore.token) {
    await refreshProfile()
  }
})
</script>
