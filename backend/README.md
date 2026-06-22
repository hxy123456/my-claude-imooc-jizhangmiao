# 记账喵 (CountCat) 后端 - V1.2 全量业务接口

> Express + MySQL + JWT + multer + exceljs 实现的多用户全量业务后端。  
> 配套前端 V1.2（账户管理 / 分类管理 / 头像上传 / 统计 / 明细分页 / Excel 导出等）。

---

## 1. 目录结构

```
backend/
├── server.js                  # 入口：启动 HTTP + 监听优雅关闭
├── package.json
├── .env.example               # 环境变量模板（复制为 .env 后填值）
├── smoke-test.js              # 端到端接口契约自检（不连真实库，22 项全过）
├── scripts/
│   └── init-db.js             # 一键建库建表（读取 002 数据库脚本）
└── src/
    ├── app.js                 # Express 装配（CORS / 路由 / 静态 uploads / 错误处理）
    ├── config/
    │   ├── constants.js       # 业务错误码、校验规则、长度上限、MIME 白名单
    │   ├── db.js              # MySQL 连接池
    │   └── env.js             # 环境变量加载与校验
    ├── controllers/           # 鉴权 + 5 个业务模块
    │   ├── authController.js
    │   ├── accountsController.js
    │   ├── categoriesController.js
    │   ├── recordsController.js
    │   ├── statsController.js
    │   └── usersController.js
    ├── middleware/
    │   ├── requireAuth.js     # JWT 鉴权守卫（黑名单 + 解析）
    │   ├── upload.js          # multer 头像上传中间件
    │   └── errorHandler.js    # 统一错误响应
    ├── routes/                # 6 个路由
    │   ├── auth.js
    │   ├── accounts.js
    │   ├── categories.js
    │   ├── records.js
    │   ├── stats.js
    │   └── users.js
    ├── services/              # 业务层（SQL 集中点）
    │   ├── authService.js
    │   ├── userService.js
    │   ├── accountsService.js
    │   ├── categoriesService.js
    │   ├── recordsService.js
    │   ├── statsService.js
    │   ├── exportService.js   # ExcelJS 多 sheet 工作簿
    │   └── tokenService.js
    └── utils/
        ├── AppError.js        # 业务异常
        ├── jwt.js
        └── password.js        # SHA-256 哈希（对齐前端 V1.0.1）
```

---

## 2. 快速开始

### 2.1 前置条件

- Node.js ≥ 18
- MySQL 9.x（本地或 Docker）
- 已执行 `002.数据库脚本（数据库管理员DBA）/01_create_database.sql` 与 `02_schema.sql`  
  （或运行 `npm run db:init` 一键建表 — 现在会自动建 V1.2 增量表）

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

### 2.3 接口契约自检（无需数据库）

```bash
node smoke-test.js
# 期望：[smoke] 22 checks, 0 failed
```

---

## 3. 接口契约

所有响应统一格式：

```json
{ "ok": true,  "data": { ... } }                   // 成功
{ "ok": false, "code": "USER_EXISTS", "message": "该用户名已被注册" }  // 失败
```

