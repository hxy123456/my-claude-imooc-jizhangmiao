/**
 * 用户资料路由（需鉴权）
 * POST /api/users/me/avatar   multipart/form-data: file
 * PATCH /api/users/me/profile body: { nickname? }
 */
const express = require('express')
const ctrl = require('../controllers/usersController')
const requireAuth = require('../middleware/requireAuth')
const { upload, handleUploadErrors } = require('../middleware/upload')

const router = express.Router()

router.use(requireAuth)

router.post(
  '/me/avatar',
  upload.single('file'),
  handleUploadErrors,
  ctrl.uploadAvatar
)
router.patch('/me/profile', ctrl.updateProfile)

module.exports = router
