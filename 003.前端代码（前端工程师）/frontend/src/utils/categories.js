export const EXPENSE_CATEGORIES = [
  {
    id: 'food', name: '餐饮', icon: '🍜', color: '#E8654A',
    children: [
      { id: 'food_breakfast', name: '早餐' },
      { id: 'food_lunch', name: '午餐' },
      { id: 'food_dinner', name: '晚餐' },
      { id: 'food_snack', name: '夜宵' },
      { id: 'food_drink', name: '饮品' },
      { id: 'food_treat', name: '零食' },
    ]
  },
  {
    id: 'transport', name: '交通', icon: '🚌', color: '#3DB88C',
    children: [
      { id: 'transport_metro', name: '地铁' },
      { id: 'transport_bus', name: '公交' },
      { id: 'transport_taxi', name: '打车' },
      { id: 'transport_bike', name: '骑行' },
      { id: 'transport_gas', name: '加油' },
    ]
  },
  {
    id: 'shopping', name: '购物', icon: '🛒', color: '#F4A261',
    children: [
      { id: 'shopping_daily', name: '日用品' },
      { id: 'shopping_clothes', name: '服饰' },
      { id: 'shopping_digital', name: '数码' },
      { id: 'shopping_beauty', name: '美妆' },
    ]
  },
  {
    id: 'entertainment', name: '娱乐', icon: '🎮', color: '#9B5DE5',
    children: [
      { id: 'entertainment_movie', name: '电影' },
      { id: 'entertainment_game', name: '游戏' },
      { id: 'entertainment_travel', name: '旅行' },
      { id: 'entertainment_sport', name: '运动' },
    ]
  },
  {
    id: 'housing', name: '居住', icon: '🏠', color: '#E9C46A',
    children: [
      { id: 'housing_rent', name: '房租' },
      { id: 'housing_utility', name: '水电' },
      { id: 'housing_property', name: '物业' },
      { id: 'housing_internet', name: '网费' },
    ]
  },
  {
    id: 'medical', name: '医疗', icon: '💊', color: '#F72585',
    children: [
      { id: 'medical_clinic', name: '门诊' },
      { id: 'medical_medicine', name: '药品' },
      { id: 'medical_checkup', name: '体检' },
    ]
  },
  {
    id: 'education', name: '教育', icon: '📚', color: '#4361EE',
    children: [
      { id: 'education_course', name: '课程' },
      { id: 'education_book', name: '书籍' },
      { id: 'education_exam', name: '考试' },
    ]
  },
  {
    id: 'telecom', name: '通讯', icon: '📱', color: '#00BBF9',
    children: [
      { id: 'telecom_phone', name: '话费' },
      { id: 'telecom_member', name: '会员' },
    ]
  },
  {
    id: 'business', name: '经营', icon: '💼', color: '#8B7355',
    children: [
      { id: 'business_stock', name: '进货' },
      { id: 'business_equipment', name: '设备' },
      { id: 'business_labor', name: '人工' },
      { id: 'business_rent', name: '租金' },
    ]
  },
  {
    id: 'other_expense', name: '其他', icon: '📋', color: '#AAAAAA',
    children: []
  },
]

export const INCOME_CATEGORIES = [
  {
    id: 'salary', name: '工资', icon: '💰', color: '#3DB88C',
    children: [
      { id: 'salary_base', name: '基本工资' },
      { id: 'salary_bonus', name: '奖金' },
      { id: 'salary_allowance', name: '补贴' },
    ]
  },
  {
    id: 'freelance', name: '兼职', icon: '💻', color: '#4361EE',
    children: [
      { id: 'freelance_gig', name: '自由职业' },
      { id: 'freelance_outsource', name: '外包' },
    ]
  },
  {
    id: 'biz_income', name: '经营', icon: '🏪', color: '#F4A261',
    children: [
      { id: 'biz_income_revenue', name: '营收' },
      { id: 'biz_income_payment', name: '回款' },
    ]
  },
  {
    id: 'invest', name: '理财', icon: '📈', color: '#E9C46A',
    children: [
      { id: 'invest_interest', name: '利息' },
      { id: 'invest_dividend', name: '分红' },
    ]
  },
  {
    id: 'other_income', name: '其他', icon: '📋', color: '#AAAAAA',
    children: [
      { id: 'other_income_gift', name: '红包' },
      { id: 'other_income_refund', name: '退款' },
      { id: 'other_income_transfer', name: '转账' },
    ]
  },
]

export function getCategoryById(id, type = 'expense') {
  const cats = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  for (const cat of cats) {
    if (cat.id === id) return cat
    for (const child of cat.children) {
      if (child.id === id) return { ...cat, selectedChild: child }
    }
  }
  return null
}

export function getCategoryName(record) {
  const cat = getCategoryById(record.categoryId, record.type)
  if (!cat) return '未知'
  const child = cat.children.find(c => c.id === record.subCategoryId)
  return child ? `${cat.name}·${child.name}` : cat.name
}

export function getCategoryIcon(record) {
  const cat = getCategoryById(record.categoryId, record.type)
  return cat ? cat.icon : '📋'
}
