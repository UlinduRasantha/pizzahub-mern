const { getAuth } = require('@clerk/express')
const { AppError } = require('../utils/appError')
const UserProfile  = require('../models/UserProfile')

// ─── Require a valid Clerk session ────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const { userId } = getAuth(req)
    if (!userId) throw new AppError('Not authenticated. Please log in.', 401)

    // Find or lazily create the local profile on first request
    let profile = await UserProfile.findOne({ clerkId: userId })
    if (!profile) {
      profile = await UserProfile.create({ clerkId: userId })
    }

    if (!profile.isActive) {
      throw new AppError('Account deactivated. Contact support.', 403)
    }

    req.auth = { userId }   // raw Clerk id string (user_xxxx)
    req.user = profile      // our MongoDB profile (role, addresses, etc.)
    next()
  } catch (err) {
    next(err)
  }
}

// ─── Role-based gate ──────────────────────────────────────────────────────────
const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action.', 403))
  }
  next()
}

// ─── Optional auth — attaches user if present, never rejects ─────────────────
const optionalAuth = async (req, res, next) => {
  try {
    const { userId } = getAuth(req)
    if (userId) {
      req.auth = { userId }
      req.user = await UserProfile.findOne({ clerkId: userId })
    }
  } catch { /* ignore */ }
  next()
}

module.exports = { protect, restrictTo, optionalAuth }
