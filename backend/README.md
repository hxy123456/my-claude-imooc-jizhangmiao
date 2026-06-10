# 记账喵 (CountCat) 后端 - V1.1+

> Express + MySQL + JWT 实现的多用户鉴权后端。  
> 前端 V1.0.1 仍可独立运行（本地存储）；本服务为 V1.1+ 升级做铺垫。

---

## 1. 目录结构

```
backend/
├── server.js                  # 入口：启动 HTTP + 监听优雅关闭
├── package.json
├── .env.example               # 环境变量模板（复制为 .env 后填值）
├── scripts/
│   └── init-db.js             # 一键建库建表（读取 002 数据库脚本）
└── src/
    ├── app.js                 # Express 装配（CORS / 路由 / 错误处理）
    ├── config/
    │   ├── constants.js       # 业务错误码、校验规则
    │   ├── db.js              # MySQL 连接池
    │   └── env.js             # 环境变量加载与校验
    ├── controllers/
    │   └── authController.js  # 鉴权 HTTP 处理
    ├── middleware/
    │   ├── requireAuth.js     # JWT 鉴权守卫
    │   └── errorHandler.js    # 统一错误响应
    ├── routes/
    │   └── auth.js            # /api/auth/* 路由
    ├── services/
    │   ├── authService.js     # 注册/登录业务
    │   └── userService.js     # 用户数据访问（SQL 集中点）
    └── utils/
        ├── AppError.js        # 业务异常
        ├── jwt.js             # JWT 签发/校验
        └── password.js        # SHA-256 哈希（对齐前端 V1.0.1）
```

---

## 2. 快速开始

### 2.1 前置条件

- Node.js ≥ 18
- MySQL 9.x（本地或 Docker）
- 已执行 `002.数据库脚本（数据库管理员DBA）/01_create_database.sql` 与 `02_schema.sql`  
  （或运行 `npm run db:init` 自动建表）

### 2.2 安装与启动

```bash
cd backend
cp .env.example .env       # 按需修改 DB_*/JWT_SECRET 等
npm install
npm run db:init            # 可选：自动跑建库脚本
npm run dev                # 开发模式（node --watch）
# 或
npm start                  # 生产模式
```

启动成功会看到：

```
[db] 已连接 MySQL 127.0.0.1:3307/countcat
[countcat-backend] 监听 http://localhost:3001  (env=development)
```

---

## 3. 接口契约

所有响应统一格式：

```json
{ "ok": true, "data": { ... } }     // 成功
{ "ok": false, "code": "USER_EXISTS", "message": "该用户名已被注册" }  // 失败
```

### 3.1 健康检查

```
GET /health
→ 200 { ok: true, service: "countcat-backend", version: "1.1.0" }
```

### 3.2 注册

```
POST /api/auth/register
Content-Type: application/json

{ "username": "alice", "password": "1234" }
```

成功 `201`：

```json
{
  "ok": true,
  "data": {
    "user": { "id": 1, "username": "alice", "createdAt": "2026-06-09T..." },
    "token": "eyJhbGciOi..."
  }
}
```

失败：

| HTTP | code | 触发条件 |
|---|---|---|
| 400 | `INVALID_USERNAME` | 用户名不合法（2-50 字符） |
| 400 | `INVALID_PASSWORD` | 密码 < 4 字符或 > 64 字符 |
| 409 | `USER_EXISTS` | 用户名已注册 |

### 3.3 登录

```
POST /api/auth/login
Content-Type: application/json

{ "username": "alice", "password": "1234" }
```

成功 `200`：同注册响应结构。

失败：

| HTTP | code | 触发条件 |
|---|---|---|
| 400 | `INVALID_USERNAME` / `INVALID_PASSWORD` | 入参格式错误 |
| 401 | `INVALID_CREDENTIALS` | 用户名/密码错误（统一文案防探测） |

### 3.4 当前用户（需鉴权）

```
GET /api/auth/me
Authorization: Bearer <token>
```

成功 `200`：

```json
{
  "ok": true,
  "data": {
    "user": { "id": 1, "username": "alice", "createdAt": "2026-06-09T..." }
  }
}
```

失败：`401`（`UNAUTHORIZED` / `TOKEN_EXPIRED` / `INVALID_TOKEN`）。

---

## 4. JWT 鉴权约定

- 头部：`Authorization: Bearer <token>`
- 过期：默认 7 天（`JWT_EXPIRES_IN`）
- 签发者：`countcat`（`JWT_ISSUER`）
- 负载：仅 `{ id, username, iat, exp }`，不携带敏感信息
- 生产环境务必用 `openssl rand -hex 64` 生成强随机 `JWT_SECRET`

---

## 5. 密码安全

- V1.0.1 前端使用 **SHA-256**（无盐）。本服务**沿用 SHA-256** 以便无缝迁移老用户。
- `utils/password.js` 已预留 `bcrypt` 分支；升级步骤：
  1. `npm i bcrypt`
  2. `.env` 中设置 `PASSWORD_ALGO=bcrypt`
  3. 在 `authService.login` 验证通过后判断哈希格式，旧哈希用 bcrypt 重写（TODO 注释位置）

---

## 6. 前端集成（patch 提示）

要把现有前端从"本地 IndexedDB 鉴权"切换到本后端，需修改：

1. `frontend/src/stores/auth.js` — 把 `loginUser` / `registerUser` 替换为 `fetch('/api/auth/login', ...)`
2. `frontend/vite.config.js` — 增加开发代理 `'/api': 'http://localhost:3001'`
3. `frontend/src/router/index.js` — 守卫从 `sessionStorage` 读 token，调用 `/api/auth/me` 验证有效性

详细 diff 见前端 PR；本仓库后端不修改前端代码（保持职责单一）。

---

## 7. 常用 curl 调试

```bash
# 注册
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"1234"}'

# 登录
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"1234"}'

# 当前用户
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer <token>"
```

---

## 8. 与 V1 PRD 的兼容性

- 数据库 schema 沿用 `002.数据库脚本（数据库管理员DBA）/02_schema.sql`（`users` 表字段一致）
- 密码哈希与 V1.0.1 前端一致：SHA-256 hex
- 错误码与前端 `authStore.error` 字符串解耦：前端需按新错误码解析（见集成 patch）
