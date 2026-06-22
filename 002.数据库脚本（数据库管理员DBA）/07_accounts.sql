-- =============================================================================
-- 记账喵 CountCat - 账户表 + records.account_id 增量脚本
-- 适用：MySQL 9.7.0
-- 说明：
--   1) 全新建库场景：02_schema.sql 之后执行本脚本
--   2) 旧库升级场景：本脚本幂等（用 information_schema 判重）
-- 顺序：init-db.js 在 06_auth_extras.sql 之后执行
-- =============================================================================

USE countcat;

-- -----------------------------------------------------------------------------
-- 1) accounts：账户表
--   - 每个用户拥有自己的账户集合
--   - 首次注册时由 authService 种入 3 个默认账户（现金/微信/支付宝）
--   - is_system=1 不可删（前端对应红色"内置账户"角标）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT           COMMENT '主键',
    user_id         BIGINT UNSIGNED NOT NULL                          COMMENT '所属用户',
    name            VARCHAR(20)  NOT NULL                             COMMENT '账户名称',
    icon            VARCHAR(20)  NOT NULL DEFAULT '💳'                COMMENT '图标（emoji）',
    is_system       TINYINT(1)   NOT NULL DEFAULT 0                   COMMENT '是否内置',
    is_deleted      TINYINT(1)   NOT NULL DEFAULT 0                   COMMENT '软删除',
    sort_order      INT          NOT NULL DEFAULT 0                   COMMENT '排序',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_accounts_user (user_id, is_deleted),
    CONSTRAINT fk_accounts_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_accounts_name_not_empty
        CHECK (CHAR_LENGTH(TRIM(name)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='账户表';


-- -----------------------------------------------------------------------------
-- 2) records.account_id 增量（V1.2 设置页的"账户"维度记账）
--   - 老库缺这一列：information_schema 判断后 ALTER
--   - 不建外键约束（账户可软删；记录保留可见的历史所属账户）
-- -----------------------------------------------------------------------------
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'countcat'
      AND TABLE_NAME   = 'records'
      AND COLUMN_NAME  = 'account_id'
);
SET @ddl = IF(
    @col_exists = 0,
    'ALTER TABLE records ADD COLUMN account_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''所属账户（V1.2，可空）'' AFTER sub_category_id',
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 索引补充：按账户统计
SET @idx_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = 'countcat'
      AND TABLE_NAME   = 'records'
      AND INDEX_NAME   = 'idx_records_account'
);
SET @ddl = IF(
    @idx_exists = 0,
    'CREATE INDEX idx_records_account ON records (user_id, account_id)',
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 3) 验证
-- -----------------------------------------------------------------------------
SELECT 'accounts 表行数' AS metric, COUNT(*) AS value FROM accounts
UNION ALL SELECT '已有 account_id 列',
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA='countcat' AND TABLE_NAME='records' AND COLUMN_NAME='account_id');
