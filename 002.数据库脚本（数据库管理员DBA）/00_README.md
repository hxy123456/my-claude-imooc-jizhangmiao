# 记账喵 CountCat - 数据库设计文档

> 数据库：MySQL 9.7.0  
> 字符集：utf8mb4 / utf8mb4_0900_ai_ci  
> 数据库名：`countcat`

本文档描述记账喵产品的 MySQL 数据库结构。覆盖 PRD 已规划的全部版本（V1.0.1 / V1.1 / V1.2 / V2.0），未来版本表带版本注释，未启用版本可按需建表。

## 一、文件清单

| 文件 | 用途 | 执行顺序 |
|---|---|---|
| `01_create_database.sql` | 建库 + 默认字符集 | 1 |
| `02_schema.sql` | 全部表结构（按版本分段） | 2 |
| `03_seed_categories.sql` | 初始分类数据（与前端 `categories.js` 一致） | 3 |
| `04_sample_data.sql` | 示例用户/记录（用于本地联调，可选） | 4 |

## 二、执行方式

```bash
# 方式一：依次执行
docker exec -i countcat-mysql mysql -uroot -p123456 < 01_create_database.sql
docker exec -i countcat-mysql mysql -uroot -p123456 < 02_schema.sql
docker exec -i countcat-mysql mysql -uroot -p123456 < 03_seed_categories.sql
docker exec -i countcat-mysql mysql -uroot -p123456 < 04_sample_data.sql

# 方式二：在 mysql 客户端内 source
mysql -h127.0.0.1 -P3307 -uroot -p123456
mysql> source 01_create_database.sql;
mysql> use countcat;
mysql> source 02_schema.sql;
...
```

> ⚠️ 当前 MySQL 容器映射端口为 `3307`（宿主机 3306 被本机 mysqld 占用），请按实际环境调整。

## 三、表清单

### 当前版本（V1.0.1）

| 表名 | 中文 | 说明 |
|---|---|---|
| `users` | 用户表 | 注册/登录，SHA-256 密码哈希 |
| `categories` | 分类表 | 两级分类树（支出/收入） |
| `records` | 记录表 | 记账流水主表 |

### V1.1 增强版

| 表名 | 中文 | 说明 |
|---|---|---|
| `budgets` | 预算表 | 月度总预算 + 分类预算 |
| `monthly_reports` | 月度报告 | 每月 1 日自动生成的统计快照 |

### V1.2 效率版

| 表名 | 中文 | 说明 |
|---|---|---|
| `recurring_records` | 周期记账 | 日/周/月周期自动生成记录 |
| `record_attachments` | 附件表 | OCR 拍照识别小票 |

### V2.0 多账本

| 表名 | 中文 | 说明 |
|---|---|---|
| `ledgers` | 账本表 | 多账本（个人/家庭/生意） |
| `ledger_members` | 账本成员 | 账本共享成员关系（V2.0 家庭共享） |

## 四、ER 关系总览

```
users (1) ──< (N) records
users (1) ──< (N) budgets
users (1) ──< (N) recurring_records
users (1) ──< (N) monthly_reports
users (1) ──< (N) ledgers
users (1) ──< (N) ledger_members

categories (1) ──< (N) categories        -- 自引用（parent_id）
categories (1) ──< (N) records            -- 记录所属大类
categories (1) ──< (N) records            -- 记录所属子类（sub_category_id）
categories (1) ──< (N) budgets
categories (1) ──< (N) recurring_records

records (1) ──< (N) record_attachments   -- 一条记录可附多张图

ledgers (1) ──< (N) ledger_members
ledgers (1) ──< (N) records               -- 记录归属于某个账本（V1 可全为默认账本）
```

## 五、与前端 IndexedDB 的映射

| IndexedDB 字段（`db.js`）| MySQL 字段 | 表 |
|---|---|---|
| `users.id` (auto-increment int) | `users.id` BIGINT UNSIGNED | `users` |
| `users.username` | `users.username` VARCHAR(50) | `users` |
| `users.passwordHash` | `users.password_hash` VARCHAR(64) | `users` |
| `users.createdAt` (ISO) | `users.created_at` DATETIME | `users` |
| `records.id` (auto-increment) | `records.id` BIGINT UNSIGNED | `records` |
| `records.userId` | `records.user_id` BIGINT | `records` |
| `records.amount` (Number) | `records.amount` DECIMAL(10,2) | `records` |
| `records.type` ('expense'\|'income') | `records.type` ENUM(...) | `records` |
| `records.categoryId` ('food' 等) | `records.category_id` VARCHAR(50) | `records` |
| `records.subCategoryId` | `records.sub_category_id` VARCHAR(50) | `records` |
| `records.note` (≤50) | `records.note` VARCHAR(50) | `records` |
| `records.recordDate` ('YYYY-MM-DD') | `records.record_date` DATE | `records` |
| `records.createdAt` | `records.created_at` DATETIME | `records` |
| `records.updatedAt` | `records.updated_at` DATETIME | `records` |
| `records.isDeleted` | `records.is_deleted` TINYINT(1) | `records` |

**关键差异**：
- `categories` 在 IndexedDB 是硬编码的 JS 常量，在 MySQL 中建表存储，支持后续用户自定义分类（V1.1+）
- `users.passwordHash` 字段从 64 字符（SHA-256 hex）扩大到 255 字符，为后续升级到 bcrypt/argon2 留余量
- 新增 `records.deleted_at` 字段，支持 30 天回收站（PRD §9.2 规划）

## 六、安全与性能说明

- **密码安全**：V1.0.1 沿用 SHA-256 哈希（与前端一致，便于迁移）。生产环境**强烈建议**升级到 bcrypt / argon2
- **金额精度**：`DECIMAL(10,2)` 上限 99999999.99，满足个人/小微记账场景
- **软删除**：所有用户数据表（`records`、`budgets`、`recurring_records`）默认带 `is_deleted` + `deleted_at` 字段
- **索引策略**：按"按用户 + 按日期范围"的高频查询建复合索引
- **外键约束**：开启 InnoDB 外键，孤儿数据由数据库层兜底

## 七、未来扩展点

- V1.1：增加 `budgets` 表 + 首页预算进度条
- V1.2：增加 `recurring_records` 表（自动结转）+ `record_attachments`（OCR）
- V2.0：增加 `ledgers` 表，所有 `records` 加 `ledger_id` 外键
- 安全：升级密码哈希到 bcrypt；增加 `user_sessions` 表用于 JWT 黑名单
