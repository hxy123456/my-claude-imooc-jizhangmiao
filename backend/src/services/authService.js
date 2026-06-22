/**
 * 鉴权业务层
 * 注册 / 登录 / 解析 token，全部逻辑集中在此处
 */
const userService = require('./userService')
const tokenService = require('./tokenService')
const accountsService = require('./accountsService')
const password = require('../utils/password')
const jwtUtil = require('../utils/jwt')
const AppError = require('../utils/AppError')
const {
  ErrorCode,
  USERNAME_REGEX,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} = require('../config/constants')

/**
 * 校验注册/登录入参
 * @throws {AppError}
 */
function validateCredentials(username, plainPassword) {
  if (typeof username !== 'string' || !USERNAME_REGEX.test(username.trim())) {
    throw new AppError(ErrorCode.INVALID_USERNAME)
  }
  if (
    typeof plainPassword !== 'string' ||
    plainPassword.length < PASSWORD_MIN_LENGTH ||
    plainPassword.length > PASSWORD_MAX_LENGTH
  ) {
    throw new AppError(ErrorCode.INVALID_PASSWORD)
  }
}

/**
 * 注册
 * @returns {Promise<{user, token}>}
 */
async function register(username, plainPassword) {
  const u = username.trim()
  validateCredentials(u, plainPassword)

  // 检查是否已存在
  const existing = await userService.findByUsernameWithHash(u)
  if (existing && existing.is_deleted === 0) {
    throw new AppError(ErrorCode.USER_EXISTS)
  }
  // 已软删除的同名账号视为可复用（生产可改为阻止并提示找回）
  // 此处简单处理：直接覆盖（不更新 is_deleted，避免歧义）
  if (existing && existing.is_deleted === 1) {
    throw new AppError(ErrorCode.USER_EXISTS, '该用户名已被注册')
  }

  const passwordHash = password.hash(plainPassword)
  const user = await userService.create({ username: u, passwordHash })
  const token = jwtUtil.sign(user)

  // 种入 3 个默认账户（现金 / 微信 / 支付宝）
  // 失败不应回滚用户——账户可以由用户在前端手动添加，这是 best-effort
  try {
    await accountsService.seedDefaults(user.id)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[auth] seedDefaults 失败（非致命）:', e.message)
  }

  return { user, token }
}

/**
 * 登录
 * @returns {Promise<{user, token}>}
 */
async function login(username, plainPassword) {
  const u = username.trim()
  validateCredentials(u, plainPassword)

  const row = await userService.findByUsernameWithHash(u)
  // 用同一条错误信息避免"用户名探测"
  if (!row || row.is_deleted === 1) {
    throw new AppError(ErrorCode.INVALID_CREDENTIALS)
  }
  if (!password.verify(plainPassword, row.password_hash)) {
    throw new AppError(ErrorCode.INVALID_CREDENTIALS)
  }

  // TODO 安全升级：检测到旧 SHA-256 哈希时，验证通过后用 bcrypt 重写
  // 现版本统一为 SHA-256，无升级动作

  const user = await userService.findById(row.id)
  const token = jwtUtil.sign(user)
  return { user, token }
}

/**
 * 校验 token 并返回当前用户
 * @param {string} token
 * @returns {Promise<Object>}
 */
async function resolveCurrentUser(token) {
  if (!token) {
    throw new AppError(ErrorCode.UNAUTHORIZED)
  }
  let payload
  try {
    payload = jwtUtil.verify(token)
  } catch (err) {
    if (err && err.name === 'TokenExpiredError') {
      throw new AppError(ErrorCode.TOKEN_EXPIRED)
    }
    throw new AppError(ErrorCode.INVALID_TOKEN)
  }
  const user = await userService.findById(payload.id)
  if (!user) {
    throw new AppError(ErrorCode.USER_NOT_FOUND, '用户不存在或已被删除')
  }
  return user
}

/**
 * 退出登录
 * 把当前 token 写入黑名单，使该 token 立即失效
 * @param {string} token
 * @param {{id:number}} user
 * @returns {Promise<void>}
 */
async function logout(token, user) {
  if (!token) {
    throw new AppError(ErrorCode.UNAUTHORIZED)
  }
  // 从 token 负载中拿 exp（unix 秒）作为黑名单行的 expires_at
  let exp
  try {
    const payload = jwtUtil.verify(token)
    exp = new Date(payload.exp * 1000)
  } catch (e) {
    // token 已过期或无效：仍写黑名单（兜底），exp 取现在
    exp = new Date()
  }
  await tokenService.revoke(token, user.id, exp)
}

/**
 * 更新当前用户资料（昵称 / 头像 URL）
 * - nickname：直接调用 userService.updateProfile
 * - avatar：直接写库
 * 鉴权方只暴露这个入口，避免 controller 跨服务调用
 */
async function updateMe(userId, patch) {
  const updated = await userService.updateProfile(userId, patch || {})
  // avatar 也可以通过此入口改（前端不直接调 users 路由，节省一次 roundtrip）
  if (patch && typeof patch.avatar === 'string' && patch.avatar.length > 0) {
    // 走 userService 私有路径不便，直接 SQL
    const { pool } = require('../config/db')
    await pool.query('UPDATE users SET avatar = ? WHERE id = ?', [patch.avatar, userId])
    return userService.findById(userId)
  }
  return updated
}

module.exports = { register, login, resolveCurrentUser, logout, updateMe }
