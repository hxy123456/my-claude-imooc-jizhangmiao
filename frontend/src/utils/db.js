import Dexie from 'dexie'

/**
 * V1.1+ 本地数据层
 *
 * 调整说明：
 * - 用户/鉴权已迁到后端 MySQL + JWT（见 utils/apiClient.js + stores/auth.js）
 * - 本文件仅保留 records 表与 Record 模型，供 stores/records.js 使用
 * - 移除了 registerUser / loginUser / getUserById / hashPassword / sha256Fallback
 *
 * 数据流（V1.1 过渡期）：
 *   用户/鉴权 → MySQL（后端）
 *   记账记录 → IndexedDB（本地）  ← V1.1+ 后续迁移到 MySQL
 */

const db = new Dexie('CountCatDB')

db.version(1).stores({
  records: '++id, type, categoryId, subCategoryId, recordDate, createdAt, isDeleted',
})

db.version(2).stores({
  records: '++id, userId, type, categoryId, subCategoryId, recordDate, createdAt, isDeleted',
  // users 表不再使用：用户统一走后端
})

// --- Record Model ---

export class Record {
  constructor(data) {
    this.userId = data.userId || 0
    this.amount = data.amount || 0
    this.type = data.type || 'expense'
    this.categoryId = data.categoryId || ''
    this.subCategoryId = data.subCategoryId || ''
    this.note = data.note || ''
    this.recordDate = data.recordDate || new Date().toISOString().slice(0, 10)
    this.createdAt = new Date().toISOString()
    this.updatedAt = new Date().toISOString()
    this.isDeleted = false
  }
}

// --- Record Operations ---

export async function addRecord(data) {
  const record = new Record(data)
  return db.records.add(record)
}

export async function updateRecord(id, data) {
  return db.records.update(id, {
    ...data,
    updatedAt: new Date().toISOString(),
  })
}

export async function softDeleteRecord(id) {
  return db.records.update(id, {
    isDeleted: true,
    updatedAt: new Date().toISOString(),
  })
}

export async function getRecords({ userId, type, categoryId, startDate, endDate, keyword, limit } = {}) {
  let records = await db.records.toArray()
  records = records.filter(r => !r.isDeleted)

  if (userId) records = records.filter(r => r.userId === userId)
  if (type) records = records.filter(r => r.type === type)
  if (categoryId) records = records.filter(r => r.categoryId === categoryId)
  if (startDate) records = records.filter(r => r.recordDate >= startDate)
  if (endDate) records = records.filter(r => r.recordDate <= endDate)
  if (keyword) {
    const kw = keyword.toLowerCase()
    records = records.filter(r => r.note.toLowerCase().includes(kw))
  }

  records.sort((a, b) => {
    if (a.recordDate !== b.recordDate) return b.recordDate.localeCompare(a.recordDate)
    return b.createdAt.localeCompare(a.createdAt)
  })

  if (limit) records = records.slice(0, limit)
  return records
}

export async function getMonthlyStats(year, month, userId) {
  const m = String(month).padStart(2, '0')
  const startDate = `${year}-${m}-01`
  const endDate = `${year}-${m}-31`

  const records = await getRecords({ userId, startDate, endDate })

  const expense = records.filter(r => r.type === 'expense')
  const income = records.filter(r => r.type === 'income')

  const totalExpense = expense.reduce((s, r) => s + r.amount, 0)
  const totalIncome = income.reduce((s, r) => s + r.amount, 0)

  const categoryMap = {}
  for (const r of expense) {
    if (!categoryMap[r.categoryId]) categoryMap[r.categoryId] = 0
    categoryMap[r.categoryId] += r.amount
  }

  const dailyMap = {}
  for (const r of expense) {
    if (!dailyMap[r.recordDate]) dailyMap[r.recordDate] = 0
    dailyMap[r.recordDate] += r.amount
  }

  return { totalExpense, totalIncome, balance: totalIncome - totalExpense, categoryMap, dailyMap, records }
}

export async function getTodayExpense(userId) {
  const today = new Date().toISOString().slice(0, 10)
  const records = await getRecords({ userId, type: 'expense', startDate: today, endDate: today })
  return records.reduce((s, r) => s + r.amount, 0)
}

export async function seedDemoData(userId) {
  const userRecords = await getRecords({ userId, limit: 1 })
  if (userRecords.length > 0) return

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const demoRecords = [
    { amount: 25, type: 'expense', categoryId: 'food', subCategoryId: 'food_lunch', note: '黄焖鸡', recordDate: `${year}-${String(month+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}` },
    { amount: 4, type: 'expense', categoryId: 'transport', subCategoryId: 'transport_metro', note: '', recordDate: `${year}-${String(month+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}` },
    { amount: 15, type: 'expense', categoryId: 'shopping', subCategoryId: 'shopping_daily', note: '纸巾', recordDate: `${year}-${String(month+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}` },
    { amount: 8500, type: 'income', categoryId: 'salary', subCategoryId: 'salary_base', note: '月薪', recordDate: `${year}-${String(month+1).padStart(2,'0')}-05` },
    { amount: 1800, type: 'expense', categoryId: 'housing', subCategoryId: 'housing_rent', note: '房租', recordDate: `${year}-${String(month+1).padStart(2,'0')}-01` },
    { amount: 35, type: 'expense', categoryId: 'entertainment', subCategoryId: 'entertainment_movie', note: '看电影', recordDate: `${year}-${String(month+1).padStart(2,'0')}-${String(Math.max(1,now.getDate()-1)).padStart(2,'0')}` },
    { amount: 128, type: 'expense', categoryId: 'shopping', subCategoryId: 'shopping_clothes', note: 'T恤', recordDate: `${year}-${String(month+1).padStart(2,'0')}-${String(Math.max(1,now.getDate()-1)).padStart(2,'0')}` },
    { amount: 12, type: 'expense', categoryId: 'food', subCategoryId: 'food_breakfast', note: '豆浆油条', recordDate: `${year}-${String(month+1).padStart(2,'0')}-${String(Math.max(1,now.getDate()-2)).padStart(2,'0')}` },
    { amount: 68, type: 'expense', categoryId: 'food', subCategoryId: 'food_dinner', note: '火锅', recordDate: `${year}-${String(month+1).padStart(2,'0')}-${String(Math.max(1,now.getDate()-2)).padStart(2,'0')}` },
    { amount: 200, type: 'expense', categoryId: 'telecom', subCategoryId: 'telecom_member', note: '各种会员', recordDate: `${year}-${String(month+1).padStart(2,'0')}-10` },
    { amount: 50, type: 'expense', categoryId: 'transport', subCategoryId: 'transport_taxi', note: '加班打车', recordDate: `${year}-${String(month+1).padStart(2,'0')}-08` },
    { amount: 300, type: 'expense', categoryId: 'medical', subCategoryId: 'medical_medicine', note: '感冒药', recordDate: `${year}-${String(month+1).padStart(2,'0')}-12` },
    { amount: 99, type: 'expense', categoryId: 'education', subCategoryId: 'education_book', note: '技术书', recordDate: `${year}-${String(month+1).padStart(2,'0')}-15` },
    { amount: 500, type: 'income', categoryId: 'freelance', subCategoryId: 'freelance_gig', note: '兼职收入', recordDate: `${year}-${String(month+1).padStart(2,'0')}-20` },
  ]

  for (const data of demoRecords) {
    await addRecord({ ...data, userId })
  }
}

export default db
