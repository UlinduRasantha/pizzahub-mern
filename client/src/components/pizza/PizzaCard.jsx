import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Star, Plus } from 'lucide-react'
import { useCart } from '../../hooks'
import { formatCurrency } from '../../utils/helpers'

export default function PizzaCard({ pizza, index = 0 }) {
  const { addToCart } = useCart()

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      className="group relative bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-brand-red/30 hover:shadow-[0_8px_40px_rgba(192,57,43,0.12)] transition-all duration-300"
    >
      {/* Image */}
      <Link to={`/menu/${pizza._id}`} className="block overflow-hidden aspect-[4/3] bg-brand-light relative">
        {pizza.images?.[0] ? (
          <img
            src={pizza.images[0]}
            alt={pizza.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">🍕</div>
        )}
        {/* Category badge */}
        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-brand-red text-xs font-semibold px-2.5 py-1 rounded-full capitalize">
          {pizza.category}
        </span>
      </Link>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <Link to={`/menu/${pizza._id}`}>
            <h3 className="font-bold text-gray-900 group-hover:text-brand-red transition-colors leading-snug">
              {pizza.name}
            </h3>
          </Link>
          <span className="text-brand-red font-bold text-lg whitespace-nowrap">
            {formatCurrency(pizza.basePrice)}
          </span>
        </div>

        {pizza.ratings?.count > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <Star size={13} className="fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium text-gray-700">{pizza.ratings.average.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({pizza.ratings.count})</span>
          </div>
        )}

        <p className="text-sm text-gray-500 line-clamp-2 mb-4 leading-relaxed">
          {pizza.description}
        </p>

        <button
          onClick={() => addToCart(pizza)}
          className="w-full flex items-center justify-center gap-2 bg-brand-red text-white font-semibold text-sm py-2.5 rounded-xl hover:bg-red-700 active:scale-95 transition-all duration-150"
        >
          <Plus size={16} /> Add to Cart
        </button>
      </div>
    </motion.div>
  )
}
