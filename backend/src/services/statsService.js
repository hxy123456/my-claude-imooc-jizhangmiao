/**
 * 统计 Service
 *
 * 所有 SQL 都按"用户 + 月份范围"过滤；返回结构扁平、前端可直接吃。
 */
const { pool } = require('../config/db')
const AppError = require('../utils/AppError')
const { ErrorCode } = require('../config/constants')

/* -------------------- 工具 -------------------- */

function _assertMonth(month) {
  if (typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) {
    throw new AppError(ErrorCode.BAD_REQUEST, '月份格式错误（须 YYYY-MM）')
  }
}

function _monthRange(month) {
  // 返回当月首日和下月首日（用于 BETWEEN/范围比较）
  const [y, m] = month.split('-').map(Number)
  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const nextY = m === 12 ? y + 1 : y
  const nextM = m === 12 ? 1 : m + 1
  const end = `${nextY}-${String(nextM).padStart(2, '0')}-01`
  return { start, end }
}

function _daysInMonth(month) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/* -------------------- 概览：收入/支出/结余 -------------------- */

async function overview(userId, month) {
  _assertMonth(month)
  const { start, end } = _monthRange(month)
  const [rows] = await pool.query(
    `SELECT type, COALESCE(SUM(amount), 0) AS total, COUNT(*) AS cnt
       FROM records
      WHERE user_id = ?
        AND is_deleted = 0
        AND record_date >= ? AND record_date < ?
      GROUP BY type`,
    [userId, start, end]
  )
  const income = Number(rows.find(r => r.type === 'income')?.total || 0)
  const expense = Number(rows.find(r => r.type === 'expense')?.total || 0)
  return {
    month,
    monthLabel: _monthLabel(month),
    totalIncome: income,
    totalExpense: expense,
    balance: income - expense,
    count: rows.reduce((s, r) => s + Number(r.cnt), 0),
  }
}

function _monthLabel(month) {
  const [y, m] = month.split('-')
  return `${y}年${Number(m)}月`
}

/* -------------------- 分类支出（饼图） -------------------- */

async function categoryExpense(userId, month, limit = 10) {
  _assertMonth(month)
  const { start, end } = _monthRange(month)
  const [rows] = await pool.query(
    `SELECT category_id, COALESCE(SUM(amount), 0) AS total
       FROM records
      WHERE user_id = ?
        AND type = 'expense'
        AND is_deleted = 0
        AND record_date >= ? AND record_date < ?
      GROUP BY category_id
      ORDER BY total DESC
      LIMIT ?`,
    [userId, start, end, limit]
  )
  const total = rows.reduce((s, r) => s + Number(r.total), 0)
  return {
    month,
    total,
    items: rows.map(r => {
      const amount = Number(r.total)
      return {
        categoryId: r.category_id,
        amount,
        percent: total > 0 ? +((amount / total) * 100).toFixed(2) : 0,
      }
    }),
  }
}

/* -------------------- 分类收入（柱状图） -------------------- */

async function categoryIncome(userId, month) {
  _assertMonth(month)
  const { start, end } = _monthRange(month)
  const [rows] = await pool.query(
    `SELECT category_id, COALESCE(SUM(amount), 0) AS total
       FROM records
      WHERE user_id = ?
        AND type = 'income'
        AND is_deleted = 0
        AND record_date >= ? AND record_date < ?
      GROUP BY category_id
      ORDER BY total DESC`,
    [userId, start, end]
  )
  const total = rows.reduce((s, r) => s + Number(r.total), 0)
  return {
    month,
    total,
    items: rows.map(r => ({
      categoryId: r.category_id,
      amount: Number(r.total),
      percent: total > 0 ? +((Number(r.total) / total) * 100).toFixed(2) : 0,
    })),
  }
}

/* -------------------- 日支出趋势（折线/柱状） -------------------- */

async function dailyTrend(userId, month) {
  _assertMonth(month)
  const { start, end } = _monthRange(month)
  const days = _daysInMonth(month)
  // LEFT JOIN 思想：先拿到每天的总额，再补全缺失日期
  const [rows] = await pool.query(
    `SELECT record_date, COALESCE(SUM(amount), 0) AS total
       FROM records
      WHERE user_id = ?
        AND type = 'expense'
        AND is_deleted = 0
        AND record_date >= ? AND record_date < ?
      GROUP BY record_date`,
    [userId, start, end]
  )
  const map = new Map()
  for (const r of rows) {
    const key = r.record_date instanceof Date
      ? r.record_date.toISOString().slice(0, 10)
      : String(r.record_date)
    map.set(key, Number(r.total))
  }
  const [y, m] = month.split('-').map(Number)
  const series = []
  for (let d = 1; d <= days; d++) {
    const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    series.push({ date, day: d, amount: map.get(date) || 0 })
  }
  return { month, series }
}

/* -------------------- 首页：月份+收入/支出/结余+TOP3+最近10条 -------------------- */

