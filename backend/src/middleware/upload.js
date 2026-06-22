/**
 * 文件上传中间件（multer）
 *
 * 设计：
 * - 内存模式（multer.memoryStorage）：拿到 buffer 后自行写到 public/uploads/...
 *   优势：跨平台（Windows / Linux）路径一致；便于文件名校验
 * - 限制：单文件、2 MB（与 constants.UPLOAD_IMAGE_MAX_BYTES 一致）
 * - 限制 MIME：仅 png/jpg/webp（与 constants.UPLOAD_IMAGE_MIME 一致）
 * - 错误 → AppError 抛出，由 errorHandler 统一响应
 */
const multer = require('multer')
const AppError = require('../utils/AppError')
const { ErrorCode, UPLOAD_IMAGE_MAX_BYTES, UPLOAD_IMAGE_MIME } = require('../config/constants')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: UPLOAD_IMAGE_MAX_BYTES,
    files: 1,
  },
  fileFilter(_req, file, cb) {
    if (!UPLOAD_IMAGE_MIME.includes(file.mimetype)) {
      return cb(new AppError(ErrorCode.UPLOAD_BAD_TYPE))
    }
    cb(null, true)
  },
})

/**
 * 把 multer 的 LIMIT_FILE_SIZE / LIMIT_UNEXPECTED_FILE 等错误翻译为 AppError
 */
function handleUploadErrors(err, _req, _res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError(ErrorCode.UPLOAD_TOO_LARGE))
    }
    return next(new AppError(ErrorCode.UPLOAD_FAILED, err.message))
  }
  return next(err)
}

module.exports = { upload, handleUploadErrors }
