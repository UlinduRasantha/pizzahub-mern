// Usage: node promote-admin.js YOUR_CLERK_USER_ID
require('dotenv').config()
const mongoose    = require('mongoose')
const UserProfile = require('./src/models/UserProfile')

const clerkId = process.argv[2]
if (!clerkId) {
  console.error('Usage: node promote-admin.js YOUR_CLERK_USER_ID')
  console.error('Find your Clerk user ID in: Clerk Dashboard → Users → click your account')
  process.exit(1)
}

async function promote() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pizzahub')

  const profile = await UserProfile.findOneAndUpdate(
    { clerkId },
    { clerkId, role: 'admin' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  console.log(`✅  ${clerkId} is now an admin (profile _id: ${profile._id})`)
  await mongoose.connection.close()
}

promote().catch(err => {
  console.error('❌ Failed:', err.message)
  process.exit(1)
})
