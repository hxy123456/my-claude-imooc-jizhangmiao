/**
 * 统计路由（需鉴权）
 *
 * GET /api/stats/home                  首页
 * GET /api/stats/overview?month=YYYY-MM  统计页概览
 * GET /api/stats/category-expense?month=YYYY-MM&limit=10
 * GET /api/stats/category-income?month=YYYY-MM
 * GET /api/stats/daily-trend?month=YYYY-MM
 * GET /api/stats/export?month=YYYY-MM    Excel 下载
 */
const express = require('express')
const ctrl = require('../controllers/statsController')
const requireAuth = require('../middleware/requireAuth')

const router = express.Router()

router.use(requireAuth)

router.get('/home', ctrl.home)
router.get('/overview', ctrl.overview)
router.get('/monthly', ctrl.monthly)
router.get('/category-expense', ctrl.categoryExpense)
router.get('/category-income', ctrl.categoryIncome)
router.get('/daily-trend', ctrl.dailyTrend)
router.get('/export', ctrl.exportMonth)

module.exports = router
