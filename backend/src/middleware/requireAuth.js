/**
 * JWT 鉴权中间件
 * - 从 Authorization: Bearer <token> 中提取
 * - 校验通过后挂载 req.user（完整 user 对象，不含 password_hash）
 * - 校验失败抛出 AppError，由 errorHandler 统一响应
 */
const authService = require('../services/authService')

async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || ''
    const m = header.match(/^Bearer\s+(.+)$/i)
    if (!m) {
      // 转发给 next 让 errorHandler 统一返回 401
      const AppError = require('../utils/AppError')
      const { ErrorCode } = require('../config/constants')
      return next(new AppError(ErrorCode.UNAUTHORIZED))
    }
    const token = m[1].trim()
    const user = await authService.resolveCurrentUser(token)
    req.user = user
    return next()
  } catch (err) {
    return next(err)
  }
}

module.exports = requireAuth
