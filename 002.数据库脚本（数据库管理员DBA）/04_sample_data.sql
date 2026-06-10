-- =============================================================================
-- 记账喵 CountCat - 示例数据
-- 用途：本地开发联调，可选导入
-- 注意：示例用户密码均为 "123456" 的 SHA-256 哈希
--       123456 的 SHA-256 = 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
-- =============================================================================

USE countcat;

-- -----------------------------------------------------------------------------
-- 示例用户
--   demo_user : 123456  →  8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
-- -----------------------------------------------------------------------------
INSERT INTO users (id, username, password_hash, nickname) VALUES
(1, 'demo_user', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', '示例用户');

-- -----------------------------------------------------------------------------
-- 示例账本（V2.0 表，先建好后 records.ledger_id 才能引用）
-- -----------------------------------------------------------------------------
INSERT INTO ledgers (id, owner_id, name, icon, color, is_default) VALUES
(1, 1, '个人账本', '🏠', '#E8654A', 1);

-- -----------------------------------------------------------------------------
-- 示例记录（与前端 seedDemoData() 一致；日期相对当前月）
-- -----------------------------------------------------------------------------
INSERT INTO records (user_id, amount, type, category_id, sub_category_id, note, record_date, source, ledger_id) VALUES
-- 今日
(1, 25.00,  'expense', 'food',          'food_lunch',         '黄焖鸡',     CURDATE(),                          'manual', 1),
(1, 4.00,   'expense', 'transport',     'transport_metro',    '',           CURDATE(),                          'manual', 1),
(1, 15.00,  'expense', 'shopping',      'shopping_daily',     '纸巾',       CURDATE(),                          'manual', 1),
-- 5 号：发工资
(1, 8500.00,'income',  'salary',        'salary_base',        '月薪',       DATE_FORMAT(CURDATE(), '%Y-%m-05'), 'manual', 1),
-- 1 号：房租
(1, 1800.00,'expense', 'housing',       'housing_rent',       '房租',       DATE_FORMAT(CURDATE(), '%Y-%m-01'), 'manual', 1),
-- 昨天
(1, 35.00,  'expense', 'entertainment', 'entertainment_movie','看电影',     DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'manual', 1),
(1, 128.00, 'expense', 'shopping',      'shopping_clothes',   'T恤',        DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'manual', 1),
-- 前天
(1, 12.00,  'expense', 'food',          'food_breakfast',     '豆浆油条',   DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'manual', 1),
(1, 68.00,  'expense', 'food',          'food_dinner',        '火锅',       DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'manual', 1),
-- 10/12/15/20/8 号：分散支出与兼职收入
(1, 200.00, 'expense', 'telecom',       'telecom_member',     '各种会员',   DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'manual', 1),
(1, 50.00,  'expense', 'transport',     'transport_taxi',     '加班打车',   DATE_FORMAT(CURDATE(), '%Y-%m-08'), 'manual', 1),
(1, 300.00, 'expense', 'medical',       'medical_medicine',   '感冒药',     DATE_FORMAT(CURDATE(), '%Y-%m-12'), 'manual', 1),
(1, 99.00,  'expense', 'education',     'education_book',     '技术书',     DATE_FORMAT(CURDATE(), '%Y-%m-15'), 'manual', 1),
(1, 500.00, 'income',  'freelance',     'freelance_gig',      '兼职收入',   DATE_FORMAT(CURDATE(), '%Y-%m-20'), 'manual', 1);

-- -----------------------------------------------------------------------------
-- 示例月度预算（V1.1）
-- -----------------------------------------------------------------------------
INSERT INTO budgets (user_id, category_id, amount, month) VALUES
(1, NULL,           5000.00, DATE_FORMAT(CURDATE(), '%Y-%m')),  -- 月度总预算
(1, 'food',         1000.00, DATE_FORMAT(CURDATE(), '%Y-%m')),  -- 餐饮预算
(1, 'transport',     500.00, DATE_FORMAT(CURDATE(), '%Y-%m'));  -- 交通预算

-- -----------------------------------------------------------------------------
-- 验证：统计
-- -----------------------------------------------------------------------------
SELECT '总用户数' AS metric, COUNT(*) AS value FROM users
UNION ALL SELECT '总账本数', COUNT(*) FROM ledgers
UNION ALL SELECT '总记录数', COUNT(*) FROM records
UNION ALL SELECT '总预算数', COUNT(*) FROM budgets
UNION ALL SELECT '本月支出',
  (SELECT COALESCE(SUM(amount),0) FROM records
     WHERE user_id=1 AND type='expense'
       AND DATE_FORMAT(record_date,'%Y-%m')=DATE_FORMAT(CURDATE(),'%Y-%m'))
UNION ALL SELECT '本月收入',
  (SELECT COALESCE(SUM(amount),0) FROM records
     WHERE user_id=1 AND type='income'
       AND DATE_FORMAT(record_date,'%Y-%m')=DATE_FORMAT(CURDATE(),'%Y-%m'));
