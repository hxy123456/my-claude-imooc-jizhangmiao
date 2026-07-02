/**
 * 分类路由（需鉴权）
 * GET    /api/categories          整棵树（内置 + 用户自定义）
 * POST   /api/categories          新增子分类  body: { name, parentId, icon?, color? }
 * PATCH  /api/categories/:id      修改  body: { name }
 * DELETE /api/categories/:id      删除
 */
const express = require('express')
const ctrl = require('../controllers/categoriesController')
const requireAuth = require('../middleware/requireAuth')

const router = express.Router()

router.use(requireAuth)

router.get('/', ctrl.getTree)
router.post('/', ctrl.create)
router.patch('/:id', ctrl.update)
router.delete('/:id', ctrl.remove)

module.exports = router
