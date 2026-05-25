const mongoose = require('mongoose')

// Clerk owns: email, name, avatar, password, OAuth tokens
// We own: role, addresses, phone, preferences
const addressSchema = new mongoose.Schema({
  label:     { type: String, default: 'Home' },
  street:    { type: String, required: true  },
  city:      { type: String, required: true  },
  state:     { type: String, required: true  },
  zip:       { type: String, required: true  },
  isDefault: { type: Boolean, default: false },
}, { _id: false })

const userProfileSchema = new mongoose.Schema({
  clerkId:   { type: String, required: true, unique: true, index: true },
  role:      { type: String, enum: ['customer', 'admin', 'delivery'], default: 'customer' },
  phone:     { type: String, trim: true },
  addresses: [addressSchema],
  isActive:  { type: Boolean, default: true },
}, { timestamps: true })

userProfileSchema.methods.toPublic = function () {
  return {
    _id:       this._id,
    clerkId:   this.clerkId,
    role:      this.role,
    phone:     this.phone,
    addresses: this.addresses,
    isActive:  this.isActive,
    createdAt: this.createdAt,
  }
}

module.exports = mongoose.model('UserProfile', userProfileSchema)