async function home(userId) {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [ov, topCat, recent, todayExp] = await Promise.all([
    overview(userId, month),
    categoryExpense(userId, month, 3),
    _recentItems(userId, 10),
    _todayExpense(userId),
  ])
  return {
    month,
    monthLabel: ov.monthLabel,
    totalIncome: ov.totalIncome,
    totalExpense: ov.totalExpense,
    balance: ov.balance,
    todayExpense: todayExp,
    topCategories: topCat.items,
    recent,
  }
}

async function _recentItems(userId, limit) {
  const [rows] = await pool.query(
    `SELECT id, user_id, amount, type, category_id, sub_category_id, account_id,
            note, record_date, created_at, updated_at
       FROM records
      WHERE user_id = ? AND is_deleted = 0
      ORDER BY record_date DESC, id DESC
      LIMIT ?`,
    [userId, limit]
  )
  return rows.map(_toRecord)
}

async function _todayExpense(userId) {
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
       FROM records
      WHERE user_id = ?
        AND type = 'expense'
        AND is_deleted = 0
        AND record_date = CURDATE()`,
    [userId]
  )
  return Number(rows[0]?.total || 0)
}

function _toRecord(row) {
  return {
    id: row.id,
    userId: row.user_id,
    amount: Number(row.amount),
    type: row.type,
    categoryId: row.category_id,
    subCategoryId: row.sub_category_id,
    accountId: row.account_id,
    note: row.note,
    recordDate:
      row.record_date instanceof Date
        ? row.record_date.toISOString().slice(0, 10)
        : String(row.record_date),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/* -------------------- 月度聚合（前端 store 形状） -------------------- */

/**
 * 返回前端 store 期望的 monthlyStats 结构：
 * {
 *   month, monthLabel,
 *   totalIncome, totalExpense, balance, count,
 *   categoryMap: { [categoryId]: amount },
 *   dailyMap:    { 'YYYY-MM-DD': amount },
 *   records: [Record, ...]   // 当月全部记录（首页/统计页用）
 * }
 *
 * 前端原先从 IndexedDB 里取这些数据再聚合到 monthlyStats；
 * 现在由后端在 SQL 层聚合完毕，前端只管渲染。
 *
 * @param {number} userId
 * @param {string} month YYYY-MM（不传取当前月）
 */
async function monthly(userId, month) {
  if (!month) {
    const now = new Date()
    month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }
  _assertMonth(month)

  const [ov, catExp, catInc, daily, recs] = await Promise.all([
    overview(userId, month),
    categoryExpense(userId, month, 1000), // 1000 ≫ 内置分类数 12+，确保不漏
    categoryIncome(userId, month),
    dailyTrend(userId, month),
    detailRecords(userId, { month }),
  ])

  const categoryMap = {}
  for (const it of catExp.items) categoryMap[it.categoryId] = it.amount
  // 修复:不再把 income 分类合并进 categoryMap(categoryMap 在前端专给"分类支出"卡片用,
  //   混进去会导致收入金额被算进支出占比、且 getCategoryById(id, 'expense') 查不到变成"未分类")
  // 收入分布另存到 categoryIncomeMap,需要时再单独返回/消费
  const categoryIncomeMap = {}
  for (const it of catInc.items) categoryIncomeMap[it.categoryId] = it.amount

  const dailyMap = {}
  for (const s of daily.series) dailyMap[s.date] = s.amount

  return {
    month,
    monthLabel: ov.monthLabel,
    totalIncome: ov.totalIncome,
    totalExpense: ov.totalExpense,
    balance: ov.balance,
    count: ov.count,
    categoryMap,
    categoryIncomeMap,
    dailyMap,
    records: recs,
  }
}

/* -------------------- 明细（带分类/账户/备注等） -------------------- */

/**
 * 给导出 Excel 用：按月份 + 筛选（type/categoryId）拉取完整明细
 */
async function detailRecords(userId, options = {}) {
  const where = ['user_id = ?', 'is_deleted = 0']
  const params = [userId]
  if (options.month) {
    _assertMonth(options.month)
    const { start, end } = _monthRange(options.month)
    where.push('record_date >= ? AND record_date < ?')
    params.push(start, end)
  }
  if (options.type) {
    where.push('type = ?')
    params.push(options.type)
  }
  if (options.categoryId) {
    where.push('(category_id = ? OR sub_category_id = ?)')
    params.push(options.categoryId, options.categoryId)
  }
  const [rows] = await pool.query(
    `SELECT id, user_id, amount, type, category_id, sub_category_id, account_id,
            note, record_date, created_at, updated_at
       FROM records
      WHERE ${where.join(' AND ')}
      ORDER BY record_date ASC, id ASC`,
    params
  )
  return rows.map(_toRecord)
}

module.exports = {
  overview,
  categoryExpense,
  categoryIncome,
  dailyTrend,
  home,
  monthly,
  detailRecords,
  // 工具：测试或外部用
  _monthRange,
  _daysInMonth,
  _monthLabel,
}
