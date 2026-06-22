/**
 * 记录 Service
 *
 * 列表查询统一走 _buildListQuery，保证分页 / 筛选 / 排序一致。
 * 统计类（首页 / 统计页）走 statsService，不在本文件。
 */
const { pool } = require('../config/db')
const AppError = require('../utils/AppError')
const {
  ErrorCode,
  RECORD_TYPES,
  RECORD_NOTE_MAX_LENGTH,
  RECORD_AMOUNT_MAX,
} = require('../config/constants')

/* -------------------- 行映射 -------------------- */

function toRecord(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    amount: Number(row.amount),
    type: row.type,
    categoryId: row.category_id,
    subCategoryId: row.sub_category_id,
    accountId: row.account_id,
    note: row.note,
    recordDate:
      row.record_date instanceof Date
        ? row.record_date.toISOString().slice(0, 10)
        : String(row.record_date),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/* -------------------- 列表（分页） -------------------- */

/**
 * 分页查询记录
 * @param {number} userId
 * @param {Object} options
 *   - page: 默认 1
 *   - pageSize: 默认 20
 *   - type: 'expense' | 'income'
 *   - categoryId: 顶层分类 id（按 category_id 过滤）
 *   - month: 'YYYY-MM'（按 record_date 月份过滤）
 *   - startDate, endDate: 'YYYY-MM-DD'
 *   - keyword: 备注模糊搜索
 *   - accountId
 */
async function list(userId, options = {}) {
  const page = Math.max(1, Number.parseInt(options.page, 10) || 1)
  const pageSize = Math.min(
    100,
    Math.max(1, Number.parseInt(options.pageSize, 10) || 20)
  )
  const offset = (page - 1) * pageSize
  const where = ['user_id = ?', 'is_deleted = 0']
  const params = [userId]

  if (options.type) {
    if (!RECORD_TYPES.includes(options.type)) {
      throw new AppError(ErrorCode.BAD_REQUEST, '记录类型不合法')
    }
    where.push('type = ?')
    params.push(options.type)
  }
  if (options.categoryId) {
    where.push('(category_id = ? OR sub_category_id = ?)')
    params.push(options.categoryId, options.categoryId)
  }
  if (options.accountId) {
    where.push('account_id = ?')
    params.push(options.accountId)
  }
  if (options.month) {
    _assertMonth(options.month)
    where.push("DATE_FORMAT(record_date, '%Y-%m') = ?")
    params.push(options.month)
  }
  if (options.startDate) {
    _assertDate(options.startDate, 'startDate')
    where.push('record_date >= ?')
    params.push(options.startDate)
  }
  if (options.endDate) {
    _assertDate(options.endDate, 'endDate')
    where.push('record_date <= ?')
    params.push(options.endDate)
  }
  if (options.keyword) {
    where.push('note LIKE ?')
    params.push(`%${options.keyword}%`)
  }

  const whereSql = where.join(' AND ')
  // count
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM records WHERE ${whereSql}`,
    params
  )
  const total = countRows[0]?.total || 0
  // data
  const [rows] = await pool.query(
    `SELECT id, user_id, amount, type, category_id, sub_category_id, account_id,
            note, record_date, created_at, updated_at
       FROM records
      WHERE ${whereSql}
      ORDER BY record_date DESC, id DESC
      LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  )
  return {
    items: rows.map(toRecord),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    hasMore: offset + rows.length < total,
  }
}

/* -------------------- 单条 -------------------- */

async function findById(userId, id) {
  const [rows] = await pool.query(
    `SELECT id, user_id, amount, type, category_id, sub_category_id, account_id,
            note, record_date, created_at, updated_at
       FROM records
      WHERE id = ? AND user_id = ? AND is_deleted = 0
      LIMIT 1`,
    [id, userId]
  )
  return toRecord(rows[0])
}

/* -------------------- 写 -------------------- */

async function create(userId, payload) {
  const v = _validateRecordInput(payload)
  // 校验 category_id / sub_category_id 存在（内置或用户自定义均可）
  await _assertCategory(userId, v.categoryId)
  if (v.subCategoryId) {
    await _assertCategory(userId, v.subCategoryId)
  }
  // 校验 accountId 可选
  if (v.accountId) {
    await _assertAccount(userId, v.accountId)
  }
  const [r] = await pool.query(
    `INSERT INTO records
       (user_id, amount, type, category_id, sub_category_id, account_id, note, record_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      v.amount,
      v.type,
      v.categoryId,
      v.subCategoryId || null,
      v.accountId || null,
      v.note || null,
      v.recordDate,
    ]
  )
  return findById(userId, r.insertId)
}

async function update(userId, id, payload) {
  const target = await findById(userId, id)
  if (!target) {
    throw new AppError(ErrorCode.RECORD_NOT_FOUND)
  }
  const v = _validateRecordInput(payload, /* partial */ true)
  const fields = []
  const values = []
  if (v.amount !== undefined) {
    fields.push('amount = ?')
    values.push(v.amount)
  }
  if (v.type !== undefined) {
    fields.push('type = ?')
    values.push(v.type)
  }
  if (v.categoryId !== undefined) {
    await _assertCategory(userId, v.categoryId)
    fields.push('category_id = ?')
    values.push(v.categoryId)
  }
  if (v.subCategoryId !== undefined) {
    if (v.subCategoryId === null) {
      fields.push('sub_category_id = NULL')
    } else {
      await _assertCategory(userId, v.subCategoryId)
      fields.push('sub_category_id = ?')
      values.push(v.subCategoryId)
    }
  }
  if (v.accountId !== undefined) {
    if (v.accountId === null) {
      fields.push('account_id = NULL')
    } else {
      await _assertAccount(userId, v.accountId)
      fields.push('account_id = ?')
      values.push(v.accountId)
    }
  }
  if (v.note !== undefined) {
    fields.push('note = ?')
    values.push(v.note)
  }
  if (v.recordDate !== undefined) {
    fields.push('record_date = ?')
    values.push(v.recordDate)
  }
  if (!fields.length) return target
  values.push(id, userId)
  await pool.query(
    `UPDATE records SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    values
  )
  return findById(userId, id)
}

