/**
 * 用户数据访问层（个人资料 + 头像）
 * 原来 userService 只有鉴权需要的查询（findByUsernameWithHash / findById / create）
 * 这里新增：
 *   - updateAvatar(userId, url)
 *   - updateProfile(userId, { nickname })
 *   - getAvatarPath()：把写入磁盘的相对路径拼成可对外暴露的 URL
 */
const path = require('path')
const fs = require('fs/promises')
const { pool } = require('../config/db')
const env = require('../config/env')

const UPLOAD_BASE_DIR = path.resolve(__dirname, '..', '..', 'public', 'uploads')

/**
 * 行 → 业务对象（与 userService 兼容；不返回 password_hash）
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

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, username, nickname, avatar, created_at FROM users WHERE id = ? AND is_deleted = 0 LIMIT 1',
    [id]
  )
  return toUser(rows[0])
}

async function findByIdWithHash(id) {
  const [rows] = await pool.query(
    'SELECT id, username, password_hash, is_deleted FROM users WHERE id = ? LIMIT 1',
    [id]
  )
  return rows[0] || null
}

/**
 * 按用户名查（带 password_hash），仅供 AuthService 使用
 */
async function findByUsernameWithHash(username) {
  const [rows] = await pool.query(
    'SELECT id, username, password_hash, is_deleted FROM users WHERE username = ? LIMIT 1',
    [username]
  )
  return rows[0] || null
}

async function create({ username, passwordHash }) {
  const [result] = await pool.query(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)',
    [username, passwordHash]
  )
  return findById(result.insertId)
}

/**
 * 把用户上传的头像写到 /public/uploads/avatars/{userId}/{uuid}.{ext}
 * 返回公开可访问的 URL
 *
 * 设计：默认返回**相对路径**（/uploads/...），由前端 <img :src> 解析为同源 URL。
 *   - dev 模式：Vite 代理 /uploads 到后端（见 vite.config.js）
 *   - 生产：nginx / 同源部署直接命中
 *   高级用户可在 env.PUBLIC_BASE_URL 显式配置 CDN / 跨域绝对地址
 *
 * @param {number} userId
 * @param {Buffer} buffer 文件二进制
 * @param {string} mimetype  image/png | image/jpeg | image/webp
 * @returns {Promise<string>} 头像 URL
 */
async function saveAvatar(userId, buffer, mimetype) {
  if (!buffer || buffer.length === 0) {
    // 0 字节文件：multer 已通过 fileFilter 的 mime 检查，但内容为空仍不可用
    const AppError = require('../utils/AppError')
    const { ErrorCode } = require('../config/constants')
    throw new AppError(ErrorCode.UPLOAD_FAILED, '头像文件为空')
  }
  const ext = _extFromMime(mimetype)
  const fileName = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const userDir = path.join(UPLOAD_BASE_DIR, 'avatars', String(userId))
  await fs.mkdir(userDir, { recursive: true })
  const filePath = path.join(userDir, fileName)
  await fs.writeFile(filePath, buffer)
  // 公开 URL：默认相对路径（前端 <img :src> 解析为同源）；env.PUBLIC_BASE_URL 设了就用绝对
  const base = _publicBaseUrl()
  const publicUrl = `${base}/uploads/avatars/${userId}/${fileName}`
  // 写回 DB
  await pool.query('UPDATE users SET avatar = ? WHERE id = ?', [publicUrl, userId])
  return publicUrl
}

/**
 * 更新资料（仅 nickname；avatar 由 saveAvatar 单独维护）
 */
async function updateProfile(userId, { nickname } = {}) {
  const fields = []
  const values = []
  if (nickname !== undefined) {
    if (typeof nickname !== 'string') {
      const AppError = require('../utils/AppError')
      const { ErrorCode } = require('../config/constants')
      throw new AppError(ErrorCode.BAD_REQUEST, '昵称格式错误')
    }
    const trimmed = nickname.trim()
    if (trimmed.length > 50) {
      const AppError = require('../utils/AppError')
      const { ErrorCode } = require('../config/constants')
      throw new AppError(ErrorCode.BAD_REQUEST, '昵称最多 50 个字符')
    }
    fields.push('nickname = ?')
    values.push(trimmed || null)
  }
  if (!fields.length) return findById(userId)
  values.push(userId)
  await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values)
  return findById(userId)
}

function _extFromMime(mime) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg'
  if (mime === 'image/webp') return 'webp'
  return 'bin'
}

function _publicBaseUrl() {
  // 默认空串 → saveAvatar 输出相对路径（/uploads/...），由前端同源或 vite 代理解析
  // 显式配置时（例如 CDN / 跨域）才用绝对地址
  if (env.PUBLIC_BASE_URL) return env.PUBLIC_BASE_URL.replace(/\/$/, '')
  return ''
}

module.exports = {
  findById,
  findByIdWithHash,
  findByUsernameWithHash,
  create,
  saveAvatar,
  updateProfile,
  toUser,
}
