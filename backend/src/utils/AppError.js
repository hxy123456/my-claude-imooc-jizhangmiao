/**
 * 业务异常类
 * 通过抛出 AppError → controller 捕获 → 统一错误中间件响应
 * 避免在 service / controller 中直接 res.json，让错误处理集中可追溯
 */

class AppError extends Error {
  /**
   * @param {string} code 业务错误码（config/constants.js 中的 ErrorCode）
   * @param {string} [message] 自定义消息；不传则取 ErrorMessage[code]
   * @param {number} [httpStatus] HTTP 状态码；默认按 code 推断
   */
  constructor(code, message, httpStatus) {
    const { ErrorMessage, ErrorCode } = require('../config/constants')
    const finalMessage = message || ErrorMessage[code] || '未知错误'
    super(finalMessage)
    this.name = 'AppError'
    this.code = code
    this.httpStatus = httpStatus || defaultStatusFor(code, ErrorCode)
    // 保留原始堆栈
    Error.captureStackTrace?.(this, this.constructor)
  }
}

function defaultStatusFor(code, ErrorCode) {
  if (code === ErrorCode.USER_EXISTS) return 409
  if (code === ErrorCode.USER_NOT_FOUND) return 404
  if (code === ErrorCode.NOT_FOUND) return 404
  if (
    code === ErrorCode.INVALID_CREDENTIALS ||
    code === ErrorCode.UNAUTHORIZED
  ) {
    return 401
  }
  if (code === ErrorCode.TOKEN_EXPIRED) return 401
  if (code === ErrorCode.TOKEN_REVOKED) return 401
  if (code === ErrorCode.INVALID_TOKEN) return 401
  if (code === ErrorCode.INVALID_USERNAME || code === ErrorCode.INVALID_PASSWORD) {
    return 400
  }
  if (code === ErrorCode.ACCOUNT_SYSTEM_PROTECTED) return 403
  if (code === ErrorCode.CATEGORY_SYSTEM_PROTECTED) return 403
  if (code === ErrorCode.CATEGORY_HAS_RECORDS) return 409
  if (code === ErrorCode.ACCOUNT_NOT_FOUND) return 404
  if (code === ErrorCode.CATEGORY_NOT_FOUND) return 404
  if (code === ErrorCode.RECORD_NOT_FOUND) return 404
  if (code === ErrorCode.UPLOAD_TOO_LARGE) return 413
  if (code === ErrorCode.UPLOAD_BAD_TYPE) return 415
  if (code === ErrorCode.UPLOAD_FAILED) return 400
  if (code === ErrorCode.BAD_REQUEST) return 400
  return 500
}

module.exports = AppError
