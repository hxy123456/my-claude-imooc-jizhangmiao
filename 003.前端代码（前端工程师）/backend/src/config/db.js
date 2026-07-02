/**
 * MySQL 连接池（基于 mysql2/promise）
 * 启动时立刻 ping 一次，连接失败时给出明确错误信息
 */
const mysql = require('mysql2/promise')
const env = require('./env')

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit,
  // 字段以 snake_case 存储，对外暴露 camelCase
  // 这里保持原样，由 service 层做映射
  charset: 'utf8mb4_0900_ai_ci',
  // 自动将 DATETIME 转为 JS Date（默认 true）
  dateStrings: false,
})

/**
 * 启动时验证数据库可达 + 关键表存在
 * 失败抛出异常，由 server.js 的 try/catch 捕获并 fail-fast
 */
async function ping() {
  const conn = await pool.getConnection()
  try {
    await conn.query('SELECT 1')
    // 检查 users 表是否存在（不阻塞启动，仅打印 warning）
    const [rows] = await conn.query(
      "SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'",
      [env.db.database]
    )
    if (rows.length === 0) {
      console.warn(
        `[db] 警告：数据库 ${env.db.database} 中找不到 users 表。` +
        `请先执行 ../002.数据库脚本（数据库管理员DBA）/01_create_database.sql 与 02_schema.sql`
      )
    }
  } finally {
    conn.release()
  }
}

/**
 * 优雅关闭连接池
 */
async function close() {
  await pool.end()
}

module.exports = { pool, ping, close }
