import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, tokenStore, ApiError } from '../utils/apiClient.js'

/**
 * V1.1+ 鉴权 store
 *
 * 关键设计（修复刷新掉登录的 bug）：
 * - token 持久化到 localStorage（authApi.tokenStore）
 * - currentUser **也** 持久化到 localStorage（countcat_user）
 * - store 创建时立即从 localStorage 同步恢复 currentUser，**不等 /me 返回**
 * - 这样刷新页面时 isLoggedIn 立即为 true，router 不会再把用户踢回登录页
 * - init() 改为后台静默调 /me 验证：
 *     - 成功：用最新 user 刷新 currentUser 缓存
 *     - 401：彻底清空 session（isLoggedIn → false，由 App.vue watch 跳登录）
 *     - 其他错误（网络/CORS/500）：保留 currentUser，console.warn
 *
 * 这样既保留了 token 有效性校验，又解决了"网络抖动或代理未就绪时刷新掉登录"。
 */
const USER_KEY = 'countcat_user'

/** 从 localStorage 读缓存用户（只用于快速恢复 UI；后台 init() 会用 /me 校正） */
function loadCachedUser() {
  try {
    const s = localStorage.getItem(USER_KEY)
    if (!s) return null
    const u = JSON.parse(s)
    return u && typeof u === 'object' ? u : null
  } catch {
    return null
  }
}

function saveCachedUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  } catch {
    /* 隐私模式 / quota 满：忽略 */
  }
}

export const useAuthStore = defineStore('auth', () => {
  // === 立即从 localStorage 恢复（关键：刷新不丢登录态） ===
  const initialToken = tokenStore.get()
  const initialUser = initialToken ? loadCachedUser() : null

  const currentUser = ref(initialUser)
  const token = ref(initialToken)
  const error = ref('')
  const initialized = ref(false)
  /** 已通过 /me 同步过一次最新 user（路由切换时静默刷） */
  const userSynced = ref(false)
  const loading = ref(false)

  const isLoggedIn = computed(() => !!currentUser.value)
  const userId = computed(() => currentUser.value?.id || 0)
  const username = computed(() => currentUser.value?.username || '')

  /**
   * 启动时调用一次：若有 token，后台静默调 /me 验证
   * - 不会清空已从 localStorage 恢复的 currentUser（除非 401）
   * - 失败（非 401）时网络/CORS/500 都不影响 UI 登录态
   */
  async function init() {
    if (initialized.value) return
    initialized.value = true
    if (!token.value) return

    try {
      const data = await authApi.me()
      if (data && data.user) {
        currentUser.value = data.user
        saveCachedUser(data.user)
        userSynced.value = true
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        // token 真的失效了（被吊销或过期）：彻底清空
        _clearSession()
      } else {
        // 网络错误 / 代理未就绪 / 500：保留 currentUser，不踢用户
        // eslint-disable-next-line no-console
        console.warn('[auth] init /me 验证失败（保留登录态，后台会重试）:', e.message)
      }
    }
  }

  /**
   * 强制从后端 /me 拉一次最新 user（用于路由切换时静默同步）
   * - 不抛错给调用方（网络错误只 warn）
   * - 401 不清空（已登录的用户应继续走主流程，由下次 /me 401 再清）
   */
  async function refreshMe() {
    if (!token.value) return
    try {
      const data = await authApi.me()
      if (data && data.user) {
        currentUser.value = data.user
        saveCachedUser(data.user)
        userSynced.value = true
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        _clearSession()
      } else {
        // eslint-disable-next-line no-console
        console.warn('[auth] refreshMe 失败（保留登录态）:', e.message)
      }
    }
  }

  /**
   * PATCH /me：前端编辑昵称 / 头像用
   */
  async function updateMe(patch) {
    try {
      const data = await authApi.updateMe(patch)
      if (data && data.user) {
        currentUser.value = data.user
        saveCachedUser(data.user)
      }
      return data && data.user
    } catch (e) {
      error.value = e.message
      return null
    }
  }

  async function login(username, password) {
    error.value = ''
    loading.value = true
    try {
      const data = await authApi.login(username, password)
      _setSession(data.user, data.token)
      return true
    } catch (e) {
      error.value = e.message || '登录失败'
      return false
    } finally {
      loading.value = false
    }
  }

  async function register(username, password) {
    error.value = ''
    loading.value = true
    try {
      const data = await authApi.register(username, password)
      _setSession(data.user, data.token)
      return true
    } catch (e) {
      error.value = e.message || '注册失败'
      return false
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    // 优先通知服务端把 token 加入黑名单（即使失败也要本地清掉，避免用户被卡住）
    try {
      await authApi.logout()
    } catch (e) {
      // 网络错误 / 401 / TOKEN_REVOKED 都属于"服务端已不可达"或"token 已失效"，
      // 都按"尽力通知过了"处理，本地一律清空
      // eslint-disable-next-line no-console
      console.warn('[auth] 通知服务端退出失败，继续本地清空:', e.message)
    }
    _clearSession()
  }

  /* ----------------- internal ----------------- */

  function _setSession(user, newToken) {
    currentUser.value = user
    token.value = newToken
    tokenStore.set(newToken)
    saveCachedUser(user)
    userSynced.value = true
    error.value = ''
  }

  function _clearSession() {
    currentUser.value = null
    token.value = ''
    tokenStore.clear()
    saveCachedUser(null)
    userSynced.value = false
    error.value = ''
  }

  /**
   * 仅刷新 currentUser（如 /me 拉到的最新资料），不动 token
   * 供设置页 / 个人中心等"刷新一次数据"使用
   */
  function setUser(user) {
    if (user) {
      currentUser.value = user
      saveCachedUser(user)
    }
  }

  /**
   * 公共：清空登录态（不通知服务端，不弹黑名单）
   * 用于"注册成功 → 切回登录 tab"这种"虽然有 token 但不算真正登录"的中间态，
   * 否则 isLoggedIn=true 会让 App.vue 的 TabBar 提前出现。
   */
  function clearSession() {
    _clearSession()
  }

  return {
    // state
    currentUser,
    token,
    error,
    initialized,
    userSynced,
    loading,
    // getters
    isLoggedIn,
    userId,
    username,
    // actions
    init,
    refreshMe,
    updateMe,
    login,
    register,
    logout,
    setUser,
    clearSession,
  }
})
