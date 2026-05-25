import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Star, Plus, Minus, ShoppingCart, Check, Info, ChevronDown, ChevronUp, Quote, MessageSquare } from 'lucide-react'
import { useCart } from '../hooks'
import { pizzaService, reviewService } from '../services/api'
import { formatCurrency, formatDate } from '../utils/helpers'
import Footer from '../components/layout/Footer'

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_PIZZA = {
  _id: '1', name: 'Truffle Funghi', category: 'specialty', basePrice: 18.99,
  description: 'Wild porcini mushrooms, shiitake, truffle oil, taleggio, fresh thyme, and toasted pine nuts on our classic tomato base. A celebration of earthy, umami-rich flavours.',
  images: [
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=85',
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=85',
  ],
  ingredients: [
    { name: 'San Marzano Tomato Base', isRemovable: false },
    { name: 'Taleggio Cheese',         isRemovable: true  },
    { name: 'Wild Porcini',            isRemovable: true  },
    { name: 'Shiitake Mushrooms',      isRemovable: true  },
    { name: 'Truffle Oil',             isRemovable: true  },
    { name: 'Fresh Thyme',             isRemovable: true  },
    { name: 'Pine Nuts',               isRemovable: true  },
  ],
  sizes: [
    { label: 'small',  diameter: 10, priceAdder: -3   },
    { label: 'medium', diameter: 12, priceAdder: 0    },
    { label: 'large',  diameter: 14, priceAdder: 3    },
    { label: 'xl',     diameter: 16, priceAdder: 5.50 },
  ],
  crusts: [
    { label: 'thin',    priceAdder: 0    },
    { label: 'classic', priceAdder: 0    },
    { label: 'thick',   priceAdder: 1    },
    { label: 'stuffed', priceAdder: 2.50 },
  ],
  extraToppings: [
    { name: 'Extra Mozzarella', price: 1.50 },
    { name: 'Jalapeños',        price: 0.75 },
    { name: 'Black Olives',     price: 0.75 },
    { name: 'Roasted Garlic',   price: 0.75 },
    { name: 'Extra Mushrooms',  price: 1.00 },
    { name: 'Fresh Basil',      price: 0.50 },
  ],
  ratings: { average: 4.9, count: 156 },
  isAvailable: true,
}

