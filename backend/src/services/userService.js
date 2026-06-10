/**
 * 用户数据访问层
 * 所有 SQL 仅在此模块中编写，service 之外不直接操作 db
 */
const { pool } = require('../config/db')

/**
 * 行映射：DB 字段 snake_case → 业务对象 camelCase
 * @param {Object} row
 */
function toUser(row) {
  if (!row) return null
  return {
    id: row.id,
    username: row.username,
    nickname: row.nickname,
    avatar: row.avatar,
    createdAt: row.created_at,
  }
}

/**
 * 根据用户名查询（包含 password_hash，仅供 AuthService 使用）
 * @param {string} username
 * @returns {Promise<{id,username,password_hash}|null>}
 */
async function findByUsernameWithHash(username) {
  const [rows] = await pool.query(
    'SELECT id, username, password_hash, is_deleted FROM users WHERE username = ? LIMIT 1',
    [username]
  )
  return rows[0] || null
}

/**
 * 根据 id 查询
 * @param {number} id
 * @returns {Promise<Object|null>} 不含 password_hash
 */
async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, username, nickname, avatar, created_at FROM users WHERE id = ? AND is_deleted = 0 LIMIT 1',
    [id]
  )
  return toUser(rows[0])
}

/**
 * 创建新用户
 * @param {{username:string, passwordHash:string}} input
 * @returns {Promise<{id,username,createdAt}>}
 */
async function create({ username, passwordHash }) {
  const [result] = await pool.query(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)',
    [username, passwordHash]
  )
  return findById(result.insertId)
}

module.exports = {
  findByUsernameWithHash,
  findById,
  create,
  toUser,
}
