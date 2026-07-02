/**
 * API 客户端
 *
 * - baseURL 默认 '/api'：开发期由 vite.config.js 反代到 http://localhost:3001
 * - 自动从 localStorage 读取 token 并附加 Authorization 头
 * - 统一错误：业务失败抛出 ApiError(code, message, status)，网络失败抛出 ApiError('NETWORK_ERROR', ...)
 * - 成功直接返回 data 字段，避免在 store 里多次解构
 */

const TOKEN_KEY = 'countcat_token'

/** baseURL 可在打包前用环境变量覆盖（见 vite.config.js 的 define 替换） */
const BASE_URL = import.meta.env?.VITE_API_BASE || '/api'

/**
 * 业务错误：抛给 store / view 用 try/catch 捕获
 * e.code  对应后端 ErrorCode
 * e.status HTTP 状态码
 */
export class ApiError extends Error {
  constructor(code, message, status) {
    super(message || code || '请求失败')
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

/* ------------------------------------------------------------------ */
/* token 持久化（localStorage，跨标签页 + 浏览器重启仍保持登录）        */
/* ------------------------------------------------------------------ */
export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY) || ''
    } catch {
      return ''
    }
  },
  set(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* 隐私模式可能抛错，忽略 */
    }
  },
  clear() {
    this.set('')
  },
}

/* ------------------------------------------------------------------ */
/* 内部 fetch 包装                                                     */
/* ------------------------------------------------------------------ */
async function request(method, path, { body, auth = true, query } = {}) {
  // 拼接 URL：base 去掉尾部 /，path 必须以 / 开头
  const base = BASE_URL.replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  let url = `${base}${p}`
  if (query) {
    const qs = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString()
    if (qs) url += (url.includes('?') ? '&' : '?') + qs
  }

  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const t = tokenStore.get()
    if (t) headers.Authorization = `Bearer ${t}`
  }

  let res
  let payload
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    // fetch 抛错：网络断开、CORS 拒绝、DNS 失败等
    throw new ApiError('NETWORK_ERROR', '网络连接失败，请检查后端服务是否启动', 0)
  }

  // 204 / 空 body
  const text = await res.text()
  payload = text ? safeJSON(text) : null

  if (res.ok) {
    return payload && typeof payload === 'object' ? payload.data : payload
  }

  // 业务错误：后端约定 { ok:false, code, message }
  const code = payload?.code || `HTTP_${res.status}`
  const message = payload?.message || res.statusText || '请求失败'
  throw new ApiError(code, message, res.status)
}

function safeJSON(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ */
/* 业务方法（按模块组织，方便按需扩展）                                */
/* ------------------------------------------------------------------ */
export const authApi = {
  register: (username, password) =>
    request('POST', '/auth/register', { body: { username, password }, auth: false }),
  login: (username, password) =>
    request('POST', '/auth/login', { body: { username, password }, auth: false }),
  logout: () => request('POST', '/auth/logout'),
  me: () => request('GET', '/auth/me'),
  /** PATCH /api/auth/me — 改 nickname / avatar */
  updateMe: (patch) => request('PATCH', '/auth/me', { body: patch }),
}

export const recordsApi = {
  /** 分页 + 筛选 */
  list: (query = {}) => request('GET', '/records', { query }),
  /** 最近 N 条（首页用） */
  recent: (limit = 10) => request('GET', '/records/recent', { query: { limit } }),
  /** 单条 */
  detail: (id) => request('GET', `/records/${id}`),
  /** 新增 */
  create: (payload) => request('POST', '/records', { body: payload }),
  /** 修改 */
  update: (id, payload) => request('PATCH', `/records/${id}`, { body: payload }),
  /** 软删 */
  remove: (id) => request('DELETE', `/records/${id}`),
}

export const statsApi = {
  home: () => request('GET', '/stats/home'),
  /** 概览 */
  overview: (month) => request('GET', '/stats/overview', { query: { month } }),
  /** 一次性返回月度聚合：{ month, monthLabel, totalIncome, totalExpense, balance, count, categoryMap, dailyMap, records } */
  monthly: (month) => request('GET', '/stats/monthly', { query: { month } }),
  categoryExpense: (month, limit = 10) =>
    request('GET', '/stats/category-expense', { query: { month, limit } }),
  categoryIncome: (month) => request('GET', '/stats/category-income', { query: { month } }),
  dailyTrend: (month) => request('GET', '/stats/daily-trend', { query: { month } }),
  /** Excel 二进制：直接返回 res，需要外部包一层 */
  exportUrl: (month) => `/api/stats/export?month=${encodeURIComponent(month)}`,
}

export const accountsApi = {
  list: () => request('GET', '/accounts'),
  create: (payload) => request('POST', '/accounts', { body: payload }),
  update: (id, payload) => request('PATCH', `/accounts/${id}`, { body: payload }),
  remove: (id) => request('DELETE', `/accounts/${id}`),
}

export const categoriesApi = {
  tree: () => request('GET', '/categories'),
  addChild: (payload) => request('POST', '/categories', { body: payload }),
  update: (id, payload) => request('PATCH', `/categories/${id}`, { body: payload }),
  remove: (id) => request('DELETE', `/categories/${id}`),
}

export const usersApi = {
  uploadAvatar: async (file) => {
    const fd = new FormData()
    fd.append('file', file)
    const url = (BASE_URL.replace(/\/$/, '')) + '/users/me/avatar'
    const t = tokenStore.get()
    const headers = t ? { Authorization: `Bearer ${t}` } : {}
    let res
    try {
      res = await fetch(url, { method: 'POST', body: fd, headers })
    } catch (e) {
      throw new ApiError('NETWORK_ERROR', '网络连接失败', 0)
    }
    const text = await res.text()
    const payload = text ? safeJSON(text) : null
    if (!res.ok) {
      throw new ApiError(payload?.code || `HTTP_${res.status}`, payload?.message || '上传失败', res.status)
    }
    return payload && typeof payload === 'object' ? payload.data : payload
  },
  updateProfile: (patch) => request('PATCH', '/users/me/profile', { body: patch }),
}

export default {
  request,
  ApiError,
  tokenStore,
  authApi,
  recordsApi,
  statsApi,
  accountsApi,
  categoriesApi,
  usersApi,
}
