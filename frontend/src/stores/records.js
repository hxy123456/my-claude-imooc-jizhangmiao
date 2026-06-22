import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import { recordsApi, statsApi } from '../utils/apiClient.js'

/**
 * V1.2+ 记录 store（接后端 HTTP）
 *
 * 与 V1.0.1/V1.1 的差异：
 * - 数据源从 IndexedDB（utils/db.js）切到后端 REST（recordsApi / statsApi）
 * - 每条请求都带 Bearer token；userId 由后端从 token 解析，前端不传
 * - 暴露的 state / action 形状保持不变，views/ 不需要改
 *
 * 关键字段约定（与 db.js 一致，便于 view 直接消费）：
 * - records:        Array<Record>  全部未软删记录（按 recordDate DESC, id DESC）
 * - todayExpense:   number         今日支出
 * - monthlyStats:   { totalExpense, totalIncome, balance, count, categoryMap, dailyMap, records }
 * - currentMonth:   'YYYY-MM'      用于 setMonth / loadMonthlyStats
 * - recentRecords:  computed.slice(0, 5)
 */

const EMPTY_STATS = () => ({
  month: '',
  monthLabel: '',
  totalExpense: 0,
  totalIncome: 0,
  balance: 0,
  count: 0,
  categoryMap: {},
  dailyMap: {},
  records: [],
})

export const useRecordStore = defineStore('records', () => {
  const records = ref([])
  const todayExpense = ref(0)
  const monthlyStats = ref(EMPTY_STATS())
  const currentMonth = ref(dayjs().format('YYYY-MM'))
  const loading = ref(false)

  const recentRecords = computed(() => records.value.slice(0, 5))

  /**
   * 登录态建立后调用：拉一次首页 + 当月数据。
   * - records:     最近一个月内的列表（Bills 进来后用 setMonth 再扩）
   * - todayExpense: 今日支出
   * - monthlyStats: 当前月聚合（首页 / 统计页都吃它）
   */
  async function init() {
    loading.value = true
    try {
      await Promise.all([refreshRecords(), refreshToday(), refreshMonthly(currentMonth.value)])
    } finally {
      loading.value = false
    }
  }

  /** 拉最近记录（首页 + 通用最近 10） */
  async function refreshRecords(limit = 100) {
    const data = await recordsApi.recent(limit)
    records.value = Array.isArray(data) ? data : []
  }

  /** 今日支出（数字） */
  async function refreshToday() {
    const data = await recordsApi.list({ page: 1, pageSize: 100 })
    const today = dayjs().format('YYYY-MM-DD')
    const sum = (data.items || []).reduce(
      (s, r) => (r.type === 'expense' && r.recordDate === today ? s + Number(r.amount) : s),
      0
    )
    todayExpense.value = +sum.toFixed(2)
  }

  /** 拉取月度聚合（一次拿全） */
  async function refreshMonthly(month) {
    const data = await statsApi.monthly(month)
    monthlyStats.value = data
    return data
  }

  async function loadMonthlyStats() {
    return refreshMonthly(currentMonth.value)
  }

  async function add(payload) {
    await recordsApi.create(payload)
    await init()
  }

  async function update(id, payload) {
    await recordsApi.update(id, payload)
    await init()
  }

  async function remove(id) {
    await recordsApi.remove(id)
    await init()
  }

  /**
   * Bills 页搜索 / 筛选
   * 走 recordsApi.list，带 type / categoryId / keyword / month
   */
  async function searchRecords({ type, categoryId, keyword, month } = {}) {
    const data = await recordsApi.list({
      page: 1,
      pageSize: 100,
      type,
      categoryId,
      keyword,
      month,
    })
    records.value = data.items || []
  }

  /**
   * 切换月份（Stats 页 prev/next month）
   * 后端 SQL 按月份过滤并返回聚合结构
   */
  function setMonth(monthStr) {
    currentMonth.value = monthStr
    return refreshMonthly(monthStr)
  }

  function reset() {
    records.value = []
    todayExpense.value = 0
    monthlyStats.value = EMPTY_STATS()
  }

  return {
    // state
    records,
    todayExpense,
    monthlyStats,
    currentMonth,
    loading,
    // getters
    recentRecords,
    // actions
    init,
    refreshRecords,
    refreshToday,
    refreshMonthly,
    loadMonthlyStats,
    add,
    update,
    remove,
    searchRecords,
    setMonth,
    reset,
  }
})
