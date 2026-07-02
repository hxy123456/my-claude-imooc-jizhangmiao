/**
 * Token 黑名单服务
 *
 * 用途：实现真正的"退出登录"——JWT 一旦签发默认长期有效（默认 7 天），
 *      即便前端清掉 localStorage，攻击者拿到 token 仍能调用接口。
 *      引入黑名单后：
 *        - 用户主动 logout → 把当前 token 的 SHA-256 哈希写入黑名单
 *        - requireAuth 中间件检查 token 是否在黑名单中，命中即 401
 *
 * 设计取舍：
 *   - 存哈希而非原文：token 较长（200+ 字符），存 64 字符哈希更紧凑；
 *     同时即使数据库泄漏也不会泄漏原始 token
 *   - 存 expires_at：token 原 exp 到了之后行已无意义，便于后台定期清理
 *   - 不阻塞请求热路径：黑名单查询加在鉴权后，单条 PK 查询可接受
 */
const crypto = require('crypto')
const { pool } = require('../config/db')

/**
 * 对 token 做 SHA-256 哈希（hex 64 字符，与 token_blacklist.token_hash 对齐）
 * @param {string} token
 * @returns {string}
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex')
}

/**
 * 把 token 加入黑名单
 * @param {string} token
 * @param {number} userId
 * @param {Date|number|string} expiresAt  原 token 的 exp
 * @returns {Promise<void>}
 */
async function revoke(token, userId, expiresAt) {
  const tokenHash = hashToken(token)
  // 用 INSERT IGNORE 避免重复退出同一 token 时主键冲突
  const exp = expiresAt instanceof Date ? expiresAt : new Date(expiresAt)
  await pool.query(
    'INSERT IGNORE INTO token_blacklist (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
    [tokenHash, userId, exp]
  )
}

/**
 * 检查 token 是否在黑名单
 * @param {string} token
 * @returns {Promise<boolean>}
 */
async function isRevoked(token) {
  const tokenHash = hashToken(token)
  const [rows] = await pool.query(
    'SELECT 1 FROM token_blacklist WHERE token_hash = ? LIMIT 1',
    [tokenHash]
  )
  return rows.length > 0
}

/**
 * 清理已过期的黑名单行（释放空间，与 token 自然过期保持一致）
 * 可由定时任务调用
 * @returns {Promise<number>} 删除的行数
 */
async function purgeExpired() {
  const [result] = await pool.query(
    'DELETE FROM token_blacklist WHERE expires_at < NOW()'
  )
  return result.affectedRows || 0
}

module.exports = {
  hashToken,
  revoke,
  isRevoked,
  purgeExpired,
}
