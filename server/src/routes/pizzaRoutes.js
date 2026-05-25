const express = require('express')
const router  = express.Router()
const pizza   = require('../controllers/pizzaController')
const { protect, restrictTo } = require('../middleware/clerkAuth')
const { validate, pizzaRules, reviewRules } = require('../middleware/validators')

router.get ('/',                  pizza.getAllPizzas)
router.get ('/:id',               pizza.getPizza)
router.post('/',                  protect, restrictTo('admin'), pizzaRules, validate, pizza.createPizza)
router.patch('/:id',              protect, restrictTo('admin'),              validate, pizza.updatePizza)
router.delete('/:id',             protect, restrictTo('admin'),                        pizza.deletePizza)
router.post('/:id/reviews',       protect, reviewRules, validate, pizza.addReview)
router.get ('/:id/reviews',                                                            pizza.getReviews)
router.get ('/:id/my-review',     protect,                                             pizza.getMyReview)

module.exports = router
