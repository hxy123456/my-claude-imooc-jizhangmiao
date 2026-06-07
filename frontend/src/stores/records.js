import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import { addRecord, updateRecord, softDeleteRecord, getRecords, getMonthlyStats, getTodayExpense, seedDemoData } from '../utils/db.js'
import { useAuthStore } from './auth.js'

export const useRecordStore = defineStore('records', () => {
  const records = ref([])
  const todayExpense = ref(0)
  const monthlyStats = ref({ totalExpense: 0, totalIncome: 0, balance: 0, categoryMap: {}, dailyMap: {}, records: [] })
  const currentMonth = ref(dayjs().format('YYYY-MM'))
  const loading = ref(false)

  const recentRecords = computed(() => records.value.slice(0, 5))

  function _userId() {
    return useAuthStore().userId
  }

  async function init() {
    const uid = _userId()
    if (!uid) return
    await seedDemoData(uid)
    await refreshAll()
  }

  async function refreshAll() {
    const uid = _userId()
    if (!uid) return
    loading.value = true
    try {
      const [allRecords, today, stats] = await Promise.all([
        getRecords({ userId: uid }),
        getTodayExpense(uid),
        loadMonthlyStatsRaw(),
      ])
      records.value = allRecords
      todayExpense.value = today
      monthlyStats.value = stats
    } finally {
      loading.value = false
    }
  }

  async function loadMonthlyStatsRaw() {
    const uid = _userId()
    const [year, month] = currentMonth.value.split('-').map(Number)
    return getMonthlyStats(year, month, uid)
  }

  async function loadMonthlyStats() {
    const stats = await loadMonthlyStatsRaw()
    monthlyStats.value = stats
  }

  async function add(data) {
    const uid = _userId()
    await addRecord({ ...data, userId: uid })
    await refreshAll()
  }

  async function update(id, data) {
    await updateRecord(id, data)
    await refreshAll()
  }

  async function remove(id) {
    await softDeleteRecord(id)
    await refreshAll()
  }

  async function searchRecords({ type, categoryId, keyword, startDate, endDate } = {}) {
    const uid = _userId()
    records.value = await getRecords({ userId: uid, type, categoryId, keyword, startDate, endDate })
  }

  function setMonth(monthStr) {
    currentMonth.value = monthStr
    loadMonthlyStats()
  }

  function reset() {
    records.value = []
    todayExpense.value = 0
    monthlyStats.value = { totalExpense: 0, totalIncome: 0, balance: 0, categoryMap: {}, dailyMap: {}, records: [] }
  }

  return {
    records, todayExpense, monthlyStats, currentMonth, loading, recentRecords,
    init, refreshAll, add, update, remove, searchRecords, loadMonthlyStats, setMonth, reset,
  }
})
