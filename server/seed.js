require('dotenv').config()
const mongoose = require('mongoose')

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pizzahub'

const PIZZAS = [
  {
    name: 'Margherita Classica', category: 'classic', basePrice: 12.99,
    description: 'San Marzano tomatoes, fresh mozzarella fior di latte, hand-torn basil, extra virgin olive oil.',
    images: ['https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80'],
    ingredients: [
      { name: 'San Marzano Tomato Base', isRemovable: false },
      { name: 'Fior di Latte Mozzarella', isRemovable: true },
      { name: 'Fresh Basil', isRemovable: true },
      { name: 'Olive Oil',   isRemovable: true },
    ],
    extraToppings: [
      { name: 'Extra Mozzarella', price: 1.50 },
      { name: 'Burrata',          price: 2.50 },
      { name: 'Fresh Basil',      price: 0.50 },
    ],
    isAvailable: true, ratings: { average: 4.8, count: 312 },
  },
  {
    name: 'Diavola Picante', category: 'specialty', basePrice: 15.99,
    description: 'Spicy Calabrian salami, nduja spread, roasted red peppers, smoked mozzarella, chilli oil drizzle.',
    images: ['https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&q=80'],
    ingredients: [
      { name: 'Tomato Base',      isRemovable: false },
      { name: 'Smoked Mozzarella',isRemovable: true  },
      { name: 'Calabrian Salami', isRemovable: true  },
      { name: 'Nduja',            isRemovable: true  },
      { name: 'Roasted Peppers',  isRemovable: true  },
      { name: 'Chilli Oil',       isRemovable: true  },
    ],
    extraToppings: [
      { name: 'Extra Salami', price: 1.50 },
      { name: 'Jalapeños',    price: 0.75 },
      { name: 'Extra Nduja',  price: 1.25 },
    ],
    isAvailable: true, ratings: { average: 4.9, count: 187 },
  },
  {
    name: 'Garden Verde', category: 'vegetarian', basePrice: 13.99,
    description: 'Grilled courgette, artichoke hearts, sun-dried tomatoes, rocket, burrata, lemon zest.',
    images: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80'],
    ingredients: [
      { name: 'White Base',         isRemovable: false },
      { name: 'Burrata',            isRemovable: true  },
      { name: 'Grilled Courgette',  isRemovable: true  },
      { name: 'Artichoke Hearts',   isRemovable: true  },
      { name: 'Sun-Dried Tomatoes', isRemovable: true  },
      { name: 'Rocket',             isRemovable: true  },
    ],
    extraToppings: [
      { name: 'Extra Burrata',  price: 2.00 },
      { name: 'Roasted Garlic', price: 0.75 },
      { name: 'Black Olives',   price: 0.75 },
    ],
    isAvailable: true, ratings: { average: 4.7, count: 224 },
  },
  {
    name: 'Truffle Funghi', category: 'specialty', basePrice: 18.99,
    description: 'Wild porcini, shiitake, truffle oil, taleggio, fresh thyme, toasted pine nuts.',
    images: ['https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80'],
    ingredients: [
      { name: 'Truffle Cream Base', isRemovable: false },
      { name: 'Taleggio',           isRemovable: true  },
      { name: 'Wild Porcini',       isRemovable: true  },
      { name: 'Shiitake',           isRemovable: true  },
      { name: 'Truffle Oil',        isRemovable: true  },
      { name: 'Fresh Thyme',        isRemovable: true  },
      { name: 'Pine Nuts',          isRemovable: true  },
    ],
    extraToppings: [
      { name: 'Extra Mushrooms',   price: 1.50 },
      { name: 'Extra Truffle Oil', price: 1.50 },
      { name: 'Parmesan',          price: 1.00 },
    ],
    isAvailable: true, ratings: { average: 4.9, count: 156 },
  },
  {
    name: 'Pepperoni Supreme', category: 'classic', basePrice: 14.99,
    description: 'Double-layered pepperoni, whole-milk mozzarella, fresh oregano, tangy San Marzano sauce.',
    images: ['https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&q=80'],
    ingredients: [
      { name: 'San Marzano Tomato Base', isRemovable: false },
      { name: 'Whole-Milk Mozzarella',   isRemovable: true  },
      { name: 'Pepperoni',               isRemovable: true  },
      { name: 'Fresh Oregano',           isRemovable: true  },
    ],
    extraToppings: [
      { name: 'Extra Pepperoni', price: 1.75 },
      { name: 'Extra Cheese',    price: 1.50 },
      { name: 'Green Peppers',   price: 0.75 },
    ],
    isAvailable: true, ratings: { average: 4.8, count: 401 },
  },
  {
    name: 'Quattro Formaggi', category: 'classic', basePrice: 16.99,
    description: 'Mozzarella, gorgonzola, taleggio, parmigiano reggiano, walnut honey drizzle.',
    images: ['https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80'],
    ingredients: [
      { name: 'White Base',          isRemovable: false },
      { name: 'Mozzarella',          isRemovable: true  },
      { name: 'Gorgonzola',          isRemovable: true  },
      { name: 'Taleggio',            isRemovable: true  },
      { name: 'Parmigiano Reggiano', isRemovable: true  },
      { name: 'Walnut Honey',        isRemovable: true  },
    ],
    extraToppings: [
      { name: 'Extra Gorgonzola',  price: 1.25 },
      { name: 'Caramelised Onion', price: 0.75 },
    ],
    isAvailable: true, ratings: { average: 4.7, count: 198 },
  },
  {
    name: 'Primavera', category: 'vegetarian', basePrice: 13.49,
    description: 'Cherry tomatoes, asparagus, peas, buffalo mozzarella, lemon zest, mint.',
    images: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80'],
    ingredients: [
      { name: 'Tomato Base',       isRemovable: false },
      { name: 'Buffalo Mozzarella',isRemovable: true  },
      { name: 'Cherry Tomatoes',   isRemovable: true  },
      { name: 'Asparagus',         isRemovable: true  },
      { name: 'Garden Peas',       isRemovable: true  },
      { name: 'Lemon Zest',        isRemovable: true  },
    ],
    extraToppings: [
      { name: 'Extra Mozzarella', price: 1.50 },
      { name: 'Artichoke Hearts', price: 1.00 },
    ],
    isAvailable: true, ratings: { average: 4.6, count: 134 },
  },
  {
    name: 'Autumn Harvest', category: 'seasonal', basePrice: 17.49,
    description: 'Butternut squash, crispy sage, smoked pancetta, whipped ricotta, pumpkin seeds.',
    images: ['https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80'],
    ingredients: [
      { name: 'White Base',       isRemovable: false },
      { name: 'Whipped Ricotta',  isRemovable: true  },
      { name: 'Butternut Squash', isRemovable: true  },
      { name: 'Smoked Pancetta',  isRemovable: true  },
      { name: 'Crispy Sage',      isRemovable: true  },
      { name: 'Pumpkin Seeds',    isRemovable: true  },
    ],
    extraToppings: [
      { name: 'Extra Pancetta', price: 1.50 },
      { name: 'Walnuts',        price: 0.75 },
    ],
    isAvailable: true, ratings: { average: 4.8, count: 89 },
  },
]

async function seed() {
  try {
    await mongoose.connect(MONGO_URI)
    console.log('✅  Connected to MongoDB')

    const Pizza       = require('./src/models/Pizza')
    const UserProfile = require('./src/models/UserProfile')

    // Seed pizzas
    const pizzaCount = await Pizza.countDocuments()
    if (pizzaCount === 0) {
      await Pizza.insertMany(PIZZAS)
      console.log(`✅  Seeded ${PIZZAS.length} pizzas`)
    } else {
      console.log(`ℹ️   ${pizzaCount} pizzas already exist — skipping`)
    }

    console.log('\n🍕  Seed complete!')
    console.log('\n📋  Next steps:')
    console.log('    1. Sign up via the frontend (Clerk handles registration)')
    console.log('    2. Find your Clerk user ID in the Clerk Dashboard → Users')
    console.log('    3. Run the promote-admin script to give yourself admin role:')
    console.log('       node promote-admin.js YOUR_CLERK_USER_ID\n')
  } catch (err) {
    console.error('❌  Seed failed:', err.message)
  } finally {
    await mongoose.connection.close()
  }
}

seed()
