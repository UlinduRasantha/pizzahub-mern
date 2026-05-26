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
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return cb(null, true)
    if (allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
  methods:     ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.options('*', cors())

// ─── Stripe webhook — must come BEFORE express.json() ────────────────────────
app.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  require('./controllers/webhookController')
)
app.post(
  '/webhooks/clerk',
  express.raw({ type: 'application/json' }),
  require('./controllers/clerkWebhookController')
)

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

// ─── Clerk middleware ─────────────────────────────────────────────────────────
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
  env:       process.env.NODE_ENV,
}))

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/pizzas',  require('./routes/pizzaRoutes'))
app.use('/api/v1/orders',  require('./routes/orderRoutes'))
app.use('/api/v1/users',   require('./routes/userRoutes'))
app.use('/api/v1/profile', require('./routes/profileRoutes'))

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.all('*', (req, res, next) =>
  next(new AppError(`Route ${req.originalUrl} not found.`, 404))
)

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler)

module.exports = app
