const express  = require('express')
const router   = express.Router()
const profile  = require('../controllers/profileController')
const { protect } = require('../middleware/clerkAuth')

router.get ('/me', protect, profile.getMe)
router.patch('/me', protect, profile.updateMe)

module.exports = router
