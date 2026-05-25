require('dotenv').config()
const http   = require('http')
const { Server } = require('socket.io')
const app    = require('./app')
const { connectDB } = require('./config/database')
const logger = require('./utils/logger')

const PORT = process.env.PORT || 5000

// ─── HTTP server ──────────────────────────────────────────────────────────────
const server = http.createServer(app)

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin:      process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
})

// Make io available in controllers via app.get('io')
app.set('io', io)

io.on('connection', (socket) => {
  logger.debug(`Socket connected: ${socket.id}`)

  // Customer joins their order room to receive live updates
  socket.on('joinOrder', (orderId) => {
    socket.join(`order:${orderId}`)
    logger.debug(`Socket ${socket.id} joined order:${orderId}`)
  })

  // Admin joins admin room
  socket.on('joinAdmin', () => {
    socket.join('admin')
    logger.debug(`Socket ${socket.id} joined admin room`)
  })

  socket.on('disconnect', () => {
    logger.debug(`Socket disconnected: ${socket.id}`)
  })
})

// ─── Seed demo data in development ───────────────────────────────────────────
const seedDemo = async () => {
  if (process.env.NODE_ENV !== 'development') return
  const Pizza = require('./models/Pizza')
  const count = await Pizza.countDocuments()
  if (count > 0) return

  const demo = [
    { name: 'Margherita Classica', category: 'classic',    basePrice: 12.99, description: 'San Marzano tomatoes, fresh mozzarella, hand-torn basil, extra virgin olive oil.', isAvailable: true, ratings: { average: 4.8, count: 312 }, images: ['https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80'] },
    { name: 'Diavola Picante',     category: 'specialty',  basePrice: 15.99, description: 'Spicy salami, nduja, roasted peppers, smoked mozzarella, chilli drizzle.', isAvailable: true, ratings: { average: 4.9, count: 187 }, images: ['https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&q=80'] },
    { name: 'Garden Verde',        category: 'vegetarian', basePrice: 13.99, description: 'Grilled courgette, artichoke hearts, sun-dried tomatoes, rocket, burrata.', isAvailable: true, ratings: { average: 4.7, count: 224 }, images: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80'] },
    { name: 'Truffle Funghi',      category: 'specialty',  basePrice: 18.99, description: 'Wild porcini, shiitake, truffle oil, taleggio, fresh thyme, toasted pine nuts.', isAvailable: true, ratings: { average: 4.9, count: 156 }, images: ['https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80'] },
    { name: 'Pepperoni Supreme',   category: 'classic',    basePrice: 14.99, description: 'Double pepperoni, mozzarella, fresh oregano, tangy tomato sauce.', isAvailable: true, ratings: { average: 4.8, count: 401 }, images: ['https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&q=80'] },
    { name: 'Autumn Harvest',      category: 'seasonal',   basePrice: 17.49, description: 'Butternut squash, sage, smoked pancetta, ricotta, toasted pumpkin seeds.', isAvailable: true, ratings: { average: 4.8, count: 89  }, images: ['https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80'] },
  ]
  await Pizza.insertMany(demo)
  logger.info(`Seeded ${demo.length} demo pizzas`)
}

// ─── Start ────────────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB()
  await seedDemo()
  server.listen(PORT, () => {
    logger.info(`🍕 PizzaHub API running on port ${PORT} [${process.env.NODE_ENV}]`)
    logger.info(`Health: http://localhost:${PORT}/health`)
  })
}

start()

// ─── Graceful shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`)
  server.close(async () => {
    const { disconnectDB } = require('./config/database')
    await disconnectDB()
    logger.info('Server closed')
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10000) // force exit after 10s
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT',  () => shutdown('SIGINT'))
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled rejection: ${err.message}`)
  shutdown('unhandledRejection')
})
