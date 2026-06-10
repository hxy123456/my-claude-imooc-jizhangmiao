-- =============================================================================
-- 记账喵 CountCat - 初始分类数据
-- 数据源：frontend/src/utils/categories.js
-- 策略：先插入顶层分类，再插入子分类（保证外键 parent_id 有效）
-- =============================================================================

USE countcat;

-- -----------------------------------------------------------------------------
-- 第一步：关闭外键检查（按依赖顺序插入，最后开启）
-- -----------------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 第二步：插入顶层分类（parent_id = NULL）
-- -----------------------------------------------------------------------------
INSERT INTO categories (id, name, icon, color, type, sort_order, parent_id) VALUES
-- 支出大类
('food',           '餐饮',     '🍜', '#E8654A', 'expense', 0,  NULL),
('transport',      '交通',     '🚌', '#3DB88C', 'expense', 1,  NULL),
('shopping',       '购物',     '🛒', '#F4A261', 'expense', 2,  NULL),
('entertainment',  '娱乐',     '🎮', '#9B5DE5', 'expense', 3,  NULL),
('housing',        '居住',     '🏠', '#E9C46A', 'expense', 4,  NULL),
('medical',        '医疗',     '💊', '#F72585', 'expense', 5,  NULL),
('education',      '教育',     '📚', '#4361EE', 'expense', 6,  NULL),
('telecom',        '通讯',     '📱', '#00BBF9', 'expense', 7,  NULL),
('business',       '经营',     '💼', '#8B7355', 'expense', 8,  NULL),
('other_expense',  '其他',     '📋', '#AAAAAA', 'expense', 9,  NULL),
-- 收入大类
('salary',         '工资',     '💰', '#3DB88C', 'income',  0,  NULL),
('freelance',      '兼职',     '💻', '#4361EE', 'income',  1,  NULL),
('biz_income',     '经营',     '🏪', '#F4A261', 'income',  2,  NULL),
('invest',         '理财',     '📈', '#E9C46A', 'income',  3,  NULL),
('other_income',   '其他',     '📋', '#AAAAAA', 'income',  4,  NULL);

-- -----------------------------------------------------------------------------
-- 第三步：插入子分类
-- -----------------------------------------------------------------------------
INSERT INTO categories (id, name, icon, color, type, sort_order, parent_id) VALUES
-- 餐饮
('food_breakfast',  '早餐',     NULL, NULL, 'expense', 0, 'food'),
('food_lunch',      '午餐',     NULL, NULL, 'expense', 1, 'food'),
('food_dinner',     '晚餐',     NULL, NULL, 'expense', 2, 'food'),
('food_snack',      '夜宵',     NULL, NULL, 'expense', 3, 'food'),
('food_drink',      '饮品',     NULL, NULL, 'expense', 4, 'food'),
('food_treat',      '零食',     NULL, NULL, 'expense', 5, 'food'),
-- 交通
('transport_metro', '地铁',     NULL, NULL, 'expense', 0, 'transport'),
('transport_bus',   '公交',     NULL, NULL, 'expense', 1, 'transport'),
('transport_taxi',  '打车',     NULL, NULL, 'expense', 2, 'transport'),
('transport_bike',  '骑行',     NULL, NULL, 'expense', 3, 'transport'),
('transport_gas',   '加油',     NULL, NULL, 'expense', 4, 'transport'),
-- 购物
('shopping_daily',    '日用品', NULL, NULL, 'expense', 0, 'shopping'),
('shopping_clothes',  '服饰',   NULL, NULL, 'expense', 1, 'shopping'),
('shopping_digital',  '数码',   NULL, NULL, 'expense', 2, 'shopping'),
('shopping_beauty',   '美妆',   NULL, NULL, 'expense', 3, 'shopping'),
-- 娱乐
('entertainment_movie',  '电影', NULL, NULL, 'expense', 0, 'entertainment'),
('entertainment_game',   '游戏', NULL, NULL, 'expense', 1, 'entertainment'),
('entertainment_travel', '旅行', NULL, NULL, 'expense', 2, 'entertainment'),
('entertainment_sport',  '运动', NULL, NULL, 'expense', 3, 'entertainment'),
-- 居住
('housing_rent',     '房租',   NULL, NULL, 'expense', 0, 'housing'),
('housing_utility',  '水电',   NULL, NULL, 'expense', 1, 'housing'),
('housing_property', '物业',   NULL, NULL, 'expense', 2, 'housing'),
('housing_internet', '网费',   NULL, NULL, 'expense', 3, 'housing'),
-- 医疗
('medical_clinic',   '门诊',   NULL, NULL, 'expense', 0, 'medical'),
('medical_medicine', '药品',   NULL, NULL, 'expense', 1, 'medical'),
('medical_checkup',  '体检',   NULL, NULL, 'expense', 2, 'medical'),
-- 教育
('education_course', '课程',   NULL, NULL, 'expense', 0, 'education'),
('education_book',   '书籍',   NULL, NULL, 'expense', 1, 'education'),
('education_exam',   '考试',   NULL, NULL, 'expense', 2, 'education'),
-- 通讯
('telecom_phone',    '话费',   NULL, NULL, 'expense', 0, 'telecom'),
('telecom_member',   '会员',   NULL, NULL, 'expense', 1, 'telecom'),
-- 经营
('business_stock',     '进货', NULL, NULL, 'expense', 0, 'business'),
('business_equipment', '设备', NULL, NULL, 'expense', 1, 'business'),
('business_labor',     '人工', NULL, NULL, 'expense', 2, 'business'),
('business_rent',      '租金', NULL, NULL, 'expense', 3, 'business'),
-- 工资
('salary_base',        '基本工资', NULL, NULL, 'income', 0, 'salary'),
('salary_bonus',       '奖金',     NULL, NULL, 'income', 1, 'salary'),
('salary_allowance',   '补贴',     NULL, NULL, 'income', 2, 'salary'),
-- 兼职
('freelance_gig',      '自由职业', NULL, NULL, 'income', 0, 'freelance'),
('freelance_outsource','外包',     NULL, NULL, 'income', 1, 'freelance'),
-- 经营
('biz_income_revenue', '营收',     NULL, NULL, 'income', 0, 'biz_income'),
('biz_income_payment', '回款',     NULL, NULL, 'income', 1, 'biz_income'),
-- 理财
('invest_interest',    '利息',     NULL, NULL, 'income', 0, 'invest'),
('invest_dividend',    '分红',     NULL, NULL, 'income', 1, 'invest'),
-- 其他收入
('other_income_gift',     '红包', NULL, NULL, 'income', 0, 'other_income'),
('other_income_refund',   '退款', NULL, NULL, 'income', 1, 'other_income'),
('other_income_transfer', '转账', NULL, NULL, 'income', 2, 'other_income');

-- -----------------------------------------------------------------------------
-- 第四步：开启外键检查
-- -----------------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 验证：分类统计
-- -----------------------------------------------------------------------------
SELECT type, COUNT(*) AS total,
       SUM(CASE WHEN parent_id IS NULL THEN 1 ELSE 0 END) AS top_level,
       SUM(CASE WHEN parent_id IS NOT NULL THEN 1 ELSE 0 END) AS sub_level
  FROM categories
 GROUP BY type;
