const mongoose = require('mongoose')

const orderItemSchema = new mongoose.Schema({
  pizza:           { type: mongoose.Schema.Types.ObjectId, ref: 'Pizza' },
  name:            { type: String, required: true },  // snapshot
  image:           String,
  size:            { type: String, enum: ['small', 'medium', 'large', 'xl'], required: true },
  crust:           { type: String, enum: ['thin', 'classic', 'thick', 'stuffed'], required: true },
  extraToppings:   [{ name: String, price: Number }],
  removedToppings: [String],
  specialNote:     { type: String, maxlength: 200 },
  quantity:        { type: Number, required: true, min: 1 },
  unitPrice:       { type: Number, required: true },
  subtotal:        { type: Number, required: true },
}, { _id: false })

const statusHistorySchema = new mongoose.Schema({
  status:    String,
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: false })

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String, unique: true,
    // auto-generated in pre-save hook
  },
  customer: { type: String, required: true },
  items:    { type: [orderItemSchema], required: true },

  // Pricing
  subtotal:    { type: Number, required: true },
  discount:    { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 2.99 },
  tax:         { type: Number, required: true },
  total:       { type: Number, required: true },
  couponCode:  String,

  // Delivery
  orderType:       { type: String, enum: ['delivery', 'pickup'], required: true },
  deliveryAddress: {
    street: String, city: String, state: String, zip: String,
    coordinates: { type: [Number], index: '2dsphere' },  // [lng, lat]
  },
  scheduledFor:      { type: String, default: 'asap' },
  estimatedDelivery: Date,

  // Status
  status: {
    type: String,
    enum: ['received', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'received',
  },
  statusHistory: [statusHistorySchema],

  // Payment
  paymentStatus:   { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
  stripePaymentId: String,

  // Delivery agent
  assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Cancel window (5 min)
  cancelDeadline: Date,

  // Customer receipt confirmation (unlocks review)
  confirmedReceived:   { type: Boolean, default: false },
  confirmedReceivedAt: Date,
}, { timestamps: true })

// Indexes
orderSchema.index({ customer: 1, createdAt: -1 })
orderSchema.index({ status: 1, createdAt: -1 })
orderSchema.index({ orderNumber: 1 })

// Auto-generate order number: PH-YYYYMMDD-NNNN
orderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const today   = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const count   = await this.constructor.countDocuments()
    this.orderNumber  = `PH-${today}-${String(count + 1).padStart(4, '0')}`
    this.cancelDeadline = new Date(Date.now() + 5 * 60 * 1000)
    this.statusHistory  = [{ status: 'received', updatedAt: new Date() }]

    // Set estimated delivery time
    if (this.orderType === 'delivery') {
      this.estimatedDelivery = new Date(Date.now() + 30 * 60 * 1000)
    }
  }
  next()
})

module.exports = mongoose.model('Order', orderSchema)
