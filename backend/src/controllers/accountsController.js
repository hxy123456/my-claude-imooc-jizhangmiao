/**
 * 账户 Controller
 * 只做请求/响应编排，业务逻辑放 service
 */
const accountsService = require('../services/accountsService')

/** GET /api/accounts */
async function list(req, res, next) {
  try {
    const uid = req.user.id
    const data = await accountsService.listByUser(uid)
    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
}

/** POST /api/accounts */
async function create(req, res, next) {
  try {
    const uid = req.user.id
    const data = await accountsService.create(uid, req.body || {})
    res.status(201).json({ ok: true, data })
  } catch (err) {
    next(err)
  }
}

/** PATCH /api/accounts/:id */
async function update(req, res, next) {
  try {
    const uid = req.user.id
    const id = Number.parseInt(req.params.id, 10)
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, code: 'BAD_REQUEST', message: '无效的账户 id' })
    }
    const data = await accountsService.update(uid, id, req.body || {})
    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
}

/** DELETE /api/accounts/:id */
async function remove(req, res, next) {
  try {
    const uid = req.user.id
    const id = Number.parseInt(req.params.id, 10)
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, code: 'BAD_REQUEST', message: '无效的账户 id' })
    }
    await accountsService.remove(uid, id)
    res.json({ ok: true, data: { removed: true } })
  } catch (err) {
    next(err)
  }
}

module.exports = { list, create, update, remove }
