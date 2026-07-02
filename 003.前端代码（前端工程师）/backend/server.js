/**
 * 服务入口
 * 流程：load env → ping DB → start HTTP（端口冲突自动顺延） → 监听进程信号优雅退出
 */
const app = require('./src/app')
const env = require('./src/config/env')
const db = require('./src/config/db')

/**
 * 顺延上限：起始端口被占后，最多向后顺延 PORT_FALLBACK_MAX 个端口
 *  默认 10，即 [PORT, PORT+10] 这个闭区间内寻找可用端口
 */
function intEnv(name, defaultValue) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return defaultValue
  const n = Number.parseInt(raw, 10)
  if (Number.isNaN(n)) {
    throw new Error(`环境变量 ${name} 必须是整数，当前为: ${raw}`)
  }
  return n
}

const FALLBACK_MAX = intEnv('PORT_FALLBACK_MAX', 10)

/**
 * 直接尝试 listen；若 EADDRINUSE 则顺延到下一端口
 * - 比"先 probe 再 listen"更可靠：probe 成功后到真正 listen 之间存在窗口期，
 *   此时另一进程可能抢端口 → app.listen 仍会失败
 * - listen-then-retry 模式让 OS 帮我们做最终仲裁，无窗口期
 * @returns {Promise<{server: import('http').Server, port: number, tried: number[]}>}
 */
function listenWithFallback(app, startPort, maxOffset) {
  const tried = []
  return new Promise((resolve, reject) => {
    const tryListen = (offset) => {
      const port = startPort + offset
      tried.push(port)
      let settled = false
      const server = app.listen(port)
      const onError = (err) => {
        if (settled) return
        settled = true
        server.removeListener('listening', onListening)
        if (err && err.code === 'EADDRINUSE' && offset < maxOffset) {
          // 顺延到下一端口
          tryListen(offset + 1)
          return
        }
        reject(err)
      }
      const onListening = () => {
        if (settled) return
        settled = true
        server.removeListener('error', onError)
        resolve({ server, port, tried })
      }
      server.once('error', onError)
      server.once('listening', onListening)
    }
    tryListen(0)
  })
}

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

  // 找可用端口（顺延）：直接 listen，EADDRINUSE 时再顺延
  let server
  try {
    const result = await listenWithFallback(app, env.PORT, FALLBACK_MAX)
    server = result.server
    if (result.tried.length > 1) {
      // eslint-disable-next-line no-console
      console.log(
        `[port] 起始端口 ${env.PORT} 被占用，顺延至 ${result.port}（尝试: ${result.tried.join(' → ')}）`
      )
    }
    // eslint-disable-next-line no-console
    console.log(
      `[countcat-backend] 监听 http://localhost:${result.port}  (env=${env.NODE_ENV})`
    )
  } catch (err) {
    console.error(`[port] 找不到可用端口（已尝试 PORT ~ PORT+${FALLBACK_MAX}）: ${err.message}`)
    process.exit(1)
  }

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
