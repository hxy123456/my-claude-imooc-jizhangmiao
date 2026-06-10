-- =============================================================================
-- 记账喵 CountCat - 表结构脚本
-- 适用：MySQL 9.7.0
-- 说明：覆盖 V1.0.1 / V1.1 / V1.2 / V2.0 全部表，按版本段分组
-- =============================================================================

USE countcat;

-- =============================================================================
-- 通用约定
--   • 主键：id（自增或字符串）
--   • 外键：<关联表>_id
--   • 时间戳：created_at / updated_at
--   • 软删除：is_deleted TINYINT(1) + deleted_at DATETIME
--   • 字符集：utf8mb4 / utf8mb4_0900_ai_ci
--   • 引擎：InnoDB（事务 + 外键）
-- =============================================================================


-- =============================================================================
-- V1.0.1 段：用户系统（对应前端 stores/auth.js + utils/db.js）
-- =============================================================================

-- -----------------------------------------------------------------------------
-- users：用户表
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT           COMMENT '主键',
    username        VARCHAR(50)  NOT NULL                             COMMENT '用户名（唯一）',
    password_hash   VARCHAR(255) NOT NULL                             COMMENT '密码哈希（V1.0.1=SHA-256 hex 64 字符，留余量给后续升级 bcrypt/argon2）',
    nickname        VARCHAR(50)  DEFAULT NULL                         COMMENT '昵称（V2.0 用）',
    avatar          VARCHAR(255) DEFAULT NULL                         COMMENT '头像 URL（V2.0 用）',
    is_deleted      TINYINT(1)   NOT NULL DEFAULT 0                   COMMENT '软删除',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP  COMMENT '注册时间',
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP         COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='用户表';