| 模块 | 路径 | 方法 | 鉴权 | 说明 |
|---|---|---|---|---|
| 健康检查 | `/health` | GET | ❌ | 服务存活探针 |
| 鉴权 | `/api/auth/register` | POST | ❌ | 注册（自动种入 3 个默认账户） |
| 鉴权 | `/api/auth/login` | POST | ❌ | 登录 |
| 鉴权 | `/api/auth/logout` | POST | ✅ | 退出（token 进黑名单） |
| 鉴权 | `/api/auth/me` | GET | ✅ | 当前用户 |
| 鉴权 | `/api/auth/me` | PATCH | ✅ | 改 nickname / avatar |
| 账户 | `/api/accounts` | GET | ✅ | 列表 |
| 账户 | `/api/accounts` | POST | ✅ | 新增 |
| 账户 | `/api/accounts/:id` | PATCH | ✅ | 改 name/icon |
| 账户 | `/api/accounts/:id` | DELETE | ✅ | 删除（系统账户 403） |
| 分类 | `/api/categories` | GET | ✅ | 整棵树（内置 + 自定义） |
| 分类 | `/api/categories` | POST | ✅ | 新增子分类（必带 parentId） |
| 分类 | `/api/categories/:id` | PATCH | ✅ | 改名（内置 403） |
| 分类 | `/api/categories/:id` | DELETE | ✅ | 删除（内置 403 / 有记录 409） |
| 记录 | `/api/records` | GET | ✅ | 分页（page/pageSize/type/categoryId/month/keyword/...） |
| 记录 | `/api/records/recent` | GET | ✅ | 最近 10 条 |
| 记录 | `/api/records/:id` | GET | ✅ | 详情 |
| 记录 | `/api/records` | POST | ✅ | 新增 |
| 记录 | `/api/records/:id` | PATCH | ✅ | 修改 |
| 记录 | `/api/records/:id` | DELETE | ✅ | 软删 |
| 统计 | `/api/stats/home` | GET | ✅ | 首页（月份+TOP3+最近 10） |
| 统计 | `/api/stats/overview?month=YYYY-MM` | GET | ✅ | 概览（收入/支出/结余） |
| 统计 | `/api/stats/category-expense?month=YYYY-MM&limit=10` | GET | ✅ | 分类支出饼图（默认前 10） |
| 统计 | `/api/stats/category-income?month=YYYY-MM` | GET | ✅ | 分类收入柱状图 |
| 统计 | `/api/stats/daily-trend?month=YYYY-MM` | GET | ✅ | 日支出趋势（30 天） |
| 统计 | `/api/stats/export?month=YYYY-MM` | GET | ✅ | Excel 下载（5 sheet） |
| 用户 | `/api/users/me/avatar` | POST | ✅ | 头像上传（multipart） |
| 用户 | `/api/users/me/profile` | PATCH | ✅ | 改 nickname |
| 静态 | `/uploads/avatars/{userId}/{fileName}` | GET | ❌ | 已上传头像 |

### 3.1 健康检查

```
GET /health
→ 200 { ok: true, service: "countcat-backend", version: "1.2.0" }
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
    "user": { "id": 1, "username": "alice", "nickname": null, "avatar": null, "createdAt": "2026-06-13T..." },
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

**副作用**：注册成功后自动种入 3 个默认账户（现金/微信/支付宝）。

### 3.3 登录

```
POST /api/auth/login
{ "username": "alice", "password": "1234" }
```

成功 `200`：同注册响应结构。

### 3.4 当前用户

```
GET /api/auth/me
Authorization: Bearer <token>
```

成功 `200`：`{ ok, data: { user: { id, username, nickname, avatar, createdAt } } }`

### 3.5 改自己的资料

```
PATCH /api/auth/me
Authorization: Bearer <token>
Content-Type: application/json

