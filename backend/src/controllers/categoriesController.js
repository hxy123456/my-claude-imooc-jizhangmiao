/**
 * 分类 Controller
 * 只做请求/响应编排
 */
const categoriesService = require('../services/categoriesService')

/** GET /api/categories */
async function getTree(req, res, next) {
  try {
    const data = await categoriesService.getTreeForUser(req.user.id)
    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
}

/** POST /api/categories  body: { name, parentId, icon?, color? } */
async function create(req, res, next) {
  try {
    const data = await categoriesService.addChild(req.user.id, req.body || {})
    res.status(201).json({ ok: true, data })
  } catch (err) {
    next(err)
  }
}

/** PATCH /api/categories/:id  body: { name } */
async function update(req, res, next) {
  try {
    const id = String(req.params.id || '').trim()
    if (!id) {
      return res.status(400).json({ ok: false, code: 'BAD_REQUEST', message: '无效的分类 id' })
    }
    const data = await categoriesService.update(req.user.id, id, req.body || {})
    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
}

/** DELETE /api/categories/:id */
async function remove(req, res, next) {
  try {
    const id = String(req.params.id || '').trim()
    if (!id) {
      return res.status(400).json({ ok: false, code: 'BAD_REQUEST', message: '无效的分类 id' })
    }
    await categoriesService.remove(req.user.id, id)
    res.json({ ok: true, data: { removed: true } })
  } catch (err) {
    next(err)
  }
}

module.exports = { getTree, create, update, remove }