-- -----------------------------------------------------------------------------
-- categories：分类表（两级树）
--   - 顶层分类：parent_id = NULL
--   - 子分类：parent_id = <父分类 id>
--   - id 用 VARCHAR(50)，与前端 categories.js 的 string id 保持一致
-- -----------------------------------------------------------------------------
CREATE TABLE categories (
    id              VARCHAR(50)  NOT NULL                             COMMENT '主键（与前端 string id 对齐，如 food / food_lunch）',
    name            VARCHAR(20)  NOT NULL                             COMMENT '分类名称',
    icon            VARCHAR(20)  DEFAULT NULL                         COMMENT '图标标识（emoji 或 iconfont）',
    color           VARCHAR(7)   DEFAULT NULL                         COMMENT '颜色值（#RRGGBB）',
    type            ENUM('expense','income') NOT NULL                COMMENT '分类类型',
    sort_order      INT          NOT NULL DEFAULT 0                   COMMENT '排序权重（升序）',
    parent_id       VARCHAR(50)  DEFAULT NULL                         COMMENT '父分类 id（NULL=顶层）',
    is_system       TINYINT(1)   NOT NULL DEFAULT 1                   COMMENT '是否系统内置（1=系统，0=用户自定义）',
    is_active       TINYINT(1)   NOT NULL DEFAULT 1                   COMMENT '是否启用',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_categories_type_parent (type, parent_id),
    KEY idx_categories_parent (parent_id),
    CONSTRAINT fk_categories_parent
        FOREIGN KEY (parent_id) REFERENCES categories(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_categories_color_format
        CHECK (color IS NULL OR color REGEXP '^#[0-9A-Fa-f]{6}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='分类表（两级树）';


-- -----------------------------------------------------------------------------
-- records：记账记录主表
-- -----------------------------------------------------------------------------
CREATE TABLE records (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL                         COMMENT '所属用户',
    amount          DECIMAL(10,2) NOT NULL                          COMMENT '金额（正数，type 决定收支方向）',
    type            ENUM('expense','income') NOT NULL               COMMENT '记录类型',
    category_id     VARCHAR(50) NOT NULL                            COMMENT '所属大类 id（顶层分类）',
    sub_category_id VARCHAR(50) DEFAULT NULL                        COMMENT '所属子分类 id（NULL=只有大类）',
    note            VARCHAR(50) DEFAULT NULL                        COMMENT '备注（前端限制 50 字）',
    record_date     DATE NOT NULL                                   COMMENT '记账日期（业务日期）',
    -- V1.2 字段（提前预留，不影响 V1.0.1 业务）
    source          ENUM('manual','recurring','import','ocr') NOT NULL DEFAULT 'manual'
                                                                   COMMENT '记录来源（V1.2）',
    recurring_id    BIGINT UNSIGNED DEFAULT NULL                    COMMENT '由哪条周期规则生成（V1.2）',
    -- V2.0 字段（提前预留，不影响 V1.0.1 业务）
    ledger_id       BIGINT UNSIGNED DEFAULT NULL                    COMMENT '所属账本（V2.0，V1 阶段保持 NULL）',
    -- 通用
    is_deleted      TINYINT(1) NOT NULL DEFAULT 0                   COMMENT '软删除',
    deleted_at      DATETIME DEFAULT NULL                           COMMENT '软删除时间（30 天回收站）',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    -- 高频索引：按用户 + 日期范围
    KEY idx_records_user_date (user_id, record_date),
    -- 按用户 + 类型 + 日期（统计用）
    KEY idx_records_user_type_date (user_id, type, record_date),
    -- 按用户 + 分类 + 日期（分类筛选用）
    KEY idx_records_user_cat_date (user_id, category_id, record_date),
    -- 全文索引：备注搜索（V1.0.1 Bills 页面有用）
    FULLTEXT KEY ft_records_note (note),
    -- 回收站
    KEY idx_records_deleted (is_deleted, deleted_at),
    -- 外键
    CONSTRAINT fk_records_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_records_category
        FOREIGN KEY (category_id) REFERENCES categories(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_records_subcategory
        FOREIGN KEY (sub_category_id) REFERENCES categories(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    -- 业务约束
    CONSTRAINT chk_records_amount_positive
        CHECK (amount > 0),
    CONSTRAINT chk_records_note_length
        CHECK (note IS NULL OR CHAR_LENGTH(note) <= 50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='记账记录表';


-- =============================================================================
-- V1.1 段：预算管理 + 月度报告
-- =============================================================================

-- -----------------------------------------------------------------------------
-- budgets：预算表
--   - category_id IS NULL = 月度总预算
--   - category_id 非空  = 某分类的子预算
-- -----------------------------------------------------------------------------
CREATE TABLE budgets (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    category_id     VARCHAR(50) DEFAULT NULL                         COMMENT 'NULL=总预算，否则=分类预算',
    amount          DECIMAL(10,2) NOT NULL                          COMMENT '预算金额（> 0）',
    month           CHAR(7) NOT NULL                                COMMENT '月份，格式 YYYY-MM',
    is_deleted      TINYINT(1) NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    -- 一个用户在同一月份、对同一分类只能有一条预算
    UNIQUE KEY uk_budgets_user_cat_month (user_id, category_id, month),
    KEY idx_budgets_user_month (user_id, month),
    CONSTRAINT fk_budgets_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_budgets_category
        FOREIGN KEY (category_id) REFERENCES categories(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_budgets_amount_positive
        CHECK (amount > 0),
    CONSTRAINT chk_budgets_month_format
        CHECK (month REGEXP '^[0-9]{4}-[0-9]{2}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='月度预算表（V1.1）';


-- -----------------------------------------------------------------------------
-- monthly_reports：月度报告
--   - 每月 1 日由定时任务生成上月报告
-- -----------------------------------------------------------------------------
CREATE TABLE monthly_reports (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    month           CHAR(7) NOT NULL                                COMMENT '月份 YYYY-MM',
    total_expense   DECIMAL(12,2) NOT NULL DEFAULT 0                COMMENT '总支出',
    total_income    DECIMAL(12,2) NOT NULL DEFAULT 0                COMMENT '总收入',
    daily_avg       DECIMAL(10,2) NOT NULL DEFAULT 0                COMMENT '日均消费',
    max_single      DECIMAL(10,2) NOT NULL DEFAULT 0                COMMENT '最大单笔支出',
    top_categories  JSON DEFAULT NULL                              COMMENT 'Top 3 分类（JSON 数组）',
    mom_changes     JSON DEFAULT NULL                              COMMENT '环比变化（JSON）',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_reports_user_month (user_id, month),
    CONSTRAINT fk_reports_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_reports_month_format
        CHECK (month REGEXP '^[0-9]{4}-[0-9]{2}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='月度报告表（V1.1）';


-- =============================================================================
-- V1.2 段：周期记账 + OCR 附件
-- =============================================================================

-- -----------------------------------------------------------------------------
-- recurring_records：周期记账规则
-- -----------------------------------------------------------------------------
CREATE TABLE recurring_records (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    amount          DECIMAL(10,2) NOT NULL,
    type            ENUM('expense','income') NOT NULL,
    category_id     VARCHAR(50) NOT NULL,
    note            VARCHAR(50) DEFAULT NULL,
    cycle           ENUM('daily','weekly','monthly') NOT NULL       COMMENT '周期',
    start_date      DATE NOT NULL                                   COMMENT '开始日期',
    end_date        DATE DEFAULT NULL                               COMMENT '结束日期（NULL=无限）',
    next_date       DATE NOT NULL                                   COMMENT '下次执行日期',
    is_active       TINYINT(1) NOT NULL DEFAULT 1                   COMMENT '是否启用',
    is_deleted      TINYINT(1) NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_recurring_user_active_next (user_id, is_active, next_date),
    CONSTRAINT fk_recurring_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_recurring_category
        FOREIGN KEY (category_id) REFERENCES categories(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_recurring_amount_positive
        CHECK (amount > 0),
    CONSTRAINT chk_recurring_date_range
        CHECK (end_date IS NULL OR end_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='周期记账规则表（V1.2）';


-- -----------------------------------------------------------------------------
-- record_attachments：记录附件（OCR 图片、账单文件）
-- -----------------------------------------------------------------------------
CREATE TABLE record_attachments (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    record_id       BIGINT UNSIGNED DEFAULT NULL                    COMMENT '关联的记录（OCR 确认后回填）',
    user_id         BIGINT UNSIGNED NOT NULL                       COMMENT '上传用户',
    file_path       VARCHAR(500) NOT NULL                          COMMENT '文件存储路径（OSS/本地）',
    file_type       ENUM('image','pdf','csv') NOT NULL DEFAULT 'image',
    ocr_text        TEXT DEFAULT NULL                              COMMENT 'OCR 识别原文',
    ocr_amount      DECIMAL(10,2) DEFAULT NULL                     COMMENT 'OCR 识别金额（待确认）',
    ocr_merchant    VARCHAR(100) DEFAULT NULL                      COMMENT 'OCR 识别商户名',
    ocr_status      ENUM('pending','confirmed','rejected') NOT NULL DEFAULT 'pending'
                                                                COMMENT 'OCR 确认状态',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_attach_user_created (user_id, created_at),
    KEY idx_attach_record (record_id),
    KEY idx_attach_ocr_status (ocr_status),
    CONSTRAINT fk_attach_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_attach_record
        FOREIGN KEY (record_id) REFERENCES records(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='记录附件表（V1.2）';


-- =============================================================================
-- V2.0 段：多账本
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ledgers：账本表
-- -----------------------------------------------------------------------------
CREATE TABLE ledgers (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    owner_id        BIGINT UNSIGNED NOT NULL                       COMMENT '账本创建者',
    name            VARCHAR(50) NOT NULL                           COMMENT '账本名',
    icon            VARCHAR(20) DEFAULT NULL,
    color           VARCHAR(7) DEFAULT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    is_default      TINYINT(1) NOT NULL DEFAULT 0                  COMMENT '是否默认账本',
    is_archived     TINYINT(1) NOT NULL DEFAULT 0                  COMMENT '是否归档',
    is_deleted      TINYINT(1) NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_ledgers_owner (owner_id, is_deleted),
    CONSTRAINT fk_ledgers_owner
        FOREIGN KEY (owner_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='账本表（V2.0）';


-- -----------------------------------------------------------------------------
-- ledger_members：账本成员（V2.0 家庭/情侣共享）
-- -----------------------------------------------------------------------------
CREATE TABLE ledger_members (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    ledger_id       BIGINT UNSIGNED NOT NULL,
    user_id         BIGINT UNSIGNED NOT NULL,
    role            ENUM('owner','editor','viewer') NOT NULL DEFAULT 'editor',
    joined_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_ledger_user (ledger_id, user_id),
    KEY idx_ledger_members_user (user_id),
    CONSTRAINT fk_ledger_members_ledger
        FOREIGN KEY (ledger_id) REFERENCES ledgers(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ledger_members_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='账本成员表（V2.0）';


-- =============================================================================
-- 回填 records 与 ledgers 的外键（V2.0 表后建）
-- =============================================================================
ALTER TABLE records
    ADD CONSTRAINT fk_records_ledger
        FOREIGN KEY (ledger_id) REFERENCES ledgers(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT fk_records_recurring
        FOREIGN KEY (recurring_id) REFERENCES recurring_records(id)
        ON DELETE SET NULL ON UPDATE CASCADE;

-- 索引补充：按账本查记录
CREATE INDEX idx_records_ledger ON records (ledger_id, record_date);


-- =============================================================================
-- 验证：列出所有表
-- =============================================================================
SHOW TABLES;
