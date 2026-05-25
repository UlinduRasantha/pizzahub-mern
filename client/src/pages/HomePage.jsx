import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Clock, ShieldCheck, Flame, Star, ChevronRight, Truck, Quote } from 'lucide-react'
import PizzaCard from '../components/pizza/PizzaCard'
import Footer from '../components/layout/Footer'
import { pizzaService, reviewService } from '../services/api'

// ─── Static data ──────────────────────────────────────────────────────────────
const MOCK_PIZZAS = [
  { _id: '1', name: 'Margherita Classica', category: 'classic',    basePrice: 12.99, description: 'San Marzano tomatoes, fresh mozzarella, hand-torn basil, extra virgin olive oil.', ratings: { average: 4.8, count: 312 }, images: ['https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80'] },
  { _id: '2', name: 'Diavola Picante',     category: 'specialty',  basePrice: 15.99, description: 'Spicy salami, nduja, roasted peppers, smoked mozzarella, chilli drizzle.',         ratings: { average: 4.9, count: 187 }, images: ['https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&q=80'] },
  { _id: '3', name: 'Garden Verde',        category: 'vegetarian', basePrice: 13.99, description: 'Grilled courgette, artichoke hearts, sun-dried tomatoes, rocket, burrata.',           ratings: { average: 4.7, count: 224 }, images: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80'] },
  { _id: '4', name: 'Truffle Funghi',      category: 'specialty',  basePrice: 18.99, description: 'Wild porcini, shiitake, truffle oil, taleggio, fresh thyme, toasted pine nuts.',     ratings: { average: 4.9, count: 156 }, images: ['https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80'] },
]

const FALLBACK_REVIEWS = [
  { _id: 'r1', customer: 'Priya M.',  rating: 5, comment: 'Best pizza outside of Naples. The crust is absolutely perfect.',         pizzaName: 'Margherita Classica', createdAt: new Date().toISOString() },
  { _id: 'r2', customer: 'James K.',  rating: 5, comment: 'Truffle Funghi is a work of art. Arrived piping hot in under 25 minutes!', pizzaName: 'Truffle Funghi',      createdAt: new Date().toISOString() },
  { _id: 'r3', customer: 'Sofia R.',  rating: 5, comment: 'Finally a vegetarian pizza that doesn\'t feel like a compromise. Obsessed.',pizzaName: 'Garden Verde',        createdAt: new Date().toISOString() },
]

const CATEGORIES = [
  { id: 'classic',    label: 'Classic',    emoji: '🍅', desc: 'Time-honoured recipes' },
  { id: 'vegetarian', label: 'Vegetarian', emoji: '🥬', desc: 'Garden-fresh goodness' },
  { id: 'specialty',  label: 'Specialty',  emoji: '⭐', desc: 'Chef\'s signatures'    },
  { id: 'seasonal',   label: 'Seasonal',   emoji: '🌿', desc: 'Limited time only'     },
]

const FEATURES = [
  { icon: Flame,       title: 'Stone-Fired',     desc: 'Baked at 850°F in our wood-fire ovens for the perfect char.'         },
  { icon: Truck,       title: '30-min Delivery',  desc: 'Hot to your door or free. That\'s our promise, every time.'         },
  { icon: ShieldCheck, title: 'Fresh Daily',      desc: 'Every ingredient sourced fresh — zero frozen shortcuts.'            },
  { icon: Clock,       title: 'Open Late',        desc: 'Cravings don\'t keep hours. We\'re open until midnight.'            },
]

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

function SectionHeading({ label, title, subtitle }) {
  return (
    <motion.div variants={fadeUp} className="text-center mb-12">
      <span className="inline-block text-brand-red text-sm font-bold uppercase tracking-[0.15em] mb-3">{label}</span>
      <h2 className="text-4xl sm:text-5xl font-black text-brand-dark leading-tight">{title}</h2>
      {subtitle && <p className="mt-3 text-gray-500 text-lg max-w-xl mx-auto">{subtitle}</p>}
    </motion.div>
  )
}

// ─── Review card ──────────────────────────────────────────────────────────────
function ReviewCard({ review, index }) {
  // Get first letter of customer id or name for avatar
  const initial = (review.customerName || review.customer || '?')[0].toUpperCase()

  return (
    <motion.div
      variants={fadeUp}
      className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-shadow flex flex-col"
    >
      {/* Stars */}
      <div className="flex items-center gap-1 mb-3">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={14}
            className={i < review.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-100 text-gray-200'}
          />
        ))}
      </div>

      {/* Quote icon + comment */}
      <div className="flex-1">
        <Quote size={18} className="text-brand-red/30 mb-2" />
        <p className="text-gray-700 text-sm leading-relaxed italic line-clamp-3">
          {review.comment || 'Absolutely delicious!'}
        </p>
      </div>

      {/* Pizza name badge */}
      {review.pizzaName && (
        <span className="inline-block mt-3 text-xs font-semibold text-brand-red bg-brand-light px-2.5 py-1 rounded-full w-fit">
          🍕 {review.pizzaName}
        </span>
      )}

      {/* Reviewer */}
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
        <div className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center text-brand-red font-bold text-sm shrink-0">
          {initial}
        </div>
        <div>
          <span className="font-semibold text-sm text-brand-dark block">
            {review.customerName || `Customer`}
          </span>
          <span className="text-xs text-gray-400">Verified order</span>
        </div>
      </div>
    </motion.div>
  )
}

