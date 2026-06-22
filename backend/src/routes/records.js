/**
 * 记录路由（需鉴权）
 * GET    /api/records            列表（分页 + 筛选）
 * GET    /api/records/recent     最近 N 条
 * GET    /api/records/:id        详情
 * POST   /api/records            新增
 * PATCH  /api/records/:id        修改
 * DELETE /api/records/:id        软删
 */
const express = require('express')
const ctrl = require('../controllers/recordsController')
const requireAuth = require('../middleware/requireAuth')

const router = express.Router()

router.use(requireAuth)

// 注意：具体路径（recent）必须放在 :id 之前，否则会被 :id 吞掉
router.get('/recent', ctrl.recent)
router.get('/', ctrl.list)
router.get('/:id', ctrl.detail)
router.post('/', ctrl.create)
router.patch('/:id', ctrl.update)
router.delete('/:id', ctrl.remove)

module.exports = router