// ─── Rating breakdown bar ─────────────────────────────────────────────────────
function RatingBreakdown({ reviews }) {
  const counts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
  }))
  const max = Math.max(...counts.map(c => c.count), 1)

  return (
    <div className="space-y-1.5">
      {counts.map(({ star, count }) => (
        <div key={star} className="flex items-center gap-2 text-xs">
          <span className="text-gray-500 w-3 shrink-0">{star}</span>
          <Star size={10} className="fill-amber-400 text-amber-400 shrink-0" />
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(count / max) * 100}%` }}
              transition={{ duration: 0.6, delay: (5 - star) * 0.08 }}
              className="h-full bg-amber-400 rounded-full"
            />
          </div>
          <span className="text-gray-400 w-4 text-right shrink-0">{count}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Single review card ───────────────────────────────────────────────────────
function ReviewCard({ review }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = review.comment?.length > 140
  const display = isLong && !expanded
    ? review.comment.slice(0, 140) + '…'
    : review.comment

  const initial = (review.customerName || review.customer || '?')[0].toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center text-brand-red font-bold text-sm shrink-0">
            {initial}
          </div>
          <div>
            <p className="font-semibold text-brand-dark text-sm">
              {review.customerName || 'Customer'}
            </p>
            <p className="text-xs text-gray-400">{formatDate(review.createdAt)}</p>
          </div>
        </div>
        {/* Stars */}
        <div className="flex items-center gap-0.5 shrink-0">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={13}
              className={i < review.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-100 text-gray-200'}
            />
          ))}
        </div>
      </div>

      {/* Comment */}
      {review.comment && (
        <div>
          <p className="text-sm text-gray-600 leading-relaxed">{display}</p>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs text-brand-red font-semibold flex items-center gap-1 hover:underline"
            >
              {expanded ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Read more</>}
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ─── Reviews section ──────────────────────────────────────────────────────────
function ReviewsSection({ pizzaId, ratings }) {
  const [showAll, setShowAll] = useState(false)
  const PREVIEW = 3

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews', pizzaId],
    queryFn:  () => reviewService.getAll(pizzaId).then(r => r.data.data || []),
    enabled:  !!pizzaId,
    staleTime: 1000 * 60 * 2,
  })

  const displayed = showAll ? reviews : reviews.slice(0, PREVIEW)
  const hasMore   = reviews.length > PREVIEW

  const avg = ratings?.average || 0
  const cnt = ratings?.count   || 0

  return (
    <section className="mt-12 pt-10 border-t border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare size={20} className="text-brand-red" />
        <h2 className="text-xl font-black text-brand-dark">Customer Reviews</h2>
        {cnt > 0 && (
          <span className="text-sm text-gray-400 font-medium">({cnt} review{cnt !== 1 ? 's' : ''})</span>
        )}
      </div>

      {/* Summary row */}
      {cnt > 0 && (
        <div className="bg-gray-50 rounded-2xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Average score */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-5xl font-black text-brand-dark leading-none">{avg.toFixed(1)}</p>
              <div className="flex items-center justify-center gap-0.5 mt-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16}
                    className={i < Math.round(avg) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">{cnt} verified review{cnt !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Star breakdown */}
          {reviews.length > 0 && (
            <div className="flex flex-col justify-center">
              <RatingBreakdown reviews={reviews} />
            </div>
          )}
        </div>
      )}

      {/* Review list */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-24 animate-pulse">
              <div className="flex gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-gray-200" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-2 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
          <Star size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-500">No reviews yet</p>
          <p className="text-sm text-gray-400 mt-1">Be the first to review this pizza after ordering!</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {displayed.map((review, i) => (
                <ReviewCard key={review._id || i} review={review} />
              ))}
            </AnimatePresence>
          </div>

          {hasMore && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-5 w-full py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-brand-red/30 hover:text-brand-red transition-all flex items-center justify-center gap-2"
            >
              {showAll
                ? <><ChevronUp size={15} /> Show fewer reviews</>
                : <><ChevronDown size={15} /> Show all {reviews.length} reviews</>}
            </button>
          )}
        </>
      )}
    </section>
  )
}

// ─── Option pill ──────────────────────────────────────────────────────────────
function OptionPill({ label, selected, onClick, extra }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all capitalize
        ${selected ? 'border-brand-red bg-brand-light text-brand-red' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
    >
      {label}
      {extra !== undefined && (
        <span className={`text-xs mt-0.5 font-normal ${selected ? 'text-brand-red/70' : 'text-gray-400'}`}>
          {extra === 0 ? 'no charge' : `+${formatCurrency(extra)}`}
        </span>
      )}
    </button>
  )
}

// ─── Topping chip ─────────────────────────────────────────────────────────────
function ToppingChip({ label, price, selected, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all
        ${selected
          ? 'border-brand-red bg-brand-red text-white'
          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
    >
      {selected && <Check size={11} />}
      {label}
      {price > 0 && <span className={selected ? 'text-white/70' : 'text-gray-400'}>+{formatCurrency(price)}</span>}
    </button>
  )
}

// ─── PizzaDetailPage ──────────────────────────────────────────────────────────
export default function PizzaDetailPage() {
  const { id } = useParams()
  const { addToCart } = useCart()

  const [selectedSize,   setSelectedSize]   = useState('medium')
  const [selectedCrust,  setSelectedCrust]  = useState('classic')
  const [selectedExtras, setSelectedExtras] = useState([])
  const [removedIngreds, setRemovedIngreds] = useState([])
  const [specialNote,    setSpecialNote]    = useState('')
  const [quantity,       setQuantity]       = useState(1)
  const [activeImage,    setActiveImage]    = useState(0)
  const [added,          setAdded]          = useState(false)

  const { data: pizza, isLoading } = useQuery({
    queryKey: ['pizza', id],
    queryFn:  () => pizzaService.getById(id).then(r => r.data.data),
    placeholderData: MOCK_PIZZA,
  })

  const p = pizza || MOCK_PIZZA

  const unitPrice = useMemo(() => {
    const sizeAdder  = p.sizes?.find(s => s.label === selectedSize)?.priceAdder  || 0
    const crustAdder = p.crusts?.find(c => c.label === selectedCrust)?.priceAdder || 0
    const extrasSum  = selectedExtras.reduce((sum, name) => {
      const t = p.extraToppings?.find(t => t.name === name)
      return sum + (t?.price || 0)
    }, 0)
    return p.basePrice + sizeAdder + crustAdder + extrasSum
  }, [p, selectedSize, selectedCrust, selectedExtras])

  const totalPrice = unitPrice * quantity

  const handleAddToCart = () => {
    addToCart(p, {
      size:            selectedSize,
      crust:           selectedCrust,
      extraToppings:   selectedExtras.map(name => ({ name, price: p.extraToppings?.find(t => t.name === name)?.price || 0 })),
      removedToppings: removedIngreds,
      specialNote,
      unitPrice,
      quantity,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="aspect-square bg-gray-200 rounded-3xl" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-2/3" />
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="h-4 bg-gray-100 rounded w-3/4" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <Link to="/menu" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-red transition-colors mb-6">
          <ArrowLeft size={15} /> Back to menu
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16">

          {/* ── LEFT: Images ── */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <div className="aspect-square rounded-3xl overflow-hidden bg-brand-light border border-gray-100 shadow-sm">
              <img
                src={p.images?.[activeImage] || p.images?.[0]}
                alt={p.name}
                className="w-full h-full object-cover"
              />
            </div>
            {p.images?.length > 1 && (
              <div className="flex gap-3 mt-3">
                {p.images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImage(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${activeImage === i ? 'border-brand-red' : 'border-gray-200'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* ── RIGHT: Details + Customizer ── */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-block bg-brand-light text-brand-red text-xs font-bold px-3 py-1 rounded-full capitalize mb-3">
              {p.category}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-brand-dark leading-tight">{p.name}</h1>

            {/* Rating summary — clickable to scroll to reviews */}
            {p.ratings?.count > 0 && (
              <a
                href="#reviews"
                className="inline-flex items-center gap-2 mt-2 group"
                onClick={e => { e.preventDefault(); document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' }) }}
              >
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14}
                      className={i < Math.round(p.ratings.average) ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-200'}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold text-gray-700">{p.ratings.average.toFixed(1)}</span>
                <span className="text-sm text-brand-red group-hover:underline">
                  ({p.ratings.count} review{p.ratings.count !== 1 ? 's' : ''})
                </span>
              </a>
            )}

            <p className="mt-3 text-gray-600 leading-relaxed">{p.description}</p>

            {/* Ingredients */}
            {p.ingredients?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Ingredients</p>
                <div className="flex flex-wrap gap-2">
                  {p.ingredients.map(({ name, isRemovable }) => (
                    <button
                      key={name}
                      disabled={!isRemovable}
                      onClick={() => isRemovable && setRemovedIngreds(prev =>
                        prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
                      )}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all
                        ${removedIngreds.includes(name)
                          ? 'border-red-200 bg-red-50 text-red-400 line-through'
                          : isRemovable
                            ? 'border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:text-red-400'
                            : 'border-gray-100 bg-gray-50 text-gray-400 cursor-default'}`}
                    >
                      {name}
                      {isRemovable && <span className="ml-1 opacity-50">{removedIngreds.includes(name) ? '↩' : '✕'}</span>}
                    </button>
                  ))}
                </div>
                {removedIngreds.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Info size={11} /> Tap again to restore an ingredient
                  </p>
                )}
              </div>
            )}

            <div className="border-t border-gray-100 my-5" />

            {/* Size */}
            <div className="mb-5">
              <p className="text-sm font-bold text-brand-dark mb-3">Choose Size</p>
              <div className="grid grid-cols-4 gap-2">
                {p.sizes?.map(({ label, diameter, priceAdder }) => (
                  <OptionPill key={label} label={`${label}\n${diameter}"`}
                    selected={selectedSize === label}
                    onClick={() => setSelectedSize(label)} extra={priceAdder} />
                ))}
              </div>
            </div>

            {/* Crust */}
            <div className="mb-5">
              <p className="text-sm font-bold text-brand-dark mb-3">Choose Crust</p>
              <div className="grid grid-cols-4 gap-2">
                {p.crusts?.map(({ label, priceAdder }) => (
                  <OptionPill key={label} label={label}
                    selected={selectedCrust === label}
                    onClick={() => setSelectedCrust(label)} extra={priceAdder} />
                ))}
              </div>
            </div>

            {/* Extra toppings */}
            {p.extraToppings?.length > 0 && (
              <div className="mb-5">
                <p className="text-sm font-bold text-brand-dark mb-3">
                  Extra Toppings <span className="font-normal text-gray-400">(optional)</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {p.extraToppings.map(({ name, price }) => (
                    <ToppingChip key={name} label={name} price={price}
                      selected={selectedExtras.includes(name)}
                      onToggle={() => setSelectedExtras(prev =>
                        prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
                      )} />
                  ))}
                </div>
              </div>
            )}

            {/* Special instructions */}
            <div className="mb-6">
              <p className="text-sm font-bold text-brand-dark mb-2">
                Special Instructions <span className="font-normal text-gray-400">(optional)</span>
              </p>
              <textarea
                value={specialNote}
                onChange={e => setSpecialNote(e.target.value)}
                maxLength={200} rows={2}
                placeholder="Extra crispy edges, cut in squares, light sauce…"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:border-brand-red transition"
              />
              <p className="text-xs text-gray-400 text-right mt-1">{specialNote.length}/200</p>
            </div>

            {/* Sticky Add to cart */}
            <div className="sticky bottom-0 bg-white border border-gray-100 rounded-2xl p-4 shadow-lg flex items-center gap-4">
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-2 py-1">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                  <Minus size={15} />
                </button>
                <span className="font-bold text-brand-dark w-6 text-center">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                  <Plus size={15} />
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={!p.isAvailable}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-95
                  ${added
                    ? 'bg-green-500 text-white'
                    : !p.isAvailable
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-brand-red text-white hover:bg-red-700 shadow-lg shadow-brand-red/25'}`}
              >
                {added
                  ? <><Check size={16} /> Added!</>
                  : <><ShoppingCart size={16} /> Add to Cart — {formatCurrency(totalPrice)}</>}
              </button>
            </div>
          </motion.div>
        </div>

        {/* ── REVIEWS SECTION ── */}
        <div id="reviews">
          <ReviewsSection pizzaId={p._id} ratings={p.ratings} />
        </div>

      </div>
      <Footer />
    </div>
  )
}
