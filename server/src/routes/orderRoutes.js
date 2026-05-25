const express = require('express')
const router  = express.Router()
const order   = require('../controllers/orderController')
const { protect, restrictTo } = require('../middleware/clerkAuth')
const { validate, orderRules } = require('../middleware/validators')

// Must come BEFORE /:id routes
router.post('/create-payment-intent', protect, order.createPaymentIntent)

// Customer routes
router.patch('/:id/confirm-received', protect, order.confirmReceived)
router.post('/',             protect,                              orderRules, validate, order.createOrder)
router.get ('/my',           protect,                                                    order.getMyOrders)
router.get ('/:id',          protect,                                                    order.getOrder)
router.patch('/:id/cancel',  protect,                                                    order.cancelOrder)

// Admin routes
router.get ('/',             protect, restrictTo('admin'),                               order.getAllOrders)
router.patch('/:id/status',  protect, restrictTo('admin', 'delivery'),                  order.updateStatus)
router.post ('/:id/refund',  protect, restrictTo('admin'),                               order.refundOrder)

module.exports = router
