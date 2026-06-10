/**
 * 服务入口
 * 流程：load env → ping DB → start HTTP → 监听进程信号优雅退出
 */
const app = require('./src/app')
const env = require('./src/config/env')
const db = require('./src/config/db')

async function main() {
  // 启动前 ping 一次数据库，连接不通直接 fail-fast
  try {
    await db.ping()
    // eslint-disable-next-line no-console
    console.log(
      `[db] 已连接 MySQL ${env.db.host}:${env.db.port}/${env.db.database}`
    )
  } catch (err) {
    console.error('[db] 数据库连接失败：', err.message)
    console.error(
      '请检查 backend/.env 中的 DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME；' +
      '并确认已执行 002.数据库脚本（数据库管理员DBA）/01_create_database.sql 与 02_schema.sql'
    )
    process.exit(1)
  }

  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[countcat-backend] 监听 http://localhost:${env.PORT}  (env=${env.NODE_ENV})`)
  })

  // 优雅关闭
  const shutdown = async (signal) => {
    // eslint-disable-next-line no-console
    console.log(`\n[countcat-backend] 收到 ${signal}，开始优雅关闭…`)
    server.close(async (err) => {
      if (err) {
        console.error('[http] 关闭失败', err)
        process.exit(1)
      }
      try {
        await db.close()
        // eslint-disable-next-line no-console
        console.log('[countcat-backend] 已退出')
        process.exit(0)
      } catch (e) {
        console.error('[db] 关闭失败', e)
        process.exit(1)
      }
    })
    // 强制兜底
    setTimeout(() => {
      console.error('[countcat-backend] 强制退出')
      process.exit(1)
    }, 10_000).unref()
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason)
  })
  process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err)
    shutdown('uncaughtException')
  })
}

main()
