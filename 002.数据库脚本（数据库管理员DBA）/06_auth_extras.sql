-- =============================================================================
-- 记账喵 CountCat - 鉴权相关补丁
-- 适用：MySQL 9.7.0
-- 说明：在 V1.1 schema 基础上补充 token 黑名单（用于实现真正的"退出登录"）
--       - 幂等：可用 db:init 多次执行
--       - 包含 V1.1 之前已部署库的迁移 ALTER
-- =============================================================================

USE countcat;

-- -----------------------------------------------------------------------------
-- 1) token_blacklist：token 黑名单
--   - 用户主动调用 POST /api/auth/logout 时，把当前 token 的 SHA-256 哈希写入
--   - requireAuth 中间件在每次请求时检查该表，命中即视为 401
--   - token 原有的 exp 时间到了之后，行已无实际意义，可由后台清理任务删除
--   - 不放 user_id 也能工作（hash 全局唯一），但保留 user_id 便于按用户清空 / 审计
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS token_blacklist (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    token_hash      CHAR(64)     NOT NULL                            COMMENT 'token 的 SHA-256 哈希（hex）',
    user_id         BIGINT UNSIGNED NOT NULL                        COMMENT '哪个用户退的（冗余便于审计/清理）',
    expires_at      DATETIME     NOT NULL                            COMMENT 'token 原 exp 时间，到期后可清理',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_blacklist_token_hash (token_hash),
    KEY idx_blacklist_user (user_id),
    KEY idx_blacklist_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='退出登录的 token 黑名单';


-- -----------------------------------------------------------------------------
-- 2) 兜底：检查 users 表是否有 created_at 字段
--   - 02_schema.sql 中已定义；此段是为了给"先建库再升级"的老库补字段
--   - MySQL 9 没有简单的 IF NOT EXISTS ADD COLUMN，故用 information_schema 判断
-- -----------------------------------------------------------------------------
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'countcat'
      AND TABLE_NAME   = 'users'
      AND COLUMN_NAME  = 'created_at'
);
SET @ddl = IF(
    @col_exists = 0,
    'ALTER TABLE users ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT ''注册时间'' AFTER is_deleted',
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