{ "nickname": "阿璃", "avatar": "https://..." }
```

### 3.6 退出登录

```
POST /api/auth/logout
Authorization: Bearer <token>
→ 200 { ok: true, data: { revoked: true } }
```

成功后该 token 立即失效。再次用同一 token 调 `/api/auth/me` 会得到 `401 TOKEN_REVOKED`。

### 3.7 账户管理

#### 列表

```
GET /api/accounts
→ 200 { ok, data: [
  { id, userId, name, icon, isSystem, sortOrder, createdAt, updatedAt }, ...
] }
```

#### 新增

```
POST /api/accounts
{ "name": "工资卡", "icon": "💳" }
→ 201 { ok, data: Account }
```

`name` 必填且 ≤ 20 字符；同用户下名称不能重复。

#### 修改

```
PATCH /api/accounts/1
{ "name": "工资卡(招行)", "icon": "🏦" }
```

#### 删除

```
DELETE /api/accounts/2
→ 200 { ok, data: { removed: true } }
```

系统账户（`isSystem=true`）返回 `403 ACCOUNT_SYSTEM_PROTECTED`。

### 3.8 分类管理

#### 整棵树

```
GET /api/categories
→ 200 { ok, data: { expense: [...], income: [...] } }
```

返回合并后的树：内置全量 + 当前用户自定义。每个节点形如：
```json
{
  "id": "food", "name": "餐饮", "icon": "🍜", "color": "#E8654A",
  "type": "expense", "isSystem": true, "isActive": true,
  "children": [{ "id": "food_lunch", "name": "午餐", "isSystem": true, ... }, ...]
}
```

#### 新增子分类

```
POST /api/categories
{ "name": "宵夜", "parentId": "food", "icon": "🌙", "color": "#888888" }
→ 201 { ok, data: Category }
```

`parentId` 必填（必须已存在）；`name` ≤ 20 字符。

#### 修改

```
PATCH /api/categories/{id}
{ "name": "夜宵改" }
```

内置分类（`isSystem=true`）返回 `403 CATEGORY_SYSTEM_PROTECTED`。

#### 删除

```
DELETE /api/categories/{id}
```

内置分类 `403`；有未删记录引用 `409 CATEGORY_HAS_RECORDS`。

### 3.9 记录管理

#### 分页列表

```
GET /api/records?page=1&pageSize=20&type=expense&month=2026-06&categoryId=food&keyword=午餐
→ 200 {
  ok, data: {
    items: [Record, ...],
    page, pageSize,
    total, totalPages, hasMore
  }
}
```

支持筛选：`type`（expense/income）、`categoryId`（同时匹配 category_id 和 sub_category_id）、`accountId`、`month`（YYYY-MM）、`startDate`/`endDate`（YYYY-MM-DD）、`keyword`（备注模糊）。

#### 最近 N 条

```
GET /api/records/recent?limit=10
→ 200 { ok, data: [Record, ...] }
```

#### 新增

```
POST /api/records
{
  "amount": 25.5,
  "type": "expense",
  "categoryId": "food",
  "subCategoryId": "food_lunch",
  "accountId": 1,            // 可选
  "note": "黄焖鸡",
  "recordDate": "2026-06-13"
}
→ 201 { ok, data: Record }
```

#### 修改 / 删除

`PATCH /api/records/:id` 支持部分字段；`DELETE` 是软删（设置 `is_deleted=1, deleted_at=NOW()`）。

### 3.10 统计

#### 首页

```
GET /api/stats/home
→ 200 {
  ok, data: {
    month, monthLabel,                      // 2026-06 / 2026年6月
    totalIncome, totalExpense, balance,
    todayExpense,                            // 今日支出
    topCategories: [{ categoryId, amount, percent }],  // 本月 TOP 3
    recent: [Record, ...]                    // 最近 10 条
  }
}
```

#### 概览

```
GET /api/stats/overview?month=2026-06
→ 200 { ok, data: { month, monthLabel, totalIncome, totalExpense, balance, count } }
```

#### 分类支出饼图

```
GET /api/stats/category-expense?month=2026-06&limit=10
→ 200 { ok, data: { month, total, items: [{ categoryId, amount, percent }] } }
```

#### 分类收入柱状图

```
GET /api/stats/category-income?month=2026-06
→ 200 { ok, data: { month, total, items: [{ categoryId, amount, percent }] } }
```

#### 日支出趋势

```
GET /api/stats/daily-trend?month=2026-06
→ 200 { ok, data: { month, series: [{ date, day, amount }, ...] } }  // 30/31 天
```

#### Excel 导出

```
GET /api/stats/export?month=2026-06
→ 200 Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
   Content-Disposition: attachment; filename="countcat-2026-06.xlsx"
   
   [xlsx 二进制流]
```

5 个 Sheet：概览 / 分类支出 / 分类收入 / 日支出趋势 / 明细。

### 3.11 头像上传

```
POST /api/users/me/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <image/png | image/jpeg | image/webp>   // 字段名固定为 "file"
```

限制：≤ 2MB；仅 png/jpg/webp。返回：

```json
{
  "ok": true,
  "data": {
    "avatar": "http://localhost:3001/uploads/avatars/1/{uuid}.png",
    "user": { id, username, nickname, avatar, createdAt }
  }
}
```

文件保存在 `backend/public/uploads/avatars/{userId}/{file}`，由 app.js 挂载的 `/uploads` 静态服务对外暴露。

### 3.12 改昵称

```
PATCH /api/users/me/profile
{ "nickname": "阿璃" }
→ 200 { ok, data: User }
```

---

## 4. JWT 鉴权约定

- 头部：`Authorization: Bearer <token>`
- 过期：默认 7 天（`JWT_EXPIRES_IN`）
- 签发者：`countcat`
- 负载：`{ id, username, iat, exp }`
- 黑名单：退出后 token 哈希进 `token_blacklist` 表，由 `requireAuth` 中间件查表拦截

生产环境务必用 `openssl rand -hex 64` 生成强随机 `JWT_SECRET`。

---

## 5. 数据库表

V1.2 复用了 V1.0.1 全部表（users / categories / records / token_blacklist 等），并新增：

| 表名 | 新增位置 | 用途 |
|---|---|---|
| `accounts` | `07_accounts.sql` | 用户账户集合 |
| `records.account_id` | `07_accounts.sql` 增量 | 记录所属账户（可空） |
| `categories.user_id` | `08_category_user.sql` 增量 | 自定义分类按用户隔离 |

所有增量脚本都是**幂等**的：用 information_schema 判重后再 ALTER/CREATE，可重复执行。

`npm run db:init` 会按顺序跑：

```
01_create_database.sql → 02_schema.sql → 03_seed_categories.sql
  → 04_sample_data.sql → 06_auth_extras.sql → 07_accounts.sql → 08_category_user.sql
