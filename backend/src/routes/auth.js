/**
 * 鉴权路由
 * POST /api/auth/register — 注册
 * POST /api/auth/login    — 登录
 * GET  /api/auth/me       — 当前用户（需鉴权）
 */
const express = require('express')
const ctrl = require('../controllers/authController')
const requireAuth = require('../middleware/requireAuth')

const router = express.Router()

router.post('/register', ctrl.register)
router.post('/login', ctrl.login)
router.get('/me', requireAuth, ctrl.me)

module.exports = router