// ─── ReviewsSection — fetches real reviews across all top pizzas ──────────────
function ReviewsSection() {
  // Fetch top 4 pizzas first, then get reviews for each
  const { data: pizzas } = useQuery({
    queryKey: ['pizzas', 'top-for-reviews'],
    queryFn:  () => pizzaService.getAll({ limit: 4, sort: 'rating' }).then(r => r.data.data),
    staleTime: 1000 * 60 * 5,
  })

  // Fetch reviews for each pizza in parallel (only when pizzas loaded)
  const pizzaIds = (pizzas || []).map(p => p._id)

  const { data: allReviews, isLoading } = useQuery({
    queryKey: ['homeReviews', pizzaIds.join(',')],
    queryFn: async () => {
      if (!pizzaIds.length) return []
      const results = await Promise.all(
        pizzaIds.map(id =>
          reviewService.getAll(id)
            .then(r => {
              const pizza = pizzas.find(p => p._id === id)
              return (r.data.data || []).map(review => ({
                ...review,
                pizzaName: pizza?.name,
              }))
            })
            .catch(() => [])
        )
      )
      // Flatten, filter to only reviews with comments, sort by date, take latest 6
      return results
        .flat()
        .filter(r => r.comment && r.comment.trim().length > 5)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 6)
    },
    enabled: pizzaIds.length > 0,
    staleTime: 1000 * 60 * 5,
  })

  // Use real reviews if we have them (≥1), else fall back to static
  const reviews = allReviews?.length > 0 ? allReviews : FALLBACK_REVIEWS

  // Total count for the "X+ reviews" line
  const totalCount = (pizzas || []).reduce((sum, p) => sum + (p.ratings?.count || 0), 0)

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={staggerContainer}>
          <SectionHeading
            label="Real Reviews"
            title="People are obsessed."
            subtitle={
              totalCount > 0
                ? `${totalCount.toLocaleString()}+ verified reviews from real customers`
                : "Don't take our word for it."
            }
          />

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 h-48 animate-pulse">
                  <div className="flex gap-1 mb-3">{[...Array(5)].map((_, j) => <div key={j} className="w-3 h-3 rounded-full bg-gray-200" />)}</div>
                  <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <motion.div
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {reviews.slice(0, 6).map((review, i) => (
                <ReviewCard key={review._id || i} review={review} index={i} />
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  )
}

// ─── HomePage ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { data: pizzasData } = useQuery({
    queryKey: ['pizzas', 'featured'],
    queryFn:  () => pizzaService.getAll({ limit: 4, sort: 'rating' }),
    select:   (res) => res.data.data,
  })

  const featuredPizzas = pizzasData || MOCK_PIZZAS

  return (
    <div className="overflow-x-hidden">

      {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[90vh] bg-brand-dark flex items-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          <div className="absolute -right-32 -top-32 w-[700px] h-[700px] rounded-full border border-white/5" />
          <div className="absolute -right-16 -top-16 w-[600px] h-[600px] rounded-full border border-white/5" />
          <div className="absolute right-0 top-0  w-[500px] h-[500px] rounded-full border border-white/5" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-brand-red/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-orange-500/8 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div initial="hidden" animate="show" variants={staggerContainer}>
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-brand-red/15 border border-brand-red/30 text-brand-red text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
                <Flame size={14} className="fill-brand-red" />
                <span>Wood-fired. Always fresh.</span>
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl xl:text-7xl font-black text-white leading-[1.05] tracking-tight">
                Pizza the <br />
                <span className="text-brand-red italic">way it was</span>
                <br /> meant to be.
              </motion.h1>

              <motion.p variants={fadeUp} className="mt-6 text-gray-400 text-lg leading-relaxed max-w-md">
                Handcrafted with imported Italian flour, San Marzano tomatoes, and cheeses flown in weekly. Order in minutes, delivered in thirty.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-4 mt-8">
                <Link to="/menu" className="inline-flex items-center gap-2 bg-brand-red text-white font-bold px-8 py-4 rounded-2xl hover:bg-red-700 active:scale-95 transition-all text-base shadow-lg shadow-brand-red/30">
                  Order Now <ArrowRight size={18} />
                </Link>
                <Link to="/menu" className="inline-flex items-center gap-2 border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/10 active:scale-95 transition-all text-base">
                  View Menu
                </Link>
              </motion.div>

              <motion.div variants={fadeUp} className="flex items-center gap-4 mt-10 pt-8 border-t border-white/10">
                <div className="flex -space-x-2">
                  {['🧑','👩','👨','🧑','👩'].map((e, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-brand-red/20 border-2 border-brand-dark flex items-center justify-center text-sm">{e}</div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => <Star key={i} size={13} className="fill-amber-400 text-amber-400" />)}
                    <span className="text-white font-bold text-sm ml-1">4.9</span>
                  </div>
                  <p className="text-gray-400 text-xs mt-0.5">from 2,400+ happy customers</p>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.85, rotate: -6 }}
              animate={{ opacity: 1, scale: 1, rotate: -3 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              className="hidden lg:flex justify-center items-center"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-brand-red/20 rounded-full blur-3xl scale-110" />
                <img
                  src="https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=700&q=85"
                  alt="Featured pizza"
                  className="relative w-[460px] h-[460px] object-cover rounded-full border-4 border-white/10 shadow-2xl"
                />
                <motion.div
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 }}
                  className="absolute -bottom-4 -left-6 bg-white rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-brand-light rounded-xl flex items-center justify-center">
                    <Clock size={20} className="text-brand-red" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Avg. delivery</p>
                    <p className="text-brand-dark font-black text-lg leading-none">28 min</p>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.1 }}
                  className="absolute -top-4 -right-6 bg-brand-red rounded-2xl px-4 py-3 shadow-xl text-white"
                >
                  <p className="text-xs font-medium opacity-80">Orders today</p>
                  <p className="font-black text-xl leading-none">1,247</p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" className="w-full fill-white" preserveAspectRatio="none">
            <path d="M0,60 C360,0 1080,60 1440,20 L1440,60 Z" />
          </svg>
        </div>
      </section>

      {/* ═══ FEATURES ════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <motion.div key={title} variants={fadeUp} className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50 hover:bg-brand-light transition-colors group">
                <div className="w-11 h-11 bg-brand-red/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-brand-red transition-colors">
                  <Icon size={20} className="text-brand-red group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h3 className="font-bold text-brand-dark text-sm">{title}</h3>
                  <p className="text-gray-500 text-xs mt-1 leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ CATEGORIES ══════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={staggerContainer}>
            <SectionHeading label="Explore" title="Something for every craving." />
            <motion.div variants={staggerContainer} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {CATEGORIES.map(({ id, label, emoji, desc }) => (
                <motion.div key={id} variants={fadeUp}>
                  <Link to={`/menu?category=${id}`}
                    className="group relative flex flex-col items-center justify-center gap-3 p-8 rounded-3xl bg-gray-50 border border-transparent hover:border-brand-red/20 hover:bg-brand-light hover:shadow-lg transition-all duration-300 text-center">
                    <span className="text-5xl group-hover:scale-110 transition-transform duration-300 block">{emoji}</span>
                    <div>
                      <h3 className="font-black text-brand-dark text-lg">{label}</h3>
                      <p className="text-gray-400 text-xs mt-1">{desc}</p>
                    </div>
                    <ChevronRight size={16} className="text-brand-red opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══ FEATURED PIZZAS ═════════════════════════════════════════════════ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={staggerContainer}>
            <div className="flex items-end justify-between mb-12">
              <SectionHeading label="Most Loved" title={<>Our crowd<br />favourites.</>} />
              <Link to="/menu" className="hidden sm:inline-flex items-center gap-1.5 text-brand-red font-bold text-sm hover:gap-3 transition-all mb-3">
                Full menu <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredPizzas.map((pizza, i) => (
                <PizzaCard key={pizza._id} pizza={pizza} index={i} />
              ))}
            </div>
            <div className="text-center mt-10 sm:hidden">
              <Link to="/menu" className="btn-primary inline-flex items-center gap-2">
                See Full Menu <ArrowRight size={16} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ PROMO BANNER ════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="relative bg-brand-dark rounded-3xl overflow-hidden"
          >
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -right-24 -bottom-24 w-96 h-96 bg-brand-red/15 rounded-full blur-2xl" />
              <div className="absolute -left-12 -top-12 w-64 h-64 bg-white/3 rounded-full" />
            </div>
            <div className="relative grid grid-cols-1 lg:grid-cols-2">
              <div className="p-10 lg:p-16 flex flex-col justify-center">
                <span className="inline-block bg-brand-red/20 text-brand-red text-sm font-bold px-3 py-1 rounded-full mb-4 w-fit">
                  🎉 New Customer Offer
                </span>
                <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
                  First order?<br /><span className="text-brand-red">20% off.</span>
                </h2>
                <p className="text-gray-400 mt-4 leading-relaxed max-w-sm">
                  Use code <strong className="text-white font-mono bg-white/10 px-2 py-0.5 rounded">WELCOME20</strong> at checkout. Valid on any order over $20.
                </p>
                <Link to="/sign-up" className="mt-8 inline-flex items-center gap-2 bg-brand-red text-white font-bold px-8 py-4 rounded-2xl hover:bg-red-700 active:scale-95 transition-all w-fit shadow-lg shadow-brand-red/25">
                  Claim Your Discount <ArrowRight size={18} />
                </Link>
              </div>
              <div className="hidden lg:flex items-center justify-center p-10">
                <div className="relative">
                  <div className="absolute inset-0 bg-brand-red/20 rounded-full blur-2xl" />
                  <img
                    src="https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&q=80"
                    alt="Promo pizza"
                    className="relative w-80 h-80 object-cover rounded-full border-4 border-white/10"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ REAL REVIEWS ════════════════════════════════════════════════════ */}
      <ReviewsSection />

      {/* ═══ FINAL CTA ═══════════════════════════════════════════════════════ */}
      <section className="py-24 bg-white text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto px-4"
        >
          <span className="text-5xl block mb-6">🍕</span>
          <h2 className="text-4xl sm:text-5xl font-black text-brand-dark leading-tight">Ready to order?</h2>
          <p className="mt-4 text-gray-500 text-lg">Hot, fresh, and at your door in under 30 minutes.</p>
          <Link to="/menu" className="mt-8 inline-flex items-center gap-2 bg-brand-red text-white font-bold px-10 py-4 rounded-2xl hover:bg-red-700 active:scale-95 transition-all text-lg shadow-xl shadow-brand-red/30">
            Order Now <ArrowRight size={20} />
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  )
}
