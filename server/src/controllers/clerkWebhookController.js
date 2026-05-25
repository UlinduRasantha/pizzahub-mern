const { Webhook }   = require('svix')
const UserProfile   = require('../models/UserProfile')
const logger        = require('../utils/logger')

module.exports = async (req, res) => {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    logger.error('CLERK_WEBHOOK_SECRET is not set')
    return res.status(500).json({ error: 'Webhook secret not configured' })
  }

  // Verify the Svix signature
  const wh = new Webhook(secret)
  let event
  try {
    event = wh.verify(req.body, {
      'svix-id':        req.headers['svix-id'],
      'svix-timestamp': req.headers['svix-timestamp'],
      'svix-signature': req.headers['svix-signature'],
    })
  } catch (err) {
    logger.error(`Clerk webhook verification failed: ${err.message}`)
    return res.status(400).json({ error: 'Webhook verification failed' })
  }

  try {
    switch (event.type) {
      case 'user.created':
        await UserProfile.findOneAndUpdate(
          { clerkId: event.data.id },
          { clerkId: event.data.id, isActive: true },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
        logger.info(`UserProfile created for Clerk user ${event.data.id}`)
        break

      case 'user.deleted':
        await UserProfile.findOneAndUpdate(
          { clerkId: event.data.id },
          { isActive: false }
        )
        logger.info(`UserProfile deactivated for Clerk user ${event.data.id}`)
        break

      default:
        logger.debug(`Unhandled Clerk webhook event: ${event.type}`)
    }
  } catch (err) {
    logger.error(`Clerk webhook processing error: ${err.message}`)
    return res.status(500).json({ error: 'Webhook processing failed' })
  }

  res.json({ received: true })
}
