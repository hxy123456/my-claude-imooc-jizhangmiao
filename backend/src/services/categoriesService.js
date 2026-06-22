/**
 * 分类 Service
 *
 * 数据模型：
 * - 内置分类（is_system=1）：全局共享，user_id=NULL
 * - 自定义分类（is_system=0）：user_id 隔离，仅本用户可见
 *
 * 前端拿到的形态：
 * {
 *   expense: [
 *     { id, name, icon, color, isSystem, children: [{id, name, isSystem, parentId}] },
 *     ...
 *   ],
 *   income: [...]
 * }
 */
const { pool } = require('../config/db')
const AppError = require('../utils/AppError')
const {
  ErrorCode,
  CATEGORY_TYPES,
  CATEGORY_NAME_MAX_LENGTH,
} = require('../config/constants')

/* -------------------- 内部：行映射 -------------------- */

function toCategory(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    type: row.type,
    sortOrder: row.sort_order,
    parentId: row.parent_id,
    isSystem: row.is_system === 1,
    isActive: row.is_active === 1,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/* -------------------- 读 -------------------- */

/**
 * 返回当前用户可见的分类树：内置全量 + 用户自定义
 * @param {number} userId
 */
async function getTreeForUser(userId) {
  const [rows] = await pool.query(
    `SELECT id, name, icon, color, type, sort_order, parent_id, is_system, is_active, user_id, created_at, updated_at
       FROM categories
      WHERE is_deleted = 0 AND is_active = 1
        AND (is_system = 1 OR user_id = ?)
      ORDER BY type ASC, sort_order ASC, id ASC`,
    [userId]
  )
  return _buildTree(rows.map(toCategory))
}

/**
 * 单条查询（按 id，按用户隔离）
 */
async function findById(userId, id) {
  const [rows] = await pool.query(
    `SELECT id, name, icon, color, type, sort_order, parent_id, is_system, is_active, user_id, created_at, updated_at
       FROM categories
      WHERE id = ? AND is_deleted = 0
        AND (is_system = 1 OR user_id = ?)
      LIMIT 1`,
    [id, userId]
  )
  return toCategory(rows[0])
}

/* -------------------- 写：新增子分类（用户自定义） -------------------- */

/**
 * 新增分类。业务规则：
 *  - 只允许新增"子分类"（必须带 parentId）；父类必须是已存在的分类（内置或用户自定义均可）
 *  - 不允许新增顶级分类（前端不提供该入口）
 */
async function addChild(userId, payload) {
  const { name, parentId, icon, color } = _validateAddInput(payload)
  // 父类必须存在且未被删除
  const parent = await _findParent(userId, parentId)
  if (!parent) {
    throw new AppError(ErrorCode.CATEGORY_NOT_FOUND, '父分类不存在')
  }
  // id 生成策略：user_{userId}_{timestamp36}_{rand4}，避免与内置 id 冲突
  const id = _genChildId(userId)
  const sortOrder = await _nextChildSort(parent.type, parent.id, userId)
  const [result] = await pool.query(
    `INSERT INTO categories
       (id, user_id, name, icon, color, type, sort_order, parent_id, is_system, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
    [id, userId, name, icon || null, color || null, parent.type, sortOrder, parent.id]
  )
  return findById(userId, id)
}

/* -------------------- 写：更新 -------------------- */

async function update(userId, id, payload) {
  const target = await findById(userId, id)
  if (!target) {
    throw new AppError(ErrorCode.CATEGORY_NOT_FOUND)
  }
  if (target.isSystem) {
    // 内置分类：仅允许改 sortOrder（业务上不会传，先预留）
    throw new AppError(ErrorCode.CATEGORY_SYSTEM_PROTECTED, '系统内置分类不可修改')
  }
  // 必须属于当前用户
  if (target.userId !== userId) {
    throw new AppError(ErrorCode.CATEGORY_NOT_FOUND)
  }
  const patch = _validateUpdateInput(payload)
  if (!Object.keys(patch).length) return target

  const fields = []
  const values = []
  if (patch.name !== undefined) {
    fields.push('name = ?')
    values.push(patch.name)
  }
  values.push(id, userId)
  await pool.query(
    `UPDATE categories SET ${fields.join(', ')}
       WHERE id = ? AND user_id = ? AND is_system = 0`,
    values
  )
  return findById(userId, id)
}

/* -------------------- 写：删除 -------------------- */

async function remove(userId, id) {
  const target = await findById(userId, id)
  if (!target) {
    throw new AppError(ErrorCode.CATEGORY_NOT_FOUND)
  }
  if (target.isSystem) {
    throw new AppError(ErrorCode.CATEGORY_SYSTEM_PROTECTED)
  }
  if (target.userId !== userId) {
    throw new AppError(ErrorCode.CATEGORY_NOT_FOUND)
  }
  // 若分类下还有未软删的记录（按 category_id 或 sub_category_id 命中），不允许删
  const [recRows] = await pool.query(
    `SELECT id FROM records
       WHERE user_id = ?
         AND is_deleted = 0
         AND (category_id = ? OR sub_category_id = ?)
       LIMIT 1`,
    [userId, id, id]
  )
  if (recRows.length) {
    throw new AppError(ErrorCode.CATEGORY_HAS_RECORDS)
  }
  await pool.query(
    'DELETE FROM categories WHERE id = ? AND user_id = ? AND is_system = 0',
    [id, userId]
  )
}

/* -------------------- helpers -------------------- */

function _buildTree(catList) {
  const tree = { expense: [], income: [] }
  // 先按 parent_id=null 建顶级
  const topMap = new Map()
  for (const c of catList) {
    if (!c.parentId) {
      const node = { ...c, children: [] }
      delete node.parentId
      topMap.set(c.id, node)
      tree[c.type].push(node)
    }
  }
  for (const c of catList) {
    if (c.parentId && topMap.has(c.parentId)) {
      const child = { ...c }
      delete child.parentId
      topMap.get(c.parentId).children.push(child)
    }
  }
  return tree
}

async function _findParent(userId, parentId) {
  if (!parentId) return null
  const [rows] = await pool.query(
    `SELECT id, name, type, parent_id, is_system, user_id, is_deleted
       FROM categories
      WHERE id = ? AND is_deleted = 0
        AND (is_system = 1 OR user_id = ?)
      LIMIT 1`,
    [parentId, userId]
  )
  return rows[0]
    ? toCategory(rows[0])
    : null
}

async function _nextChildSort(type, parentId, userId) {
  const [rows] = await pool.query(
    `SELECT COALESCE(MAX(sort_order), 0) AS m
       FROM categories
      WHERE type = ? AND parent_id = ?
        AND is_deleted = 0
        AND (is_system = 1 OR user_id = ?)`,
    [type, parentId, userId]
  )
  return (rows[0]?.m || 0) + 1
}

function _genChildId(userId) {
  return `u${userId}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 6)}`
}

function _validateAddInput({ name, parentId, type, icon, color } = {}) {
  if (typeof name !== 'string') {
    throw new AppError(ErrorCode.BAD_REQUEST, '分类名称不能为空')
  }
  const trimmed = name.trim()
  if (!trimmed) {
    throw new AppError(ErrorCode.BAD_REQUEST, '分类名称不能为空')
  }
  if (trimmed.length > CATEGORY_NAME_MAX_LENGTH) {
    throw new AppError(
      ErrorCode.BAD_REQUEST,
      `分类名称不能超过 ${CATEGORY_NAME_MAX_LENGTH} 个字符`
    )
  }
  if (!parentId || typeof parentId !== 'string') {
    throw new AppError(ErrorCode.BAD_REQUEST, '必须指定父分类')
  }
  if (type && !CATEGORY_TYPES.includes(type)) {
    // type 不传则由父类决定
    throw new AppError(ErrorCode.BAD_REQUEST, '分类类型不合法')
  }
  if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    throw new AppError(ErrorCode.BAD_REQUEST, '颜色格式错误（须为 #RRGGBB）')
  }
  return {
    name: trimmed,
    parentId,
    icon: icon || null,
    color: color || null,
  }
}

function _validateUpdateInput({ name } = {}) {
  const out = {}
  if (name !== undefined) {
    if (typeof name !== 'string') {
      throw new AppError(ErrorCode.BAD_REQUEST, '分类名称格式错误')
    }
    const trimmed = name.trim()
    if (!trimmed) {
      throw new AppError(ErrorCode.BAD_REQUEST, '分类名称不能为空')
    }
    if (trimmed.length > CATEGORY_NAME_MAX_LENGTH) {
      throw new AppError(
        ErrorCode.BAD_REQUEST,
        `分类名称不能超过 ${CATEGORY_NAME_MAX_LENGTH} 个字符`
      )
    }
    out.name = trimmed
  }
  return out
}

module.exports = {
  getTreeForUser,
  findById,
  addChild,
  update,
  remove,
}
