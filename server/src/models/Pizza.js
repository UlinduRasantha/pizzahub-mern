const mongoose = require('mongoose')

const ingredientSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  isRemovable: { type: Boolean, default: true },
  allergens:   [String],
}, { _id: false })

const sizeSchema = new mongoose.Schema({
  label:      { type: String, enum: ['small', 'medium', 'large', 'xl'], required: true },
  diameter:   { type: Number, required: true },  // inches
  priceAdder: { type: Number, default: 0 },
}, { _id: false })

const crustSchema = new mongoose.Schema({
  label:      { type: String, enum: ['thin', 'classic', 'thick', 'stuffed'], required: true },
  priceAdder: { type: Number, default: 0 },
}, { _id: false })

const extraToppingSchema = new mongoose.Schema({
  name:  { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
}, { _id: false })

const pizzaSchema = new mongoose.Schema({
  name: {
    type: String, required: [true, 'Pizza name is required'],
    unique: true, trim: true, maxlength: 80,
  },
  description: { type: String, maxlength: 500 },
  category: {
    type: String,
    enum: ['classic', 'vegetarian', 'specialty', 'seasonal'],
    required: [true, 'Category is required'],
  },
  basePrice:     { type: Number, required: [true, 'Base price is required'], min: 0 },
  images:        [String],        // Cloudinary URLs
  ingredients:   [ingredientSchema],
  sizes:         { type: [sizeSchema], default: [
    { label: 'small',  diameter: 10, priceAdder: -3   },
    { label: 'medium', diameter: 12, priceAdder: 0    },
    { label: 'large',  diameter: 14, priceAdder: 3    },
    { label: 'xl',     diameter: 16, priceAdder: 5.50 },
  ]},
  crusts:        { type: [crustSchema], default: [
    { label: 'thin',    priceAdder: 0    },
    { label: 'classic', priceAdder: 0    },
    { label: 'thick',   priceAdder: 1    },
    { label: 'stuffed', priceAdder: 2.50 },
  ]},
  extraToppings: [extraToppingSchema],
  isAvailable:   { type: Boolean, default: true },
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count:   { type: Number, default: 0 },
  },
  isDeleted: { type: Boolean, default: false, select: false }, // soft delete
}, { timestamps: true })

// Indexes
pizzaSchema.index({ category: 1 })
pizzaSchema.index({ name: 'text', description: 'text' })
pizzaSchema.index({ isAvailable: 1, isDeleted: 1 })

// Only return non-deleted pizzas by default
pizzaSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: { $ne: true } })
  next()
})

// Recalculate average rating
pizzaSchema.methods.updateRating = async function (newRating) {
  const total = this.ratings.average * this.ratings.count + newRating
  this.ratings.count   += 1
  this.ratings.average  = parseFloat((total / this.ratings.count).toFixed(2))
  return this.save()
}

module.exports = mongoose.model('Pizza', pizzaSchema)
