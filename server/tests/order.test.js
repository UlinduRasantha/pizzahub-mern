const request  = require('supertest')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

jest.mock('@clerk/express', () => ({
  clerkMiddleware: () => (req, res, next) => next(),
  getAuth: (req) => ({ userId: req.headers['x-test-clerk-id'] || null }),
}))

const app = require('../src/app')

let mongod, pizzaId

const CUSTOMER_ID = 'user_customer_order_001'
const ADMIN_ID    = 'user_admin_order_001'

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())

  const UserProfile = require('../src/models/UserProfile')
  await UserProfile.create({ clerkId: CUSTOMER_ID, role: 'customer' })
  await UserProfile.create({ clerkId: ADMIN_ID,    role: 'admin'    })

  const Pizza = require('../src/models/Pizza')
  const p = await Pizza.create({
    name: 'Test Pizza', category: 'classic',
    basePrice: 12.99, description: 'Test', isAvailable: true,
  })
  pizzaId = p._id.toString()
})

afterAll(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.connection.close()
  await mongod.stop()
})

afterEach(async () => {
  const Order = require('../src/models/Order')
  await Order.deleteMany({})
})

const validOrder = () => ({
  items: [{
    pizza: pizzaId, name: 'Test Pizza',
    size: 'medium', crust: 'classic',
    quantity: 1, extraToppings: [], removedToppings: [],
  }],
  orderType: 'pickup',
  scheduledFor: 'asap',
  stripePaymentId: `sim_${Date.now()}`,
})

describe('POST /api/v1/orders', () => {
  it('customer can place an order', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('x-test-clerk-id', CUSTOMER_ID)
      .send(validOrder())
    expect(res.status).toBe(201)
    expect(res.body.data.orderNumber).toMatch(/^PH-/)
    expect(res.body.data.status).toBe('received')
    expect(res.body.data.paymentStatus).toBe('paid')
    expect(res.body.data.customer).toBe(CUSTOMER_ID)
  })

  it('rejects unauthenticated order', async () => {
    const res = await request(app).post('/api/v1/orders').send(validOrder())
    expect(res.status).toBe(401)
  })

  it('rejects order with empty items array', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('x-test-clerk-id', CUSTOMER_ID)
      .send({ ...validOrder(), items: [] })
    expect(res.status).toBe(400)
  })

  it('requires delivery address for delivery orders', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('x-test-clerk-id', CUSTOMER_ID)
      .send({ ...validOrder(), orderType: 'delivery' })
    expect(res.status).toBe(400)
  })

  it('applies FLAT5 coupon discount', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('x-test-clerk-id', CUSTOMER_ID)
      .send({ ...validOrder(), couponCode: 'FLAT5' })
    expect(res.status).toBe(201)
    expect(res.body.data.discount).toBe(5)
  })
})

describe('GET /api/v1/orders/my', () => {
  it('returns orders for the authenticated customer', async () => {
    await request(app).post('/api/v1/orders').set('x-test-clerk-id', CUSTOMER_ID).send(validOrder())
    const res = await request(app).get('/api/v1/orders/my').set('x-test-clerk-id', CUSTOMER_ID)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(1)
  })
})

describe('PATCH /api/v1/orders/:id/cancel', () => {
  it('customer can cancel within 5-minute window', async () => {
    const placed = await request(app).post('/api/v1/orders').set('x-test-clerk-id', CUSTOMER_ID).send(validOrder())
    const res = await request(app)
      .patch(`/api/v1/orders/${placed.body.data._id}/cancel`)
      .set('x-test-clerk-id', CUSTOMER_ID)
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('cancelled')
  })
})

describe('PATCH /api/v1/orders/:id/status', () => {
  it('admin can advance order status', async () => {
    const placed = await request(app).post('/api/v1/orders').set('x-test-clerk-id', CUSTOMER_ID).send(validOrder())
    const res = await request(app)
      .patch(`/api/v1/orders/${placed.body.data._id}/status`)
      .set('x-test-clerk-id', ADMIN_ID)
      .send({ status: 'preparing' })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('preparing')
  })

  it('customer cannot update order status', async () => {
    const placed = await request(app).post('/api/v1/orders').set('x-test-clerk-id', CUSTOMER_ID).send(validOrder())
    const res = await request(app)
      .patch(`/api/v1/orders/${placed.body.data._id}/status`)
      .set('x-test-clerk-id', CUSTOMER_ID)
      .send({ status: 'preparing' })
    expect(res.status).toBe(403)
  })
})

describe('GET /api/v1/orders (admin)', () => {
  it('admin can list all orders', async () => {
    await request(app).post('/api/v1/orders').set('x-test-clerk-id', CUSTOMER_ID).send(validOrder())
    const res = await request(app).get('/api/v1/orders').set('x-test-clerk-id', ADMIN_ID)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('customer cannot list all orders', async () => {
    const res = await request(app).get('/api/v1/orders').set('x-test-clerk-id', CUSTOMER_ID)
    expect(res.status).toBe(403)
  })
})
