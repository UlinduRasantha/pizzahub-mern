const Order  = require('../models/Order')
const Pizza  = require('../models/Pizza')
const { AppError, catchAsync, sendSuccess, sendPaginated } = require('../utils/appError')
const { sendPaymentReceipt, sendOrderStatusUpdate, sendOrderReceived } = require('../utils/email')
const logger = require('../utils/logger')

const DELIVERY_FEE = 2.99
const TAX_RATE     = 0.08

const COUPONS = {
  WELCOME20: { type: 'percent', value: 20 },
  FLAT5:     { type: 'flat',    value: 5  },
}

const applyDiscount = (subtotal, couponCode) => {
  if (!couponCode) return 0
  const coupon = COUPONS[couponCode.toUpperCase()]
  if (!coupon) return 0
  if (coupon.type === 'percent') return parseFloat((subtotal * coupon.value / 100).toFixed(2))
  if (coupon.type === 'flat')    return Math.min(coupon.value, subtotal)
  return 0
}

// ─── Helper: get Clerk user email + name ─────────────────────────────────────
// Clerk email is NOT stored in our MongoDB — we fetch it from the Clerk API
const getClerkUserInfo = async (clerkUserId) => {
  try {
    const { createClerkClient } = require('@clerk/express')
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    const user  = await clerk.users.getUser(clerkUserId)
    const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress
      || user.emailAddresses[0]?.emailAddress
    const name  = [user.firstName, user.lastName].filter(Boolean).join(' ') || email
    return { email, name }
  } catch (err) {
    logger.warn(`Could not fetch Clerk user info for ${clerkUserId}: ${err.message}`)
    return { email: null, name: '' }
  }
}

// ─── POST /orders/create-payment-intent ──────────────────────────────────────
exports.createPaymentIntent = catchAsync(async (req, res, next) => {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
  const { amount } = req.body

  if (!amount || amount < 50) return next(new AppError('Invalid payment amount.', 400))

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    metadata: { customerId: req.auth.userId },
  })

  sendSuccess(res, { clientSecret: paymentIntent.client_secret })
})

// ─── POST /orders ─────────────────────────────────────────────────────────────
exports.createOrder = catchAsync(async (req, res, next) => {
  const { items, orderType, deliveryAddress, scheduledFor, couponCode, stripePaymentId } = req.body

  if (!items?.length) return next(new AppError('No items in order.', 400))
  if (orderType === 'delivery' && !deliveryAddress?.street) {
    return next(new AppError('Delivery address is required.', 400))
  }

  const pricedItems = await Promise.all(items.map(async (item) => {
    const pizza = await Pizza.findById(item.pizza)
    if (!pizza || !pizza.isAvailable) {
      throw new AppError(`Pizza "${item.name || item.pizza}" is not available.`, 400)
    }
    const sizeAdder  = pizza.sizes.find(s => s.label === item.size)?.priceAdder  || 0
    const crustAdder = pizza.crusts.find(c => c.label === item.crust)?.priceAdder || 0
    const extrasSum  = (item.extraToppings || []).reduce((sum, t) => {
      const extra = pizza.extraToppings?.find(e => e.name === t.name)
      return sum + (extra?.price || 0)
    }, 0)
    const unitPrice = pizza.basePrice + sizeAdder + crustAdder + extrasSum
    return {
      pizza:           pizza._id,
      name:            pizza.name,
      image:           pizza.images?.[0],
      size:            item.size,
      crust:           item.crust,
      extraToppings:   item.extraToppings || [],
      removedToppings: item.removedToppings || [],
      specialNote:     item.specialNote || '',
      quantity:        item.quantity,
      unitPrice:       parseFloat(unitPrice.toFixed(2)),
      subtotal:        parseFloat((unitPrice * item.quantity).toFixed(2)),
    }
  }))

  const subtotal = parseFloat(pricedItems.reduce((s, i) => s + i.subtotal, 0).toFixed(2))
  const discount = applyDiscount(subtotal, couponCode)
  const fee      = orderType === 'delivery' ? DELIVERY_FEE : 0
  const taxBase  = subtotal - discount
  const tax      = parseFloat((taxBase * TAX_RATE).toFixed(2))
  const total    = parseFloat((taxBase + tax + fee).toFixed(2))

  const order = await Order.create({
    customer:        req.auth.userId,
    items:           pricedItems,
    subtotal, discount, deliveryFee: fee, tax, total,
    couponCode:      couponCode?.toUpperCase(),
    orderType,
    deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
    scheduledFor:    scheduledFor || 'asap',
    paymentStatus:   'paid',
    stripePaymentId,
  })

  // ── Send payment receipt email (non-blocking) ──
  getClerkUserInfo(req.auth.userId).then(({ email, name }) => {
    if (email) {
      sendPaymentReceipt(order, email, name).catch(err =>
        logger.error(`Receipt email failed for ${order.orderNumber}: ${err.message}`)
      )
    }
  })

  // Socket.IO notifications disabled on Vercel serverless
  // Use polling (React Query refetchInterval) on admin dashboard instead

  sendSuccess(res, order, 201)
})

