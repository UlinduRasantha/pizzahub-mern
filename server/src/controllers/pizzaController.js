const Pizza  = require('../models/Pizza')
const Review = require('../models/Review')
const Order  = require('../models/Order')
const { AppError, catchAsync, sendSuccess, sendPaginated } = require('../utils/appError')

// ─── GET /pizzas ──────────────────────────────────────────────────────────────
exports.getAllPizzas = catchAsync(async (req, res) => {
  const { category, search, sort, page = 1, limit = 20 } = req.query

  const filter = {}
  if (category && category !== 'all') filter.category = category
  if (search) filter.$text = { $search: search }

  const sortMap = {
    'price-asc':  { basePrice: 1 },
    'price-desc': { basePrice: -1 },
    'rating':     { 'ratings.average': -1 },
    'name':       { name: 1 },
    'default':    { createdAt: -1 },
  }
  const sortQuery = sortMap[sort] || { createdAt: -1 }

  const skip = (page - 1) * limit
  const [pizzas, total] = await Promise.all([
    Pizza.find(filter).sort(sortQuery).skip(skip).limit(Number(limit)),
    Pizza.countDocuments(filter),
  ])
  sendPaginated(res, pizzas, total, page, limit)
})

// ─── GET /pizzas/:id ──────────────────────────────────────────────────────────
exports.getPizza = catchAsync(async (req, res, next) => {
  const pizza = await Pizza.findById(req.params.id)
  if (!pizza) return next(new AppError('Pizza not found.', 404))
  sendSuccess(res, pizza)
})

// ─── POST /pizzas ─────────────────────────────────────────────────────────────
exports.createPizza = catchAsync(async (req, res) => {
  const pizza = await Pizza.create(req.body)
  sendSuccess(res, pizza, 201)
})

// ─── PATCH /pizzas/:id ────────────────────────────────────────────────────────
exports.updatePizza = catchAsync(async (req, res, next) => {
  const pizza = await Pizza.findByIdAndUpdate(
    req.params.id, req.body, { new: true, runValidators: true }
  )
  if (!pizza) return next(new AppError('Pizza not found.', 404))
  sendSuccess(res, pizza)
})

// ─── DELETE /pizzas/:id (soft delete) ────────────────────────────────────────
exports.deletePizza = catchAsync(async (req, res, next) => {
  const pizza = await Pizza.findByIdAndUpdate(req.params.id, { isDeleted: true })
  if (!pizza) return next(new AppError('Pizza not found.', 404))
  sendSuccess(res, null, 204)
})

// ─── POST /pizzas/:id/reviews ─────────────────────────────────────────────────
// Requires the customer to have a delivered order containing this pizza
exports.addReview = catchAsync(async (req, res, next) => {
  const { rating, comment, orderId } = req.body

  const pizza = await Pizza.findById(req.params.id)
  if (!pizza) return next(new AppError('Pizza not found.', 404))

  // Verify the order exists, belongs to this customer, is delivered, and contains the pizza
  const order = await Order.findOne({
    _id:      orderId,
    customer: req.auth.userId,
    status:   'delivered',
  })
  if (!order) return next(new AppError('You can only review pizzas from a delivered order.', 403))

  const hasPizza = order.items.some(i => i.pizza?.toString() === pizza._id.toString())
  if (!hasPizza) return next(new AppError('This pizza was not part of that order.', 400))

  // Check for duplicate
  const existing = await Review.findOne({
    pizza:    pizza._id,
    customer: req.auth.userId,
    orderId,
  })
  if (existing) return next(new AppError('You have already reviewed this pizza for this order.', 409))

  const review = await Review.create({
    pizza:        pizza._id,
    customer:     req.auth.userId,
    customerName: req.body.customerName || '',   // passed from Clerk user.fullName
    orderId,
    rating,
    comment:      comment || '',
  })

  // Recalculate pizza average rating
  await pizza.updateRating(rating)

  sendSuccess(res, review, 201)
})

// ─── GET /pizzas/:id/reviews ──────────────────────────────────────────────────
exports.getReviews = catchAsync(async (req, res, next) => {
  const pizza = await Pizza.findById(req.params.id)
  if (!pizza) return next(new AppError('Pizza not found.', 404))

  const reviews = await Review.find({ pizza: pizza._id })
    .sort({ createdAt: -1 })
    .limit(50)

  sendSuccess(res, reviews)
})

// ─── GET /pizzas/:id/my-review?orderId=xxx ────────────────────────────────────
// Returns existing review for this customer+pizza+order, or null
exports.getMyReview = catchAsync(async (req, res) => {
  const { orderId } = req.query
  const review = await Review.findOne({
    pizza:    req.params.id,
    customer: req.auth.userId,
    ...(orderId ? { orderId } : {}),
  })
  sendSuccess(res, review || null)
})
