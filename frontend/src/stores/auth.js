import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, tokenStore, ApiError } from '../utils/apiClient.js'

/**
 * V1.1+ 鉴权 store
 *
 * 与 V1.0.1 的差异：
 * - 不再读写本地 IndexedDB users 表 / sessionStorage
 * - 登录/注册改为调用后端 /api/auth/*，token 存到 localStorage
 * - init() 时若 token 存在，调 /me 验证有效性；401 则清空
 *
 * 外部 API 保持不变（login / register / logout / init + getters），
 * 因此 router/Auth.vue 不需要改动。
 */
export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref(null)
  const token = ref(tokenStore.get())
  const error = ref('')
  const initialized = ref(false)
  const loading = ref(false)

  const isLoggedIn = computed(() => !!currentUser.value)
  const userId = computed(() => currentUser.value?.id || 0)
  const username = computed(() => currentUser.value?.username || '')

  /**
   * 启动时调用一次：若有 token，调 /me 验证并填充用户信息
   * 网络错误时不清 token（允许离线时仍展示登录页）
   */
  async function init() {
    if (initialized.value) return
    initialized.value = true
    if (!token.value) return
    try {
      const data = await authApi.me()
      currentUser.value = data.user
    } catch (e) {
      // 鉴权失败：清空；网络失败：保留 token 让用户重试
      if (e instanceof ApiError && e.status === 401) {
        _clearSession()
      } else {
        // 静默忽略网络错误；下次进入受保护路由时再触发
        // eslint-disable-next-line no-console
        console.warn('[auth] init 验证失败（保留 token）:', e.message)
      }
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

  function logout() {
    _clearSession()
  }

  /* ----------------- internal ----------------- */

  function _setSession(user, newToken) {
    currentUser.value = user
    token.value = newToken
    tokenStore.set(newToken)
    error.value = ''
  }

  function _clearSession() {
    currentUser.value = null
    token.value = ''
    tokenStore.clear()
    error.value = ''
  }

  return {
    // state
    currentUser,
    token,
    error,
    initialized,
    loading,
    // getters
    isLoggedIn,
    userId,
    username,
    // actions
    init,
    login,
    register,
    logout,
  }
})
