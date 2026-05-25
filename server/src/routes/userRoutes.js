const express = require('express')
const router  = express.Router()
const user    = require('../controllers/userController')
const { protect, restrictTo } = require('../middleware/clerkAuth')

// All user-management routes require admin
router.use(protect, restrictTo('admin'))

router.get ('/',               user.getAllUsers)
router.get ('/stats',          user.getStats)
router.get ('/:id',            user.getUser)
router.patch('/:id/toggle-active', user.toggleActive)

module.exports = router