async function softRemove(userId, id) {
  const target = await findById(userId, id)
  if (!target) {
    throw new AppError(ErrorCode.RECORD_NOT_FOUND)
  }
  await pool.query(
    `UPDATE records
        SET is_deleted = 1, deleted_at = NOW()
      WHERE id = ? AND user_id = ?`,
    [id, userId]
  )
}

/* -------------------- 辅助：今日 / 月度总额（供 store 切到后端前过渡） -------------------- */

async function todayExpense(userId) {
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
       FROM records
      WHERE user_id = ? AND type = 'expense' AND is_deleted = 0 AND record_date = CURDATE()`,
    [userId]
  )
  return Number(rows[0]?.total || 0)
}

/* -------------------- 内部校验 -------------------- */

function _validateRecordInput(payload, partial = false) {
  const v = {}
  if (!partial || payload.amount !== undefined) {
    if (typeof payload.amount !== 'number' && typeof payload.amount !== 'string') {
      throw new AppError(ErrorCode.BAD_REQUEST, '金额格式错误')
    }
    const num = Number(payload.amount)
    if (!Number.isFinite(num) || num <= 0) {
      throw new AppError(ErrorCode.BAD_REQUEST, '金额必须大于 0')
    }
    if (num > RECORD_AMOUNT_MAX) {
      throw new AppError(ErrorCode.BAD_REQUEST, '金额超过上限')
    }
    // 保留 2 位
    v.amount = Math.round(num * 100) / 100
  }
  if (!partial || payload.type !== undefined) {
    if (!RECORD_TYPES.includes(payload.type)) {
      throw new AppError(ErrorCode.BAD_REQUEST, '记录类型不合法')
    }
    v.type = payload.type
  }
  if (!partial || payload.categoryId !== undefined) {
    if (typeof payload.categoryId !== 'string' || !payload.categoryId.trim()) {
      throw new AppError(ErrorCode.BAD_REQUEST, '分类不能为空')
    }
    v.categoryId = payload.categoryId.trim()
  }
  if (payload.subCategoryId !== undefined) {
    v.subCategoryId = payload.subCategoryId ? String(payload.subCategoryId).trim() : null
  }
  if (payload.accountId !== undefined) {
    v.accountId = payload.accountId ? Number(payload.accountId) : null
  }
  if (payload.note !== undefined) {
    if (payload.note === null || payload.note === '') {
      v.note = null
    } else {
      if (typeof payload.note !== 'string') {
        throw new AppError(ErrorCode.BAD_REQUEST, '备注格式错误')
      }
      if (payload.note.length > RECORD_NOTE_MAX_LENGTH) {
        throw new AppError(
          ErrorCode.BAD_REQUEST,
          `备注最多 ${RECORD_NOTE_MAX_LENGTH} 字`
        )
      }
      v.note = payload.note
    }
  }
  if (payload.recordDate !== undefined) {
    _assertDate(payload.recordDate, 'recordDate')
    v.recordDate = payload.recordDate
  }
  if (!partial) {
    // 新增必填
    if (!v.recordDate) {
      throw new AppError(ErrorCode.BAD_REQUEST, '日期不能为空')
    }
  }
  return v
}

function _assertDate(s, field) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new AppError(ErrorCode.BAD_REQUEST, `${field} 格式错误（须 YYYY-MM-DD）`)
  }
  const d = new Date(s + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) {
    throw new AppError(ErrorCode.BAD_REQUEST, `${field} 不是合法日期`)
  }
}

function _assertMonth(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}$/.test(s)) {
    throw new AppError(ErrorCode.BAD_REQUEST, '月份格式错误（须 YYYY-MM）')
  }
}

async function _assertCategory(userId, catId) {
  if (!catId) return
  const [rows] = await pool.query(
    `SELECT id FROM categories
      WHERE id = ? AND is_deleted = 0 AND is_active = 1
        AND (is_system = 1 OR user_id = ?)
      LIMIT 1`,
    [catId, userId]
  )
  if (!rows.length) {
    throw new AppError(ErrorCode.CATEGORY_NOT_FOUND, '分类不存在')
  }
}

async function _assertAccount(userId, accountId) {
  if (!accountId) return
  const [rows] = await pool.query(
    `SELECT id FROM accounts
      WHERE id = ? AND user_id = ? AND is_deleted = 0
      LIMIT 1`,
    [accountId, userId]
  )
  if (!rows.length) {
    throw new AppError(ErrorCode.ACCOUNT_NOT_FOUND, '账户不存在')
  }
}

module.exports = {
  list,
  findById,
  create,
  update,
  softRemove,
  todayExpense,
}
