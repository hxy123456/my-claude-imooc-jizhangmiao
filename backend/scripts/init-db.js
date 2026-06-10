/**
 * 数据库初始化脚本
 * 读取 002.数据库脚本（数据库管理员DBA）/ 下的 SQL 并按顺序执行
 * 适用于：首次启动时一键建库 + 建表
 *
 * 用法：npm run db:init
 */
const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')
const env = require('../src/config/env')

const SQL_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  '002.数据库脚本（数据库管理员DBA）'
)
const FILES = [
  '01_create_database.sql',
  '02_schema.sql',
  '03_seed_categories.sql',
  '04_sample_data.sql',
]

// 简单的 SQL 分隔器：按 ";\n" 切分；保留空行注释跳过
function splitStatements(sql) {
  return sql
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('--') && s !== '')
}

async function main() {
  // 先连接 server（不指定数据库），跑 01_create_database.sql
  // 之后再用含 database 的连接跑其余文件
  let conn
  try {
    conn = await mysql.createConnection({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      multipleStatements: true,
    })

    for (const file of FILES) {
      const fullPath = path.join(SQL_DIR, file)
      if (!fs.existsSync(fullPath)) {
        console.warn(`[db:init] 跳过：${file} 不存在`)
        continue
      }
      const sql = fs.readFileSync(fullPath, 'utf8')
      const statements = splitStatements(sql)
      console.log(`[db:init] 执行 ${file}（${statements.length} 条语句）…`)
      for (const stmt of statements) {
        try {
          await conn.query(stmt)
        } catch (err) {
          // 已存在对象（database/table）按警告处理
          if (
            err.code === 'ER_DB_CREATE_EXISTS' ||
            err.code === 'ER_TABLE_EXISTS_ERROR' ||
            err.code === 'ER_DUP_KEY' ||
            err.code === 'ER_FK_DUP_NAME'
          ) {
            // eslint-disable-next-line no-console
            console.warn(`  · 已存在，跳过: ${err.code}`)
            continue
          }
          throw err
        }
      }
    }
    console.log('[db:init] ✅ 完成')
  } finally {
    if (conn) await conn.end()
  }
}

main().catch((err) => {
  console.error('[db:init] ❌ 失败：', err)
  process.exit(1)
})
