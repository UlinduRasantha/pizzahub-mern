// auth.test.js — With Clerk, we test profile management instead of register/login
const request  = require('supertest')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

// Mock @clerk/express before requiring app
jest.mock('@clerk/express', () => ({
  clerkMiddleware: () => (req, res, next) => next(),
  getAuth: (req) => ({ userId: req.headers['x-test-clerk-id'] || null }),
}))

const app = require('../src/app')

let mongod

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
})

afterAll(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.connection.close()
  await mongod.stop()
})

afterEach(async () => {
  const collections = mongoose.connection.collections
  for (const key in collections) await collections[key].deleteMany({})
})

describe('GET /api/v1/profile/me', () => {
  it('returns 401 when no Clerk session', async () => {
    const res = await request(app).get('/api/v1/profile/me')
    expect(res.status).toBe(401)
  })

  it('creates and returns profile for first-time Clerk user', async () => {
    const res = await request(app)
      .get('/api/v1/profile/me')
      .set('x-test-clerk-id', 'user_test_123')
    expect(res.status).toBe(200)
    expect(res.body.data.profile.clerkId).toBe('user_test_123')
    expect(res.body.data.profile.role).toBe('customer')
  })

  it('returns same profile on subsequent requests', async () => {
    await request(app).get('/api/v1/profile/me').set('x-test-clerk-id', 'user_test_456')
    const res = await request(app).get('/api/v1/profile/me').set('x-test-clerk-id', 'user_test_456')
    expect(res.status).toBe(200)
    expect(res.body.data.profile.clerkId).toBe('user_test_456')
  })
})

describe('PATCH /api/v1/profile/me', () => {
  it('updates phone number', async () => {
    const res = await request(app)
      .patch('/api/v1/profile/me')
      .set('x-test-clerk-id', 'user_patch_123')
      .send({ phone: '+1-555-0123' })
    expect(res.status).toBe(200)
    expect(res.body.data.profile.phone).toBe('+1-555-0123')
  })
})

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})
