-- =============================================================================
-- 记账喵 CountCat - 分类表 user_id 增量脚本（V1.2 自定义子分类 per-user 隔离）
-- 适用：MySQL 9.7.0
-- 说明：
--   - 内置分类（is_system=1）user_id 仍为 NULL，所有用户共享
--   - 自定义分类（is_system=0）按 user_id 隔离
-- 顺序：init-db.js 在 07_accounts.sql 之后执行
-- =============================================================================

USE countcat;

-- 1) 加列（幂等）
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'countcat'
      AND TABLE_NAME   = 'categories'
      AND COLUMN_NAME  = 'user_id'
);
SET @ddl = IF(
    @col_exists = 0,
    'ALTER TABLE categories ADD COLUMN user_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''所属用户（NULL=全局内置）'' AFTER id',
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) 索引：按用户查自定义分类
SET @idx_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = 'countcat'
      AND TABLE_NAME   = 'categories'
      AND INDEX_NAME   = 'idx_categories_user'
);
SET @ddl = IF(
    @idx_exists = 0,
    'CREATE INDEX idx_categories_user ON categories (user_id, is_system, is_active)',
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) 外键：自定义分类的 user_id 引用 users(id)
SET @fk_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = 'countcat'
      AND TABLE_NAME   = 'categories'
      AND CONSTRAINT_NAME = 'fk_categories_user'
);
SET @ddl = IF(
    @fk_exists = 0,
    'ALTER TABLE categories ADD CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4) 软删除字段：与 records/accounts 一致
--    原因：categoriesService.js 8 处用到 WHERE is_deleted = 0
--    02_schema.sql 创建 categories 时漏了此字段，08 增量补上
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'countcat'
      AND TABLE_NAME   = 'categories'
      AND COLUMN_NAME  = 'is_deleted'
);
SET @ddl = IF(
    @col_exists = 0,
    'ALTER TABLE categories ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''软删除'' AFTER is_active',
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5) 软删除时间戳（可选，PRD 30 天回收站用）
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'countcat'
      AND TABLE_NAME   = 'categories'
      AND COLUMN_NAME  = 'deleted_at'
);
SET @ddl = IF(
    @col_exists = 0,
    'ALTER TABLE categories ADD COLUMN deleted_at DATETIME DEFAULT NULL COMMENT ''软删除时间'' AFTER is_deleted',
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6) 软删除索引
SET @idx_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = 'countcat'
      AND TABLE_NAME   = 'categories'
      AND INDEX_NAME   = 'idx_categories_deleted'
);
SET @ddl = IF(
    @idx_exists = 0,
    'CREATE INDEX idx_categories_deleted ON categories (is_deleted, deleted_at)',
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 验证
SELECT '分类 user_id 列存在' AS metric,
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA='countcat' AND TABLE_NAME='categories' AND COLUMN_NAME='user_id') AS value
UNION ALL SELECT '分类 user_id 外键存在',
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA='countcat' AND TABLE_NAME='categories' AND CONSTRAINT_NAME='fk_categories_user')
UNION ALL SELECT '分类 is_deleted 列存在',
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA='countcat' AND TABLE_NAME='categories' AND COLUMN_NAME='is_deleted')
UNION ALL SELECT '分类 deleted_at 列存在',
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA='countcat' AND TABLE_NAME='categories' AND COLUMN_NAME='deleted_at');
