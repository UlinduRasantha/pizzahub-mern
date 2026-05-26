// Vercel serverless entry point
// Vercel calls this file for every request — it must export the Express app
require('dotenv').config()
const app         = require('../src/app')
const { connectDB } = require('../src/config/database')

// Connect to MongoDB once — Vercel reuses warm lambda instances
// so this only runs on cold starts
let dbConnected = false
const ensureDB = async () => {
  if (!dbConnected) {
    await connectDB()
    dbConnected = true
  }
}

// Wrap app so DB is connected before handling any request
module.exports = async (req, res) => {
  await ensureDB()
  return app(req, res)
}
