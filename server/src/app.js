const express        = require('express')
const helmet         = require('helmet')
const cors           = require('cors')
const morgan         = require('morgan')
const cookieParser   = require('cookie-parser')
const compression    = require('compression')
const mongoSanitize  = require('express-mongo-sanitize')
const rateLimit      = require('express-rate-limit')
const { clerkMiddleware } = require('@clerk/express')
const errorHandler   = require('./middleware/errorHandler')
const { AppError }   = require('./utils/appError')
const logger         = require('./utils/logger')

const app = express()

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet())

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods:     ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.options('*', cors())

// ─── Request parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))
app.use(cookieParser())

// ─── Sanitization ─────────────────────────────────────────────────────────────
app.use(mongoSanitize())

// ─── Compression ──────────────────────────────────────────────────────────────
app.use(compression())

// ─── HTTP logging ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }))
}

// ─── Clerk middleware (validates session tokens on every request) ──────────────
app.use(clerkMiddleware())

// ─── Global rate limit ────────────────────────────────────────────────────────
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' },
}))

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status:    'ok',
  uptime:    process.uptime(),
  timestamp: new Date().toISOString(),
}))

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/pizzas',  require('./routes/pizzaRoutes'))
app.use('/api/v1/orders',  require('./routes/orderRoutes'))
app.use('/api/v1/users',   require('./routes/userRoutes'))
app.use('/api/v1/profile', require('./routes/profileRoutes'))

// ─── Webhooks (raw body required before JSON parser above) ───────────────────
// Stripe webhook
app.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  require('./controllers/webhookController')
)
// Clerk webhook (user.created / user.deleted)
app.post(
  '/webhooks/clerk',
  express.raw({ type: 'application/json' }),
  require('./controllers/clerkWebhookController')
)

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.all('*', (req, res, next) =>
  next(new AppError(`Route ${req.originalUrl} not found.`, 404))
)

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler)

module.exports = app
