/**
 * 账户 Service
 * SQL 集中点；所有按 user_id 过滤的逻辑都在这里
 */
const { pool } = require('../config/db')
const AppError = require('../utils/AppError')
const { ErrorCode, ACCOUNT_NAME_MAX_LENGTH } = require('../config/constants')

/** DB 行 → 业务对象 */
function toAccount(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    icon: row.icon,
    isSystem: row.is_system === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * 获取用户所有账户（按 sort_order 升序、id 升序）
 * @param {number} userId
 */
async function listByUser(userId) {
  const [rows] = await pool.query(
    `SELECT id, user_id, name, icon, is_system, sort_order, created_at, updated_at
       FROM accounts
      WHERE user_id = ? AND is_deleted = 0
      ORDER BY sort_order ASC, id ASC`,
    [userId]
  )
  return rows.map(toAccount)
}

/**
 * 单条查询（带用户隔离校验）
 */
async function findById(userId, id) {
  const [rows] = await pool.query(
    `SELECT id, user_id, name, icon, is_system, sort_order, created_at, updated_at
       FROM accounts
      WHERE id = ? AND user_id = ? AND is_deleted = 0
      LIMIT 1`,
    [id, userId]
  )
  return toAccount(rows[0])
}

/**
 * 校验入参 + 新增
 * @returns {Promise<Object>} 新建账户
 */
async function create(userId, payload) {
  const { name, icon } = _validateCreateInput(payload)

  // 同一用户下名字不重复（大小写不敏感）
  const [dup] = await pool.query(
    'SELECT id FROM accounts WHERE user_id = ? AND LOWER(name) = LOWER(?) AND is_deleted = 0 LIMIT 1',
    [userId, name]
  )
  if (dup.length) {
    throw new AppError(ErrorCode.BAD_REQUEST, '账户名称已存在')
  }

  // 新账户 sort_order = 当前最大 + 10
  const [maxRow] = await pool.query(
    'SELECT COALESCE(MAX(sort_order), 0) AS m FROM accounts WHERE user_id = ? AND is_deleted = 0',
    [userId]
  )
  const sortOrder = (maxRow[0]?.m || 0) + 10

  const [result] = await pool.query(
    'INSERT INTO accounts (user_id, name, icon, is_system, sort_order) VALUES (?, ?, ?, 0, ?)',
    [userId, name, icon, sortOrder]
  )
  return findById(userId, result.insertId)
}

/**
 * 更新账户（系统账户也允许改 name/icon）
 * @returns {Promise<Object>} 更新后的账户
 */
async function update(userId, id, payload) {
  const target = await findById(userId, id)
  if (!target) {
    throw new AppError(ErrorCode.ACCOUNT_NOT_FOUND)
  }
  const patch = _validateUpdateInput(payload)

  // 名字重复校验
  if (patch.name) {
    const [dup] = await pool.query(
      'SELECT id FROM accounts WHERE user_id = ? AND LOWER(name) = LOWER(?) AND id <> ? AND is_deleted = 0 LIMIT 1',
      [userId, patch.name, id]
    )
    if (dup.length) {
      throw new AppError(ErrorCode.BAD_REQUEST, '账户名称已存在')
    }
  }

  const fields = []
  const values = []
  if (patch.name !== undefined) {
    fields.push('name = ?')
    values.push(patch.name)
  }
  if (patch.icon !== undefined) {
    fields.push('icon = ?')
    values.push(patch.icon)
  }
  if (!fields.length) {
    return target // 没有需要改的
  }
  values.push(id, userId)
  await pool.query(
    `UPDATE accounts SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    values
  )
  return findById(userId, id)
}

/**
 * 删除账户（系统账户拒绝；可关联到 record 但软删即可）
 * @returns {Promise<void>}
 */
async function remove(userId, id) {
  const target = await findById(userId, id)
  if (!target) {
    throw new AppError(ErrorCode.ACCOUNT_NOT_FOUND)
  }
  if (target.isSystem) {
    throw new AppError(ErrorCode.ACCOUNT_SYSTEM_PROTECTED)
  }
  // 软删：保留记录（records.account_id 留作历史）
  await pool.query(
    'UPDATE accounts SET is_deleted = 1 WHERE id = ? AND user_id = ?',
    [id, userId]
  )
}

/**
 * 校验并清洗新建入参
 */
function _validateCreateInput({ name, icon } = {}) {
  if (typeof name !== 'string') {
    throw new AppError(ErrorCode.BAD_REQUEST, '账户名称不能为空')
  }
  const trimmed = name.trim()
  if (!trimmed) {
    throw new AppError(ErrorCode.BAD_REQUEST, '账户名称不能为空')
  }
  if (trimmed.length > ACCOUNT_NAME_MAX_LENGTH) {
    throw new AppError(
      ErrorCode.BAD_REQUEST,
      `账户名称不能超过 ${ACCOUNT_NAME_MAX_LENGTH} 个字符`
    )
  }
  const safeIcon = (typeof icon === 'string' && icon.trim()) ? icon.trim() : '💳'
  return { name: trimmed, icon: safeIcon }
}

/**
 * 校验并清洗更新入参（部分更新）
 */
function _validateUpdateInput({ name, icon } = {}) {
  const out = {}
  if (name !== undefined) {
    if (typeof name !== 'string') {
      throw new AppError(ErrorCode.BAD_REQUEST, '账户名称格式错误')
    }
    const trimmed = name.trim()
    if (!trimmed) {
      throw new AppError(ErrorCode.BAD_REQUEST, '账户名称不能为空')
    }
    if (trimmed.length > ACCOUNT_NAME_MAX_LENGTH) {
      throw new AppError(
        ErrorCode.BAD_REQUEST,
        `账户名称不能超过 ${ACCOUNT_NAME_MAX_LENGTH} 个字符`
      )
    }
    out.name = trimmed
  }
  if (icon !== undefined) {
    if (typeof icon !== 'string' || !icon.trim()) {
      throw new AppError(ErrorCode.BAD_REQUEST, '账户图标格式错误')
    }
    out.icon = icon.trim()
  }
  return out
}

/**
 * 首登种入默认账户
 * - 仅在用户 accounts 表完全为空时种入（用户已有自定义账户时不再追加）
 */
async function seedDefaults(userId) {
  const [exists] = await pool.query(
    'SELECT id FROM accounts WHERE user_id = ? AND is_deleted = 0 LIMIT 1',
    [userId]
  )
  if (exists.length) return
  const defaults = [
    { name: '现金',   icon: '💵',  sort: 10 },
    { name: '微信',   icon: '💚',  sort: 20 },
    { name: '支付宝', icon: '📱',  sort: 30 },
  ]
  for (const d of defaults) {
    await pool.query(
      'INSERT INTO accounts (user_id, name, icon, is_system, sort_order) VALUES (?, ?, ?, 1, ?)',
      [userId, d.name, d.icon, d.sort]
    )
  }
}

module.exports = {
  listByUser,
  findById,
  create,
  update,
  remove,
  seedDefaults,
}
