const UserProfile = require('../models/UserProfile')
const Order       = require('../models/Order')
const { catchAsync, sendSuccess } = require('../utils/appError')

// GET /api/v1/profile/me
exports.getMe = catchAsync(async (req, res) => {
  sendSuccess(res, { profile: req.user.toPublic() })
})

// PATCH /api/v1/profile/me
exports.updateMe = catchAsync(async (req, res) => {
  const { phone, addresses } = req.body
  const profile = await UserProfile.findByIdAndUpdate(
    req.user._id,
    { phone, addresses },
    { new: true, runValidators: true }
  )
  sendSuccess(res, { profile: profile.toPublic() })
})
