/**
 * JWT 鉴权中间件
 * - 从 Authorization: Bearer <token> 中提取
 * - 校验通过后挂载 req.user（完整 user 对象，不含 password_hash）
 * - 校验失败抛出 AppError，由 errorHandler 统一响应
 * - 同时把原始 token 挂到 req.token 供后续中间件使用（如 logout 需要把 token 写入黑名单）
 * - 检查 token 是否在黑名单中（用户已退出登录），命中即视为 401
 */
const authService = require('../services/authService')
const tokenService = require('../services/tokenService')
const AppError = require('../utils/AppError')
const { ErrorCode } = require('../config/constants')

async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || ''
    const m = header.match(/^Bearer\s+(.+)$/i)
    if (!m) {
      return next(new AppError(ErrorCode.UNAUTHORIZED))
    }
    const token = m[1].trim()
    req.token = token

    // 先检查黑名单（命中即拒绝，不查 DB 拿用户）
    if (await tokenService.isRevoked(token)) {
      return next(new AppError(ErrorCode.TOKEN_REVOKED, '登录已失效，请重新登录', 401))
    }

    const user = await authService.resolveCurrentUser(token)
    req.user = user
    return next()
  } catch (err) {
    return next(err)
  }
}

module.exports = requireAuth
