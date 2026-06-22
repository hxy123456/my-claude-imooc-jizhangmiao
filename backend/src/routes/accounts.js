/**
 * 账户路由（需鉴权）
 * GET    /api/accounts
 * POST   /api/accounts
 * PATCH  /api/accounts/:id
 * DELETE /api/accounts/:id
 */
const express = require('express')
const ctrl = require('../controllers/accountsController')
const requireAuth = require('../middleware/requireAuth')

const router = express.Router()

router.use(requireAuth)

router.get('/', ctrl.list)
router.post('/', ctrl.create)
router.patch('/:id', ctrl.update)
router.delete('/:id', ctrl.remove)

module.exports = router
