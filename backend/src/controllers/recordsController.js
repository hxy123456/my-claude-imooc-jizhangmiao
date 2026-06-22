/**
 * 记录 Controller
 */
const recordsService = require('../services/recordsService')

/** GET /api/records */
async function list(req, res, next) {
  try {
    const data = await recordsService.list(req.user.id, req.query || {})
    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
}

/** GET /api/records/recent */
async function recent(req, res, next) {
  try {
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10))
    const data = await recordsService.list(req.user.id, { page: 1, pageSize: limit })
    res.json({ ok: true, data: data.items })
  } catch (err) {
    next(err)
  }
}

/** GET /api/records/:id */
async function detail(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, code: 'BAD_REQUEST', message: '无效的记录 id' })
    }
    const data = await recordsService.findById(req.user.id, id)
    if (!data) {
      return res.status(404).json({ ok: false, code: 'RECORD_NOT_FOUND', message: '记录不存在' })
    }
    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
}

/** POST /api/records */
async function create(req, res, next) {
  try {
    const data = await recordsService.create(req.user.id, req.body || {})
    res.status(201).json({ ok: true, data })
  } catch (err) {
    next(err)
  }
}

/** PATCH /api/records/:id */
async function update(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, code: 'BAD_REQUEST', message: '无效的记录 id' })
    }
    const data = await recordsService.update(req.user.id, id, req.body || {})
    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
}

/** DELETE /api/records/:id  软删 */
async function remove(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, code: 'BAD_REQUEST', message: '无效的记录 id' })
    }
    await recordsService.softRemove(req.user.id, id)
    res.json({ ok: true, data: { removed: true } })
  } catch (err) {
    next(err)
  }
}

module.exports = { list, recent, detail, create, update, remove }
