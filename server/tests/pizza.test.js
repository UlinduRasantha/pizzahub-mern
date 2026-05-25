const request  = require('supertest')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

jest.mock('@clerk/express', () => ({
  clerkMiddleware: () => (req, res, next) => next(),
  getAuth: (req) => ({ userId: req.headers['x-test-clerk-id'] || null }),
}))

const app = require('../src/app')

let mongod

const ADMIN_ID    = 'user_admin_001'
const CUSTOMER_ID = 'user_customer_001'

const samplePizza = {
  name: 'Test Margherita', category: 'classic',
  basePrice: 12.99, description: 'A test pizza',
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())

  // Give admin role to ADMIN_ID
  const UserProfile = require('../src/models/UserProfile')
  await UserProfile.create({ clerkId: ADMIN_ID, role: 'admin' })
  await UserProfile.create({ clerkId: CUSTOMER_ID, role: 'customer' })
})

afterAll(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.connection.close()
  await mongod.stop()
})

afterEach(async () => {
  const Pizza = require('../src/models/Pizza')
  await Pizza.deleteMany({})
})

describe('GET /api/v1/pizzas', () => {
  it('returns empty list', async () => {
    const res = await request(app).get('/api/v1/pizzas')
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })

  it('returns list of pizzas', async () => {
    const Pizza = require('../src/models/Pizza')
    await Pizza.create(samplePizza)
    const res = await request(app).get('/api/v1/pizzas')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(1)
  })

  it('filters by category', async () => {
    const Pizza = require('../src/models/Pizza')
    await Pizza.create([samplePizza, { ...samplePizza, name: 'Veggie', category: 'vegetarian' }])
    const res = await request(app).get('/api/v1/pizzas?category=vegetarian')
    expect(res.body.data.length).toBe(1)
    expect(res.body.data[0].category).toBe('vegetarian')
  })
})

describe('POST /api/v1/pizzas', () => {
  it('admin can create a pizza', async () => {
    const res = await request(app)
      .post('/api/v1/pizzas')
      .set('x-test-clerk-id', ADMIN_ID)
      .send(samplePizza)
    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe(samplePizza.name)
  })

  it('customer cannot create a pizza', async () => {
    const res = await request(app)
      .post('/api/v1/pizzas')
      .set('x-test-clerk-id', CUSTOMER_ID)
      .send(samplePizza)
    expect(res.status).toBe(403)
  })

  it('unauthenticated request is rejected', async () => {
    const res = await request(app).post('/api/v1/pizzas').send(samplePizza)
    expect(res.status).toBe(401)
  })
})

describe('PATCH /api/v1/pizzas/:id', () => {
  it('admin can update a pizza', async () => {
    const Pizza = require('../src/models/Pizza')
    const pizza = await Pizza.create(samplePizza)
    const res = await request(app)
      .patch(`/api/v1/pizzas/${pizza._id}`)
      .set('x-test-clerk-id', ADMIN_ID)
      .send({ basePrice: 15.99 })
    expect(res.status).toBe(200)
    expect(res.body.data.basePrice).toBe(15.99)
  })
})
