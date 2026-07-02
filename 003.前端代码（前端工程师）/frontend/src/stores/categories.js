/**
 * V1.2+ 自定义分类 store（接后端 HTTP）
 *
 * 数据源：后端 /api/categories 返回 { expense: [...], income: [...] }
 * - 内置分类由后端 categories 表 seed，isSystem=true
 * - 用户自定义子分类由后端 categories.user_id 隔离，isSystem=false
 * - 前端不再用 sessionStorage 持久化（多设备、多标签页保持一致）
 *
 * 数据结构（与 V1.1 保持一致，UI 无需改）：
 * {
 *   expense: [
 *     { id, name, icon, color, isSystem, children: [{id, name, isSystem, parentId}] },
 *     ...
 *   ],
 *   income: [...]
 * }
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { categoriesApi, ApiError } from '../utils/apiClient.js'

const EMPTY_TREE = () => ({ expense: [], income: [] })

export const useCategoryStore = defineStore('categories', () => {
  const tree = ref(EMPTY_TREE())
  const loading = ref(false)
  const lastError = ref('')

  const expenseList = computed(() => tree.value.expense || [])
  const incomeList = computed(() => tree.value.income || [])
  const customCount = computed(() => {
    const exp = (tree.value.expense || []).reduce(
      (n, p) => n + p.children.filter(c => !c.isSystem).length, 0
    )
    const inc = (tree.value.income || []).reduce(
      (n, p) => n + p.children.filter(c => !c.isSystem).length, 0
    )
    return exp + inc
  })

  /**
   * 拉取整棵树（后端已合并：内置全量 + 当前用户自定义）
   * - 由 App.vue 在登录态建立后调用
   * - 内置并发保护：已在加载中则直接返回
   */
  async function initForUser() {
    if (loading.value) return  // 防止并发重复请求
    loading.value = true
    lastError.value = ''
    try {
      const data = await categoriesApi.tree()
      // 防御性兜底：万一后端返回不完整
      tree.value = {
        expense: Array.isArray(data?.expense) ? data.expense : [],
        income: Array.isArray(data?.income) ? data.income : [],
      }
    } catch (e) {
      lastError.value = e instanceof ApiError ? e.message : '分类加载失败'
      tree.value = EMPTY_TREE()
    } finally {
      loading.value = false
    }
  }

  function reset() {
    tree.value = EMPTY_TREE()
  }

  /**
   * 新增子分类
   * @param {'expense'|'income'} type
   * @param {string} parentId
   * @param {string} name
   * @returns {object|null} 新建的子分类
   */
  async function addChild(type, parentId, name) {
    try {
      const created = await categoriesApi.addChild({ name, parentId, type })
      // 把新分类挂到本地树相应父类下
      const parents = tree.value[type]
      if (!Array.isArray(parents)) return null
      const idx = parents.findIndex(p => p.id === parentId)
      if (idx === -1) return null
      const child = { ...created, parentId, isSystem: false }
      const next = parents.slice()
      next[idx] = { ...next[idx], children: [...next[idx].children, child] }
      tree.value = { ...tree.value, [type]: next }
      return child
    } catch (e) {
      lastError.value = e.message
      return null
    }
  }

  /**
   * 删除子分类（系统子分类由后端拦截）
   * @returns {boolean}
   */
  async function removeChild(type, childId) {
    try {
      await categoriesApi.remove(childId)
      const parents = tree.value[type]
      if (!Array.isArray(parents)) return false
      const pIdx = parents.findIndex(p => p.children.some(c => c.id === childId))
      if (pIdx === -1) return false
      const next = parents.slice()
      next[pIdx] = {
        ...next[pIdx],
        children: next[pIdx].children.filter(c => c.id !== childId),
      }
      tree.value = { ...tree.value, [type]: next }
      return true
    } catch (e) {
      lastError.value = e.message
      return false
    }
  }

  return {
    // state
    tree,
    loading,
    lastError,
    // getters
    expenseList,
    incomeList,
    customCount,
    // actions
    initForUser,
    reset,
    addChild,
    removeChild,
  }
})
