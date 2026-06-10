/**
 * 密码哈希工具
 *
 * V1.0.1 前端使用 SHA-256 哈希明文（utils/db.js#hashPassword）。
 * V1.1+ 服务端沿用 SHA-256 方案以便无缝迁移老用户数据。
 *
 * ⚠️ 安全提示：SHA-256 无盐，相同密码生成相同哈希，存在彩虹表风险。
 *   生产环境强烈建议升级到 bcrypt/argon2（通过 PASSWORD_ALGO=bcrypt 切换）。
 *   升级路径：登录时检测到 SHA-256 旧哈希 → 验证通过 → 用 bcrypt 重写密码字段。
 *   详见 AuthService#login 中的 TODO 注释。
 */
const crypto = require('crypto')
const env = require('../config/env')

/**
 * 对明文密码做哈希，返回 hex 字符串
 * @param {string} password 明文密码
 * @returns {string} hex 编码的哈希值
 */
function hash(password) {
  if (env.password.algo === 'bcrypt') {
    // bcrypt 路径（暂未启用依赖，保留接口）
    // 启用时需 npm i bcrypt，并在 password 字段升级完成后切换
    throw new Error('bcrypt 算法尚未启用：请先 npm i bcrypt 并解除此分支注释')
  }
  // 默认 SHA-256（与前端对齐）
  return crypto.createHash('sha256').update(password, 'utf8').digest('hex')
}

/**
 * 验证明文密码是否匹配已存储的哈希
 * @param {string} password 明文
 * @param {string} storedHash 数据库中存储的哈希
 * @returns {boolean}
 */
function verify(password, storedHash) {
  if (!storedHash) return false
  return hash(password) === storedHash
}

module.exports = { hash, verify }