```

---

## 6. 错误码表

| code | HTTP | 含义 |
|---|---|---|
| `BAD_REQUEST` | 400 | 请求参数不合法 |
| `INVALID_USERNAME` / `INVALID_PASSWORD` | 400 | 用户名/密码格式错误 |
| `UNAUTHORIZED` | 401 | 未登录 |
| `INVALID_TOKEN` / `TOKEN_EXPIRED` / `TOKEN_REVOKED` | 401 | token 问题 |
| `INVALID_CREDENTIALS` | 401 | 用户名/密码错 |
| `NOT_FOUND` / `USER_NOT_FOUND` / `ACCOUNT_NOT_FOUND` / `CATEGORY_NOT_FOUND` / `RECORD_NOT_FOUND` | 404 | 资源不存在 |
| `USER_EXISTS` | 409 | 用户名已注册 |
| `CATEGORY_HAS_RECORDS` | 409 | 分类下还有记录 |
| `ACCOUNT_SYSTEM_PROTECTED` | 403 | 系统账户不可删 |
| `CATEGORY_SYSTEM_PROTECTED` | 403 | 系统分类不可改/删 |
| `UPLOAD_TOO_LARGE` | 413 | 文件超 2MB |
| `UPLOAD_BAD_TYPE` | 415 | 文件 MIME 不允许 |
| `UPLOAD_FAILED` | 400 | 上传失败 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

---

## 7. 常用 curl 调试

```bash
# 注册（自动种账户）
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"1234"}'

# 登录
TOKEN=$(curl -sX POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"1234"}' | jq -r .data.token)

# 当前用户
curl http://localhost:3001/api/auth/me -H "Authorization: Bearer $TOKEN"

# 账户列表
curl http://localhost:3001/api/accounts -H "Authorization: Bearer $TOKEN"

# 分类树
curl http://localhost:3001/api/categories -H "Authorization: Bearer $TOKEN"

# 新增记录
curl -X POST http://localhost:3001/api/records \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":25,"type":"expense","categoryId":"food","subCategoryId":"food_lunch","note":"黄焖鸡","recordDate":"2026-06-13","accountId":1}'

# 首页统计
curl http://localhost:3001/api/stats/home -H "Authorization: Bearer $TOKEN"

# 导出 Excel（保存到文件）
curl "http://localhost:3001/api/stats/export?month=2026-06" \
  -H "Authorization: Bearer $TOKEN" \
  -o countcat-2026-06.xlsx

# 头像上传
curl -X POST http://localhost:3001/api/users/me/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/avatar.png"
```

---

## 8. 与前端集成

前端 V1.2 已切到这套接口（baseURL = `/api`，由 vite.config.js 反代到 `http://localhost:3001`）。

新增的 store 调用入口（待前端 patch 时按需引用）：

```js
// 已有：authStore（鉴权）
// 新增：accountStore / categoryStore（接后端后只改内部 _load/_save）
// 新增：recordsStore 接 /api/records 列表
// 新增：statsStore 接 /api/stats/*
// 头像：直接调 authStore.updateProfile() 或 authApi 调用 /api/users/me/avatar
```

---

## 9. 安全与扩展

- **密码安全**：沿用 V1.0.1 SHA-256 哈希以兼容老用户。生产环境请升级 bcrypt/argon2
- **静态资源**：`/uploads` 由 Express 静态中间件托管；生产环境建议接 OSS / CDN
- **CORS**：开发期允许 localhost / 私网；生产环境在 `.env` 的 `CORS_ORIGIN` 中加白名单
- **SQL 注入**：全部走 `?` 占位符参数化
- **未来扩展点**：V1.3 可加 `budgets` / `monthly_reports` 业务接口（表已存在）
