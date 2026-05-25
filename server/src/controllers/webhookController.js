const Order  = require('../models/Order')
const logger = require('../utils/logger')

module.exports = async (req, res) => {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
  const sig    = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    logger.error(`Stripe webhook signature failed: ${err.message}`)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi    = event.data.object
        const order = await Order.findOne({ stripePaymentId: pi.id })
        if (order && order.paymentStatus !== 'paid') {
          order.paymentStatus = 'paid'
          await order.save()
          logger.info(`Payment confirmed for order ${order.orderNumber}`)
        }
        break
      }
      case 'charge.refunded': {
        const charge = event.data.object
        const order  = await Order.findOne({ stripePaymentId: charge.payment_intent })
        if (order) {
          order.paymentStatus = 'refunded'
          await order.save()
          logger.info(`Refund confirmed for order ${order.orderNumber}`)
        }
        break
      }
      default:
        logger.debug(`Unhandled Stripe event: ${event.type}`)
    }
  } catch (err) {
    logger.error(`Webhook processing error: ${err.message}`)
    return res.status(500).json({ error: 'Webhook processing failed' })
  }

  res.json({ received: true })
}