// ─── GET /orders/my ───────────────────────────────────────────────────────────
exports.getMyOrders = catchAsync(async (req, res) => {
  const orders = await Order.find({ customer: req.auth.userId })
    .sort({ createdAt: -1 })
    .limit(50)
  sendSuccess(res, orders)
})

// ─── GET /orders/:id ──────────────────────────────────────────────────────────
exports.getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
  if (!order) return next(new AppError('Order not found.', 404))

  const isOwner = order.customer === req.auth.userId
  const isAdmin = ['admin', 'delivery'].includes(req.user.role)
  if (!isOwner && !isAdmin) return next(new AppError('Access denied.', 403))

  sendSuccess(res, order)
})

// ─── PATCH /orders/:id/cancel ─────────────────────────────────────────────────
exports.cancelOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
  if (!order) return next(new AppError('Order not found.', 404))

  if (order.customer !== req.auth.userId) return next(new AppError('Access denied.', 403))
  if (['cancelled', 'delivered'].includes(order.status)) {
    return next(new AppError(`Order cannot be cancelled (status: ${order.status}).`, 400))
  }
  if (order.cancelDeadline < Date.now()) {
    return next(new AppError('Cancellation window (5 minutes) has passed.', 400))
  }

  order.status = 'cancelled'
  order.statusHistory.push({ status: 'cancelled', updatedAt: new Date(), updatedBy: req.user._id })
  await order.save()

  // Send cancellation status email
  getClerkUserInfo(req.auth.userId).then(({ email, name }) => {
    if (email) {
      sendOrderStatusUpdate(order, email, name, 'cancelled').catch(err =>
        logger.error(`Cancel email failed for ${order.orderNumber}: ${err.message}`)
      )
    }
  })

  sendSuccess(res, order)
})

// ─── GET /orders (admin) ──────────────────────────────────────────────────────
exports.getAllOrders = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 20, from, to } = req.query
  const filter = {}
  if (status) filter.status = status
  if (from || to) {
    filter.createdAt = {}
    if (from) filter.createdAt.$gte = new Date(from)
    if (to)   filter.createdAt.$lte = new Date(to)
  }

  const skip = (page - 1) * limit
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Order.countDocuments(filter),
  ])
  sendPaginated(res, orders, total, page, limit)
})

// ─── PATCH /orders/:id/status (admin) ────────────────────────────────────────
exports.updateStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body
  const VALID = ['received', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled']
  if (!VALID.includes(status)) return next(new AppError('Invalid status.', 400))

  const order = await Order.findById(req.params.id)
  if (!order) return next(new AppError('Order not found.', 404))

  order.status = status
  order.statusHistory.push({ status, updatedAt: new Date(), updatedBy: req.user._id })
  await order.save()

  // Socket.IO notifications disabled on Vercel serverless
  // Email notifications (sendOrderStatusUpdate) are sent below instead

  // ── Send status update email to customer (non-blocking) ──
  getClerkUserInfo(order.customer).then(({ email, name }) => {
    if (email) {
      sendOrderStatusUpdate(order, email, name, status).catch(err =>
        logger.error(`Status email failed for ${order.orderNumber}: ${err.message}`)
      )
    }
  })

  sendSuccess(res, order)
})

// ─── POST /orders/:id/refund (admin) ─────────────────────────────────────────
exports.refundOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
  if (!order) return next(new AppError('Order not found.', 404))
  if (order.paymentStatus === 'refunded') return next(new AppError('Already refunded.', 400))
  if (!order.stripePaymentId) return next(new AppError('No Stripe payment ID on record.', 400))

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
  await stripe.refunds.create({ payment_intent: order.stripePaymentId })

  order.paymentStatus = 'refunded'
  order.status        = 'cancelled'
  order.statusHistory.push({ status: 'cancelled', updatedAt: new Date(), updatedBy: req.user._id })
  await order.save()

  sendSuccess(res, order)
})

// ─── PATCH /orders/:id/confirm-received ──────────────────────────────────────
exports.confirmReceived = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
  if (!order) return next(new AppError('Order not found.', 404))
  if (order.customer !== req.auth.userId) return next(new AppError('Access denied.', 403))
  if (order.status !== 'delivered') {
    return next(new AppError('Only delivered orders can be confirmed as received.', 400))
  }
  if (order.confirmedReceived) {
    return next(new AppError('Order already confirmed as received.', 400))
  }

  order.confirmedReceived    = true
  order.confirmedReceivedAt  = new Date()
  await order.save()

  // Send "received + review prompt" email
  getClerkUserInfo(req.auth.userId).then(({ email, name }) => {
    if (email) {
      sendOrderReceived(order, email, name).catch(err =>
        logger.error(`Received email failed for ${order.orderNumber}: ${err.message}`)
      )
    }
  })

  sendSuccess(res, order)
})
