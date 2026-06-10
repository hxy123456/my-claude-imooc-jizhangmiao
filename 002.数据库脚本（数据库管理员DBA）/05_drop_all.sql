-- =============================================================================
-- 记账喵 CountCat - 回滚脚本（清空数据库）
-- 警告：本脚本不可逆！执行后 countcat 库将完全消失
-- 适用：MySQL 9.7.0
--
-- ★★★ 使用方式（任选其一）★★★
-- 方式 A（推荐，先在 mysql 客户端里确认意图再执行）：
--     mysql -h127.0.0.1 -P3307 -uroot -p123456
--     mysql> DROP DATABASE IF EXISTS countcat;   -- 一行就够，下面这整个文件就是它的展开
--
-- 方式 B（脚本方式）：
--     cat 05_drop_all.sql | docker exec -i countcat-mysql mysql -uroot -p123456
--
-- 方式 C（仅清空数据，保留库结构）：
--     见本文件末尾的"软回滚"段，把那段从 /*SOFT*/ 到 /*SOFT_END*/ 的注释取消
-- =============================================================================

-- 1. 切到目标库（管道执行时 mysql 不会自动选库，必须显式 USE）
USE countcat;

-- 2. 关闭外键检查（让删除顺序自由）
SET FOREIGN_KEY_CHECKS = 0;

-- 3. 按"被引用方后删"的逆序删除全部表
DROP TABLE IF EXISTS record_attachments;     -- 依赖 records, users
DROP TABLE IF EXISTS records;                -- 依赖 users, categories, ledgers, recurring_records
DROP TABLE IF EXISTS recurring_records;      -- 依赖 users, categories
DROP TABLE IF EXISTS budgets;                -- 依赖 users, categories
DROP TABLE IF EXISTS monthly_reports;        -- 依赖 users
DROP TABLE IF EXISTS ledger_members;         -- 依赖 ledgers, users
DROP TABLE IF EXISTS ledgers;                -- 依赖 users
DROP TABLE IF EXISTS categories;             -- 自引用
DROP TABLE IF EXISTS users;                  -- 无外键

-- 4. 恢复外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- 5. 删除整个数据库
DROP DATABASE IF EXISTS countcat;

-- 6. 验证：USE countcat 应该报错（库已不存在）
--    这一行如果执行通过，说明回滚失败，需排查
USE countcat;
