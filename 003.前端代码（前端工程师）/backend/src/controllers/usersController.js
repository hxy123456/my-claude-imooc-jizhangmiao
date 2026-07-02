/**
 * 用户资料 Controller
 */
const userService = require('../services/userService')

/** POST /api/users/me/avatar  multipart/form-data, field: file */
async function uploadAvatar(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      const AppError = require('../utils/AppError')
      const { ErrorCode } = require('../config/constants')
      throw new AppError(ErrorCode.UPLOAD_FAILED, '未收到文件')
    }
    const url = await userService.saveAvatar(
      req.user.id,
      req.file.buffer,
      req.file.mimetype
    )
    res.json({ ok: true, data: { avatar: url, user: await userService.findById(req.user.id) } })
  } catch (err) {
    next(err)
  }
}

/** PATCH /api/users/me/profile  body: { nickname?, avatar? } */
async function updateProfile(req, res, next) {
  try {
    const data = await userService.updateProfile(req.user.id, req.body || {})
    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
}

module.exports = { uploadAvatar, updateProfile }
