/**
 * 统计 Controller
 */
const statsService = require('../services/statsService')
const exportService = require('../services/exportService')

/** GET /api/stats/home  首页 */
async function home(req, res, next) {
  try {
    const data = await statsService.home(req.user.id)
    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
}

/** GET /api/stats/overview?month=YYYY-MM */
async function overview(req, res, next) {
  try {
    const month = String(req.query.month || _currentMonth())
    const data = await statsService.overview(req.user.id, month)
    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/stats/monthly?month=YYYY-MM
 * 一次性返回月度聚合结果，结构对齐前端 store.monthlyStats：
 *   { month, monthLabel, totalIncome, totalExpense, balance, count,
 *     categoryMap, dailyMap, records }
 */
async function monthly(req, res, next) {
  try {
    const month = String(req.query.month || _currentMonth())
    const data = await statsService.monthly(req.user.id, month)
    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
}

/** GET /api/stats/category-expense?month=YYYY-MM&limit=10 */
async function categoryExpense(req, res, next) {
  try {
    const month = String(req.query.month || _currentMonth())
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10))
    const data = await statsService.categoryExpense(req.user.id, month, limit)
    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
}

/** GET /api/stats/category-income?month=YYYY-MM */
async function categoryIncome(req, res, next) {
  try {
    const month = String(req.query.month || _currentMonth())
    const data = await statsService.categoryIncome(req.user.id, month)
    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
}

/** GET /api/stats/daily-trend?month=YYYY-MM */
async function dailyTrend(req, res, next) {
  try {
    const month = String(req.query.month || _currentMonth())
    const data = await statsService.dailyTrend(req.user.id, month)
    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
}

/** GET /api/stats/export?month=YYYY-MM  → application/vnd.openxmlformats-officedocument.spreadsheetml.sheet */
async function exportMonth(req, res, next) {
  try {
    const month = String(req.query.month || _currentMonth())
    const wb = await exportService.buildMonthWorkbook(req.user.id, month)
    const buf = await wb.xlsx.writeBuffer()
    const filename = `countcat-${month}.xlsx`
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    )
    res.setHeader('Content-Length', buf.length)
    res.send(Buffer.from(buf))
  } catch (err) {
    next(err)
  }
}

function _currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

module.exports = {
  home,
  overview,
  monthly,
  categoryExpense,
  categoryIncome,
  dailyTrend,
  exportMonth,
}
