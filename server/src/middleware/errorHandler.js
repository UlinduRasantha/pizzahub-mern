const logger = require('../utils/logger')

const handleCastError = (err) => ({
  statusCode: 400,
  message: `Invalid ${err.path}: ${err.value}`,
})

const handleDuplicateKey = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || 'field'
  return { statusCode: 409, message: `${field} already in use.` }
}

const handleValidationError = (err) => ({
  statusCode: 400,
  message: 'Validation failed',
  errors: Object.values(err.errors).map((e) => ({
    field: e.path, message: e.message,
  })),
})

const handleJWTError      = () => ({ statusCode: 401, message: 'Invalid token. Please log in again.' })
const handleJWTExpired    = () => ({ statusCode: 401, message: 'Token expired. Please log in again.' })

// ─── Global error middleware ──────────────────────────────────────────────────
const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message = 'Internal server error', errors } = err

  // Map known error types
  if (err.name === 'CastError')          ({ statusCode, message } = handleCastError(err))
  if (err.code === 11000)                ({ statusCode, message } = handleDuplicateKey(err))
  if (err.name === 'ValidationError')    ({ statusCode, message, errors } = handleValidationError(err))
  if (err.name === 'JsonWebTokenError')  ({ statusCode, message } = handleJWTError())
  if (err.name === 'TokenExpiredError')  ({ statusCode, message } = handleJWTExpired())

  // Log server errors
  if (statusCode >= 500) logger.error(`${req.method} ${req.originalUrl} — ${err.stack || err.message}`)

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && statusCode >= 500 && { stack: err.stack }),
  })
}

module.exports = errorHandler
