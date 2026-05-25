const User  = require('../models/UserProfile')
const Order = require('../models/Order')
const { AppError, catchAsync, sendSuccess, sendPaginated } = require('../utils/appError')

// ─── GET /users (admin) ───────────────────────────────────────────────────────
exports.getAllUsers = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, search, role } = req.query
  const filter = {}
  if (role)   filter.role = role
  if (search) filter.$or  = [
    { name:  { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
  ]

  const skip = (page - 1) * limit
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    User.countDocuments(filter),
  ])
  sendPaginated(res, users.map(u => u.toPublic()), total, page, limit)
})

// ─── GET /users/:id (admin) ───────────────────────────────────────────────────
exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id)
  if (!user) return next(new AppError('User not found.', 404))

  // Attach recent orders
  const orders = await Order.find({ customer: user._id })
    .sort({ createdAt: -1 }).limit(10)
    .select('orderNumber status total createdAt')

  sendSuccess(res, { user: user.toPublic(), recentOrders: orders })
})

// ─── PATCH /users/:id/toggle-active (admin) ────────────────────────────────
exports.toggleActive = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id)
  if (!user) return next(new AppError('User not found.', 404))
  if (user._id.toString() === req.user._id.toString()) {
    return next(new AppError('You cannot deactivate your own account.', 400))
  }

  user.isActive = !user.isActive
  await user.save({ validateBeforeSave: false })
  sendSuccess(res, { user: user.toPublic() })
})

// ─── GET /users/stats (admin) ─────────────────────────────────────────────────
exports.getStats = catchAsync(async (req, res) => {
  const now       = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart  = new Date(now - 7 * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    newToday,
    newThisWeek,
    activeOrders,
    revenueToday,
    ordersToday,
    topPizzas,
  ] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    User.countDocuments({ role: 'customer', createdAt: { $gte: todayStart } }),
    User.countDocuments({ role: 'customer', createdAt: { $gte: weekStart  } }),
    Order.countDocuments({ status: { $in: ['received','preparing','ready','out_for_delivery'] } }),
    Order.aggregate([
      { $match: { createdAt: { $gte: todayStart }, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Order.countDocuments({ createdAt: { $gte: todayStart } }),
    Order.aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.name', orders: { $sum: '$items.quantity' } } },
      { $sort:  { orders: -1 } },
      { $limit: 5 },
    ]),
  ])

  sendSuccess(res, {
    users: { total: totalUsers, newToday, newThisWeek },
    orders: {
      active:       activeOrders,
      today:        ordersToday,
      revenueToday: revenueToday[0]?.total || 0,
    },
    topPizzas,
  })
})
