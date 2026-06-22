/**
 * Excel 导出工具
 *
 * - 入参：Buffer（exceljs workbook 的 xlsx 字节流）
 * - 出参：直接 res.send(buffer) 即可
 *
 * 业务封装：buildMonthWorkbook(userId, month)
 *   - sheet 1: 概览（收入/支出/结余/笔数）
 *   - sheet 2: 分类支出（饼图同款）
 *   - sheet 3: 分类收入（柱状同款）
 *   - sheet 4: 日支出趋势
 *   - sheet 5: 明细（每条记录一行）
 */
const ExcelJS = require('exceljs')
const statsService = require('../services/statsService')
const categoriesService = require('./categoriesService')
const accountsService = require('./accountsService')

/* -------------------- 单元格样式辅助 -------------------- */

const HEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE8654A' }, // 珊瑚色
}
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' } }

function _styleHeader(row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE0D6CC' } },
      bottom: { style: 'thin', color: { argb: 'FFE0D6CC' } },
      left: { style: 'thin', color: { argb: 'FFE0D6CC' } },
      right: { style: 'thin', color: { argb: 'FFE0D6CC' } },
    }
  })
}

function _addHeaderRow(sheet, headers) {
  const row = sheet.addRow(headers)
  _styleHeader(row)
  headers.forEach((_, i) => {
    sheet.getColumn(i + 1).width = Math.max(12, headers[i].length * 2 + 4)
  })
}

/* -------------------- 分类名 / 账户名 解析 -------------------- */

function _buildNameMaps(catTree, accounts) {
  // catMap: id -> name（父类或子类）
  const catMap = {}
  for (const type of ['expense', 'income']) {
    for (const p of catTree[type] || []) {
      catMap[p.id] = p.name
      for (const c of p.children || []) catMap[c.id] = c.name
    }
  }
  const accMap = {}
  for (const a of accounts) accMap[a.id] = a.name
  return { catMap, accMap }
}

/* -------------------- 构建整本 workbook -------------------- */

async function buildMonthWorkbook(userId, month) {
  const [overview, catExp, catInc, trend, detail, catTree, accounts] = await Promise.all([
    statsService.overview(userId, month),
    statsService.categoryExpense(userId, month, 50),
    statsService.categoryIncome(userId, month),
    statsService.dailyTrend(userId, month),
    statsService.detailRecords(userId, { month }),
    categoriesService.getTreeForUser(userId),
    accountsService.listByUser(userId),
  ])
  const { catMap, accMap } = _buildNameMaps(catTree, accounts)

  const wb = new ExcelJS.Workbook()
  wb.creator = 'CountCat'
  wb.lastModifiedBy = 'CountCat'
  wb.created = new Date()
  wb.modified = new Date()
  wb.properties.date1904 = false

  /* ---- Sheet 1: 概览 ---- */
  const s1 = wb.addWorksheet('概览', { views: [{ showGridLines: false }] })
  s1.mergeCells('A1:D1')
  s1.getCell('A1').value = `${overview.monthLabel} · 财务概览`
  s1.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FF5C4A3A' } }
  s1.getCell('A1').alignment = { horizontal: 'center' }
  s1.addRow([])
  _addHeaderRow(s1, ['指标', '金额', '笔数', '备注'])
  s1.addRow(['收入', Number(overview.totalIncome.toFixed(2)), '', '本年收入合计'])
  s1.addRow(['支出', Number(overview.totalExpense.toFixed(2)), '', '本年支出合计'])
  s1.addRow(['结余', Number(overview.balance.toFixed(2)), '', '收入 - 支出'])
  s1.addRow(['总笔数', '', overview.count, '本年所有记录条数'])

  /* ---- Sheet 2: 分类支出 ---- */
  const s2 = wb.addWorksheet('分类支出')
  _addHeaderRow(s2, ['排名', '分类ID', '分类名称', '金额(¥)', '占比(%)'])
  catExp.items.forEach((it, idx) => {
    s2.addRow([idx + 1, it.categoryId, catMap[it.categoryId] || it.categoryId, Number(it.amount.toFixed(2)), it.percent])
  })
  // 合计行
  s2.addRow(['', '合计', '', Number(catExp.total.toFixed(2)), 100]).font = { bold: true }

  /* ---- Sheet 3: 分类收入 ---- */
  const s3 = wb.addWorksheet('分类收入')
  _addHeaderRow(s3, ['排名', '分类ID', '分类名称', '金额(¥)', '占比(%)'])
  catInc.items.forEach((it, idx) => {
    s3.addRow([idx + 1, it.categoryId, catMap[it.categoryId] || it.categoryId, Number(it.amount.toFixed(2)), it.percent])
  })
  s3.addRow(['', '合计', '', Number(catInc.total.toFixed(2)), 100]).font = { bold: true }

  /* ---- Sheet 4: 日支出趋势 ---- */
  const s4 = wb.addWorksheet('日支出趋势')
  _addHeaderRow(s4, ['日期', '日', '金额(¥)'])
  trend.series.forEach(p => s4.addRow([p.date, p.day, Number(p.amount.toFixed(2))]))

  /* ---- Sheet 5: 明细 ---- */
  const s5 = wb.addWorksheet('明细')
  _addHeaderRow(s5, ['日期', '类型', '大类', '子类', '账户', '金额(¥)', '备注'])
  detail.forEach(r => {
    s5.addRow([
      r.recordDate,
      r.type === 'expense' ? '支出' : '收入',
      catMap[r.categoryId] || r.categoryId,
      r.subCategoryId ? (catMap[r.subCategoryId] || r.subCategoryId) : '',
      r.accountId ? (accMap[r.accountId] || `#${r.accountId}`) : '',
      Number(r.amount.toFixed(2)),
      r.note || '',
    ])
  })
  s5.getColumn(7).width = 40

  return wb
}

module.exports = { buildMonthWorkbook }
