/**
 * 环境变量加载与校验
 * 启动时一次性读取 + 校验，缺失关键配置时直接 fail-fast
 */
const path = require('path')
const dotenv = require('dotenv')

// 优先加载 backend 根目录的 .env
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') })

function intEnv(name, defaultValue) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return defaultValue
  const n = Number.parseInt(raw, 10)
  if (Number.isNaN(n)) {
    throw new Error(`环境变量 ${name} 必须是整数，当前为: ${raw}`)
  }
  return n
}

function strEnv(name, defaultValue) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') {
    if (defaultValue === undefined) {
      throw new Error(`环境变量 ${name} 必填`)
    }
    return defaultValue
  }
  return raw
}

const env = Object.freeze({
  NODE_ENV: strEnv('NODE_ENV', 'development'),
  PORT: intEnv('PORT', 3001),
  CORS_ORIGIN: strEnv('CORS_ORIGIN', 'http://localhost:3001'),

  db: Object.freeze({
    host: strEnv('DB_HOST', '127.0.0.1'),
    port: intEnv('DB_PORT', 3307),
    user: strEnv('DB_USER', 'root'),
    password: strEnv('DB_PASSWORD', '123456'),
    database: strEnv('DB_NAME', 'countcat'),
    connectionLimit: intEnv('DB_CONNECTION_LIMIT', 10),
  }),

  jwt: Object.freeze({
    secret: strEnv('JWT_SECRET', 'countcat-dev-secret-please-change-in-production'),
    expiresIn: intEnv('JWT_EXPIRES_IN', 60 * 60 * 24 * 7), // 默认 7 天
    issuer: strEnv('JWT_ISSUER', 'countcat'),
  }),

  password: Object.freeze({
    algo: strEnv('PASSWORD_ALGO', 'sha256'),
    bcryptRounds: intEnv('PASSWORD_BCRYPT_ROUNDS', 10),
  }),
})

// 生产环境强制要求 JWT_SECRET 不能用默认值
if (env.NODE_ENV === 'production' && env.jwt.secret.startsWith('countcat-dev-secret')) {
  throw new Error('生产环境必须设置强随机的 JWT_SECRET（建议 openssl rand -hex 64）')
}

module.exports = env
