/**
 * 全局常量定义
 * 集中管理错误码、消息字符串、配置默认值等
 */

/**
 * 业务错误码（与 HTTP 状态码解耦，便于前端按码分支处理）
 */
const ErrorCode = Object.freeze({
  // 通用
  BAD_REQUEST: 'BAD_REQUEST',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  // 鉴权相关
  USER_EXISTS: 'USER_EXISTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  // 参数校验
  INVALID_USERNAME: 'INVALID_USERNAME',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
})

/**
 * 业务错误消息（中文）
 */
const ErrorMessage = Object.freeze({
  [ErrorCode.BAD_REQUEST]: '请求参数不合法',
  [ErrorCode.INTERNAL_ERROR]: '服务器内部错误',
  [ErrorCode.USER_EXISTS]: '该用户名已被注册',
  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.INVALID_CREDENTIALS]: '用户名或密码错误',
  [ErrorCode.INVALID_TOKEN]: '无效的令牌',
  [ErrorCode.TOKEN_EXPIRED]: '令牌已过期，请重新登录',
  [ErrorCode.UNAUTHORIZED]: '未登录或登录已过期',
  [ErrorCode.INVALID_USERNAME]: '用户名至少 2 个字符',
  [ErrorCode.INVALID_PASSWORD]: '密码至少 4 个字符',
})

/**
 * 用户名校验正则：字母/数字/下划线/中文/连字符，2-50 字符
 * 与前端 Auth.vue 的 canSubmit 规则保持一致
 */
const USERNAME_REGEX = /^[\w一-龥-]{2,50}$/

/**
 * 密码最小长度（与前端一致）
 */
const PASSWORD_MIN_LENGTH = 4
const PASSWORD_MAX_LENGTH = 64

/**
 * token 携带用户信息的字段名
 */
const TOKEN_PAYLOAD_FIELDS = Object.freeze(['id', 'username'])

module.exports = {
  ErrorCode,
  ErrorMessage,
  USERNAME_REGEX,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  TOKEN_PAYLOAD_FIELDS,
}
