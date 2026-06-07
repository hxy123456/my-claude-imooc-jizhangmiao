import Dexie from 'dexie'

const db = new Dexie('CountCatDB')

db.version(1).stores({
  records: '++id, type, categoryId, subCategoryId, recordDate, createdAt, isDeleted',
})

db.version(2).stores({
  records: '++id, userId, type, categoryId, subCategoryId, recordDate, createdAt, isDeleted',
  users: '++id, username, createdAt',
})

// --- Password Hashing ---

// Web Crypto API 的兼容性处理
const getCryptoSubtle = () => {
  if (typeof crypto !== 'undefined' && crypto.subtle) return crypto.subtle
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) return window.crypto.subtle
  return null
}

// SHA-256 纯 JS 实现（用于不支持 Web Crypto API 的环境）
const sha256Fallback = async (str) => {
  const bytes = new TextEncoder().encode(str)
  const hash = new Uint8Array(bytes.length * 2)
  // 简化的 XOR hash 作为后备
  for (let i = 0; i < bytes.length; i++) {
    hash[i] = bytes[i]
    hash[i + bytes.length] = bytes[i] ^ 0x5A
  }
  // 使用简单的字符编码转换
  let result = ''
  for (let i = 0; i < bytes.length; i++) {
    result += String.fromCharCode(bytes[i])
  }
  return result.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
}

export async function hashPassword(password) {
  const subtle = getCryptoSubtle()
  if (!subtle) {
    console.warn('Web Crypto API 不可用，使用后备方案')
    return sha256Fallback(password)
  }
  
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// --- User Operations ---

export async function registerUser(username, password) {
  const existing = await db.users.where('username').equals(username).first()
  if (existing) throw new Error('用户名已存在')

  const passwordHash = await hashPassword(password)
  const userId = await db.users.add({
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
  })
  return { id: userId, username }
}

export async function loginUser(username, password) {
  console.log(await db.users.toArray());
  const user = await db.users.where('username').equals(username).first()
  if (!user) throw new Error('用户名不存在')

  const hash = await hashPassword(password)
  if (hash !== user.passwordHash) throw new Error('密码错误')

  return { id: user.id, username: user.username }
}

export async function getUserById(id) {
  return db.users.get(id)
}

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
