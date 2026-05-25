const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema({
  pizza:    { type: mongoose.Schema.Types.ObjectId, ref: 'Pizza', required: true },
  customer:     { type: String, required: true },   // Clerk userId (user_xxx)
  customerName: { type: String, default: '' },        // display name from Clerk
  orderId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  rating:   { type: Number, required: true, min: 1, max: 5 },
  comment:  { type: String, maxlength: 500, default: '' },
}, { timestamps: true })

// One review per customer per pizza per order
reviewSchema.index({ pizza: 1, customer: 1, orderId: 1 }, { unique: true })

module.exports = mongoose.model('Review', reviewSchema)
