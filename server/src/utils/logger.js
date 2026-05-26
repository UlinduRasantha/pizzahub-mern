const { createLogger, format, transports } = require('winston')

const isProduction = process.env.NODE_ENV === 'production'

const logger = createLogger({
  level: isProduction ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack }) =>
      stack
        ? `${timestamp} [${level.toUpperCase()}] ${message}\n${stack}`
        : `${timestamp} [${level.toUpperCase()}] ${message}`
    )
  ),
  // Console only — no file transports
  // Vercel has a read-only filesystem so writing log files is not possible
  // All logs are visible in the Vercel dashboard under Functions → Runtime Logs
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  ],
})

module.exports = logger