import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import PizzaCard from '../components/pizza/PizzaCard'
import Footer from '../components/layout/Footer'
import { pizzaService } from '../services/api'
import { setCategory, setSearchQuery, setSortBy, selectActiveCategory, selectSearchQuery, selectSortBy } from '../features/menu/menuSlice'

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',        label: 'All Pizzas', emoji: '🍕' },
  { id: 'classic',    label: 'Classic',    emoji: '🍅' },
  { id: 'vegetarian', label: 'Vegetarian', emoji: '🥬' },
  { id: 'specialty',  label: 'Specialty',  emoji: '⭐' },
  { id: 'seasonal',   label: 'Seasonal',   emoji: '🌿' },
]

const SORT_OPTIONS = [
  { value: 'default',          label: 'Featured'       },
  { value: 'price-asc',        label: 'Price: Low → High' },
  { value: 'price-desc',       label: 'Price: High → Low' },
  { value: 'rating',           label: 'Top Rated'      },
  { value: 'name',             label: 'Name A → Z'     },
]

// ─── Mock data (used until backend is ready) ──────────────────────────────────
const MOCK_PIZZAS = [
  { _id: '1', name: 'Margherita Classica', category: 'classic',    basePrice: 12.99, description: 'San Marzano tomatoes, fresh mozzarella, hand-torn basil, extra virgin olive oil.', ratings: { average: 4.8, count: 312 }, images: ['https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80'] },
  { _id: '2', name: 'Diavola Picante',     category: 'specialty',  basePrice: 15.99, description: 'Spicy salami, nduja, roasted peppers, smoked mozzarella, chilli drizzle.', ratings: { average: 4.9, count: 187 }, images: ['https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&q=80'] },
  { _id: '3', name: 'Garden Verde',        category: 'vegetarian', basePrice: 13.99, description: 'Grilled courgette, artichoke hearts, sun-dried tomatoes, rocket, burrata.', ratings: { average: 4.7, count: 224 }, images: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80'] },
  { _id: '4', name: 'Truffle Funghi',      category: 'specialty',  basePrice: 18.99, description: 'Wild porcini, shiitake, truffle oil, taleggio, fresh thyme, toasted pine nuts.', ratings: { average: 4.9, count: 156 }, images: ['https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80'] },
  { _id: '5', name: 'Pepperoni Supreme',   category: 'classic',    basePrice: 14.99, description: 'Double pepperoni, mozzarella, fresh oregano, tangy tomato sauce.', ratings: { average: 4.8, count: 401 }, images: ['https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&q=80'] },
  { _id: '6', name: 'Quattro Formaggi',    category: 'classic',    basePrice: 16.99, description: 'Mozzarella, gorgonzola, taleggio, parmigiano reggiano, walnut honey drizzle.', ratings: { average: 4.7, count: 198 }, images: ['https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80'] },
  { _id: '7', name: 'Primavera',           category: 'vegetarian', basePrice: 13.49, description: 'Cherry tomatoes, asparagus, peas, buffalo mozzarella, lemon zest, mint.', ratings: { average: 4.6, count: 134 }, images: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80'] },
  { _id: '8', name: 'Autumn Harvest',      category: 'seasonal',   basePrice: 17.49, description: 'Butternut squash, sage, smoked pancetta, ricotta, toasted pumpkin seeds.', ratings: { average: 4.8, count: 89  }, images: ['https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80'] },
]

// ─── Skeleton card ─────────────────────────────────────────────────────────────
function PizzaCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
      <div className="aspect-[4/3] bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="h-10 bg-gray-200 rounded-xl mt-2" />
      </div>
    </div>
  )
}

// ─── MenuPage ─────────────────────────────────────────────────────────────────
export default function MenuPage() {
  const dispatch   = useDispatch()
  const [searchParams] = useSearchParams()

  const activeCategory = useSelector(selectActiveCategory)
  const searchQuery    = useSelector(selectSearchQuery)
  const sortBy         = useSelector(selectSortBy)
  const [showSort, setShowSort] = useState(false)

  // Sync URL param → redux on mount
  const urlCategory = searchParams.get('category')

  const { data: pizzasData, isLoading, isError } = useQuery({
    queryKey: ['pizzas'],
    queryFn: () => pizzaService.getAll({ limit: 50 }),
    select: (res) => res.data.data,
  })

  const pizzas = pizzasData || MOCK_PIZZAS

  // Client-side filter + sort
  const filtered = useMemo(() => {
    const cat = urlCategory || activeCategory
    let list = cat === 'all' ? pizzas : pizzas.filter(p => p.category === cat)

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'price-asc')  return a.basePrice - b.basePrice
      if (sortBy === 'price-desc') return b.basePrice - a.basePrice
      if (sortBy === 'rating')     return (b.ratings?.average || 0) - (a.ratings?.average || 0)
      if (sortBy === 'name')       return a.name.localeCompare(b.name)
      return 0
    })
  }, [pizzas, activeCategory, urlCategory, searchQuery, sortBy])

  const currentCat = urlCategory || activeCategory
  const activeSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Page header ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1 className="text-4xl font-black text-brand-dark">Our Menu</h1>
            <p className="text-gray-500 mt-1">
              {isLoading ? 'Loading...' : `${filtered.length} pizza${filtered.length !== 1 ? 's' : ''} available`}
            </p>
          </motion.div>

          {/* ── Category tabs ── */}
          <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map(({ id, label, emoji }) => (
              <button
                key={id}
                onClick={() => dispatch(setCategory(id))}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                  currentCat === id
                    ? 'bg-brand-red text-white shadow-md shadow-brand-red/25'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{emoji}</span> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Search + Sort bar ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search pizzas or ingredients…"
              value={searchQuery}
              onChange={(e) => dispatch(setSearchQuery(e.target.value))}
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:border-brand-red transition"
            />
            {searchQuery && (
              <button onClick={() => dispatch(setSearchQuery(''))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={15} />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSort(!showSort)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-300 transition whitespace-nowrap"
            >
              <SlidersHorizontal size={15} className="text-gray-400" />
              {activeSortLabel}
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${showSort ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showSort && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-100 rounded-xl shadow-xl z-20 overflow-hidden"
                >
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { dispatch(setSortBy(opt.value)); setShowSort(false) }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        sortBy === opt.value ? 'bg-brand-light text-brand-red font-semibold' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Grid ── */}
        {isError && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">😕</p>
            <p className="font-semibold">Couldn't load menu. Showing demo pizzas.</p>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => <PizzaCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-24"
          >
            <p className="text-5xl mb-4">🍕</p>
            <h3 className="font-bold text-gray-700 text-lg">No pizzas found</h3>
            <p className="text-gray-400 text-sm mt-1">Try a different search or category</p>
            <button onClick={() => { dispatch(setSearchQuery('')); dispatch(setCategory('all')) }} className="mt-4 btn-primary text-sm">
              Clear filters
            </button>
          </motion.div>
        ) : (
          <motion.div
            key={currentCat + searchQuery + sortBy}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filtered.map((pizza, i) => (
              <PizzaCard key={pizza._id} pizza={pizza} index={i} />
            ))}
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  )
}
