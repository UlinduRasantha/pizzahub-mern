// ─── Custom error class ───────────────────────────────────────────────────────
class AppError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
    this.status     = statusCode >= 500 ? 'error' : 'fail'
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}

// ─── Wrap async route handlers — eliminates try/catch boilerplate ─────────────
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

// ─── Standard success response ────────────────────────────────────────────────
const sendSuccess = (res, data, statusCode = 200, meta = {}) => {
  res.status(statusCode).json({ success: true, data, ...meta })
}

// ─── Standard paginated response ─────────────────────────────────────────────
const sendPaginated = (res, data, total, page, limit) => {
  res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      page:  parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  })
}

module.exports = { AppError, catchAsync, sendSuccess, sendPaginated }
