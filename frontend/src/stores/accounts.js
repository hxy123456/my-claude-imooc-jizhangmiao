/**
 * V1.2+ 账户 store（接后端 HTTP）
 *
 * 数据源：后端 /api/accounts
 * - 后端在注册时自动种入 3 个默认账户（现金 / 微信 / 支付宝）
 * - 前端只读后端，**不再**用 sessionStorage 持久化（多设备、多标签页保持一致）
 * - 切换账号：reset() → initForUser()；initForUser() 不接 userId（用 token 取后端）
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { accountsApi, ApiError } from '../utils/apiClient.js'

// 8 套常见账户图标（弹窗里供用户选）
export const ACCOUNT_ICONS = ['💵', '💳', '📱', '🏦', '💰', '🪙', '💎', '👜']

export const useAccountStore = defineStore('accounts', () => {
  const list = ref([])
  const loading = ref(false)
  const lastError = ref('')

  const count = computed(() => list.value.length)
  const isEmpty = computed(() => list.value.length === 0)

  /**
   * 拉取当前 token 对应用户的所有账户。
   * - 由 App.vue 在登录态建立后调用
   * - 切换账号：先 reset() 再 initForUser()
   * - 内置并发保护：已在加载中则直接返回
   */
  async function initForUser() {
    if (loading.value) return  // 防止并发重复请求
    loading.value = true
    lastError.value = ''
    try {
      list.value = await accountsApi.list()
    } catch (e) {
      lastError.value = e instanceof ApiError ? e.message : '账户加载失败'
      list.value = []
    } finally {
      loading.value = false
    }
  }

  function reset() {
    list.value = []
  }

  /**
   * 新增账户
   * @returns {Account|null} 新建的对象；name 为空 / 后端拒绝返回 null
   */
  async function add({ name, icon }) {
    try {
      const created = await accountsApi.create({ name, icon })
      list.value = [...list.value, created]
      return created
    } catch (e) {
      lastError.value = e.message
      return null
    }
  }

  /**
   * 更新账户
   * @returns {boolean}
   */
  async function update(id, patch) {
    try {
      const updated = await accountsApi.update(id, patch)
      list.value = list.value.map(a => (a.id === id ? updated : a))
      return true
    } catch (e) {
      lastError.value = e.message
      return false
    }
  }

  /**
   * 删除账户
   * @returns {boolean}
   */
  async function remove(id) {
    try {
      await accountsApi.remove(id)
      list.value = list.value.filter(a => a.id !== id)
      return true
    } catch (e) {
      lastError.value = e.message
      return false
    }
  }

  return {
    // state
    list,
    loading,
    lastError,
    // getters
    count,
    isEmpty,
    // actions
    initForUser,
    reset,
    add,
    update,
    remove,
  }
})
