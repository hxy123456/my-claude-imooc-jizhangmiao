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
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  // 鉴权相关
  USER_EXISTS: 'USER_EXISTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  // 参数校验
  INVALID_USERNAME: 'INVALID_USERNAME',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  // 业务资源
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  ACCOUNT_SYSTEM_PROTECTED: 'ACCOUNT_SYSTEM_PROTECTED',
  CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',
  CATEGORY_SYSTEM_PROTECTED: 'CATEGORY_SYSTEM_PROTECTED',
  CATEGORY_HAS_RECORDS: 'CATEGORY_HAS_RECORDS',
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  // 上传
  UPLOAD_TOO_LARGE: 'UPLOAD_TOO_LARGE',
  UPLOAD_BAD_TYPE: 'UPLOAD_BAD_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
})

/**
 * 业务错误消息（中文）
 */
const ErrorMessage = Object.freeze({
  [ErrorCode.BAD_REQUEST]: '请求参数不合法',
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.INTERNAL_ERROR]: '服务器内部错误',
  [ErrorCode.USER_EXISTS]: '该用户名已被注册',
  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.INVALID_CREDENTIALS]: '用户名或密码错误',
  [ErrorCode.INVALID_TOKEN]: '无效的令牌',
  [ErrorCode.TOKEN_EXPIRED]: '令牌已过期，请重新登录',
  [ErrorCode.TOKEN_REVOKED]: '登录已失效，请重新登录',
  [ErrorCode.UNAUTHORIZED]: '未登录或登录已过期',
  [ErrorCode.INVALID_USERNAME]: '用户名至少 2 个字符',
  [ErrorCode.INVALID_PASSWORD]: '密码至少 4 个字符',
  [ErrorCode.ACCOUNT_NOT_FOUND]: '账户不存在',
  [ErrorCode.ACCOUNT_SYSTEM_PROTECTED]: '系统内置账户不可删除',
  [ErrorCode.CATEGORY_NOT_FOUND]: '分类不存在',
  [ErrorCode.CATEGORY_SYSTEM_PROTECTED]: '系统内置分类不可删除',
  [ErrorCode.CATEGORY_HAS_RECORDS]: '该分类下还有记录，无法删除',
  [ErrorCode.RECORD_NOT_FOUND]: '记录不存在',
  [ErrorCode.UPLOAD_TOO_LARGE]: '上传文件过大',
  [ErrorCode.UPLOAD_BAD_TYPE]: '仅支持 png / jpg / webp 格式',
  [ErrorCode.UPLOAD_FAILED]: '文件上传失败',
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

/**
 * 记录类型枚举
 */
const RECORD_TYPES = Object.freeze(['expense', 'income'])

/**
 * 分类类型枚举
 */
const CATEGORY_TYPES = Object.freeze(['expense', 'income'])

/**
 * 账户名长度上限
 */
const ACCOUNT_NAME_MAX_LENGTH = 20

/**
 * 分类名长度上限
 */
const CATEGORY_NAME_MAX_LENGTH = 20

/**
 * 记录备注长度上限（与 schema CHECK 约束一致）
 */
const RECORD_NOTE_MAX_LENGTH = 50

/**
 * 单笔记账金额上限（与 schema DECIMAL(10,2) 一致）
 */
const RECORD_AMOUNT_MAX = 99_999_999.99

/**
 * 上传图片大小上限：2 MB
 */
const UPLOAD_IMAGE_MAX_BYTES = 2 * 1024 * 1024

/**
 * 允许的图片 MIME
 */
const UPLOAD_IMAGE_MIME = Object.freeze([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
])

module.exports = {
  ErrorCode,
  ErrorMessage,
  USERNAME_REGEX,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  TOKEN_PAYLOAD_FIELDS,
  RECORD_TYPES,
  CATEGORY_TYPES,
  ACCOUNT_NAME_MAX_LENGTH,
  CATEGORY_NAME_MAX_LENGTH,
  RECORD_NOTE_MAX_LENGTH,
  RECORD_AMOUNT_MAX,
  UPLOAD_IMAGE_MAX_BYTES,
  UPLOAD_IMAGE_MIME,
}
