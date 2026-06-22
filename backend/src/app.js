/**
 * Express 应用装配
 * 单独抽离以便 server.js 之外的测试/工具脚本复用
 */
const express = require('express')
const path = require('path')
const cors = require('cors')
const env = require('./config/env')
const authRouter = require('./routes/auth')
const accountsRouter = require('./routes/accounts')
const categoriesRouter = require('./routes/categories')
const recordsRouter = require('./routes/records')
const statsRouter = require('./routes/stats')
const usersRouter = require('./routes/users')
const errorHandler = require('./middleware/errorHandler')

const app = express()

/**
 * CORS 策略
 * - 始终允许：同源（无 Origin 头）
 * - 始终允许：env.CORS_ORIGIN 显式白名单（多个用逗号分隔）
 * - 开发期额外允许：localhost / 127.0.0.1 / 0.0.0.0 / 私网 IP（便于 LAN 联调与真机预览）
 *   生产环境（NODE_ENV=production）不开启此兜底
 * - 拒绝策略：直接 403 拦截，**不**让请求进入业务路由
 *   （不能用 cors 库的 cb(null,false) 方式，否则请求依然会被处理）
 */
const allowList = env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)

/**
 * 判断一个 origin 是否属于"开发期安全"：localhost 或 RFC1918 私网
 */
function isDevSafeOrigin(url) {
  try {
    const u = new URL(url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    const h = u.hostname
    if (h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '::1') return true
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(h)) return true
    return false
  } catch {
    return false
  }
}

// 前置中间件：直接拦截非法 origin，避免进入业务路由造成副作用
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (!origin) return next() // 同源 / server-to-server 放行
  if (allowList.includes(origin)) return next()
  if (env.NODE_ENV !== 'production' && isDevSafeOrigin(origin)) return next()
  // eslint-disable-next-line no-console
  console.warn(
    `[cors] 拒绝来源 ${origin}（生产请在 backend/.env 的 CORS_ORIGIN 中加入，多个用逗号分隔）`
  )
  return res.status(403).json({
    ok: false,
    code: 'CORS_DENIED',
    message: `来源 ${origin} 不在白名单`,
  })
})

// cors 中间件只负责设置响应头（origin:true 表示回显请求 origin）
app.use(cors({ origin: true, credentials: true }))

// 解析 JSON body
app.use(express.json({ limit: '64kb' }))

// 简易请求日志（生产可换 morgan）
app.use((req, _res, next) => {
  if (env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  }
  next()
})

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'countcat-backend', version: '1.2.0' })
})

// 业务路由
app.use('/api/auth', authRouter)
app.use('/api/accounts', accountsRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/records', recordsRouter)
app.use('/api/stats', statsRouter)
app.use('/api/users', usersRouter)

// 静态资源：上传的头像图片
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'public', 'uploads'), {
  maxAge: '7d',
  fallthrough: true,
}))

// 404
app.use((_req, res) => {
  res.status(404).json({ ok: false, code: 'NOT_FOUND', message: '接口不存在' })
})

// 统一错误处理（必须放最后）
app.use(errorHandler)

module.exports = app
