/**
 * 鉴权路由
 * POST /api/auth/register — 注册
 * POST /api/auth/login    — 登录
 * POST /api/auth/logout   — 退出登录（把 token 加入黑名单）
 * GET  /api/auth/me       — 当前用户（需鉴权）
 */
const express = require('express')
const ctrl = require('../controllers/authController')
const requireAuth = require('../middleware/requireAuth')

const router = express.Router()

router.post('/register', ctrl.register)
router.post('/login', ctrl.login)
router.post('/logout', requireAuth, ctrl.logout)
router.get('/me', requireAuth, ctrl.me)
router.patch('/me', requireAuth, ctrl.updateMe)

module.exports = router
