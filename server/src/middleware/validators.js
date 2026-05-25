const { body, param, query, validationResult } = require('express-validator')
const { AppError } = require('../utils/appError')

// Run result check after validator chains
const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors:  errors.array().map(e => ({ field: e.path, message: e.msg })),
    })
  }
  next()
}

// ─── Auth validators ──────────────────────────────────────────────────────────
const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 60 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
]

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
]

// ─── Pizza validators ─────────────────────────────────────────────────────────
const pizzaRules = [
  body('name').trim().notEmpty().withMessage('Pizza name is required'),
  body('category').isIn(['classic', 'vegetarian', 'specialty', 'seasonal']).withMessage('Invalid category'),
  body('basePrice').isFloat({ min: 0.01 }).withMessage('Base price must be a positive number'),
]

// ─── Order validators ─────────────────────────────────────────────────────────
const orderRules = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.size').isIn(['small', 'medium', 'large', 'xl']).withMessage('Invalid size'),
  body('items.*.crust').isIn(['thin', 'classic', 'thick', 'stuffed']).withMessage('Invalid crust'),
  body('orderType').isIn(['delivery', 'pickup']).withMessage('Order type must be delivery or pickup'),
  body('deliveryAddress.street').if(body('orderType').equals('delivery')).notEmpty().withMessage('Street is required for delivery'),
]

// ─── Review validators ────────────────────────────────────────────────────────
const reviewRules = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().isLength({ max: 500 }).withMessage('Comment too long'),
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('customerName').optional().isLength({ max: 100 }).withMessage('Name too long'),
]

module.exports = {
  validate,
  registerRules, loginRules,
  pizzaRules, orderRules, reviewRules,
}
