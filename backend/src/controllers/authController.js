/**
 * 鉴权 Controller
 * 只做请求/响应编排，业务逻辑放 service
 */
const authService = require('../services/authService')

/**
 * POST /api/auth/register
 * body: { username, password }
 * resp: { ok:true, data:{ user, token } }
 */
async function register(req, res, next) {
  try {
    const { username, password } = req.body || {}
    const { user, token } = await authService.register(username, password)
    return res.status(201).json({
      ok: true,
      data: { user, token },
    })
  } catch (err) {
    return next(err)
  }
}

/**
 * POST /api/auth/login
 * body: { username, password }
 * resp: { ok:true, data:{ user, token } }
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body || {}
    const { user, token } = await authService.login(username, password)
    return res.json({
      ok: true,
      data: { user, token },
    })
  } catch (err) {
    return next(err)
  }
}

/**
 * GET /api/auth/me  — 需鉴权
 * resp: { ok:true, data:{ user } }
 */
async function me(req, res) {
  return res.json({
    ok: true,
    data: { user: req.user },
  })
}

module.exports = { register, login, me }
