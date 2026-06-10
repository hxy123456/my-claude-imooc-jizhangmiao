/**
 * 统一错误处理中间件
 * - AppError → 按其 httpStatus / code / message 返回
 * - 其它 Error → 500 兜底（生产环境不暴露具体错误）
 */
const env = require('../config/env')

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  // AppError：业务可预期错误
  if (err && err.name === 'AppError') {
    return res.status(err.httpStatus).json({
      ok: false,
      code: err.code,
      message: err.message,
    })
  }

  // 其它：未预期错误
  // eslint-disable-next-line no-console
  console.error('[error]', err)
  return res.status(500).json({
    ok: false,
    code: 'INTERNAL_ERROR',
    message: env.NODE_ENV === 'production' ? '服务器内部错误' : (err.message || '服务器内部错误'),
  })
}

module.exports = errorHandler
