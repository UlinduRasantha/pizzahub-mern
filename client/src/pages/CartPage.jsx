import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Plus, Minus, Tag, ArrowRight, ShoppingCart, X, Loader2 } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useSelector as useReduxSelector } from 'react-redux'
import { selectCartItems, selectCoupon, removeItem, updateQuantity, applyCoupon, removeCoupon, clearCart } from '../features/cart/cartSlice'
import { useAuth } from '@clerk/clerk-react'
import { formatCurrency, calcCartTotals } from '../utils/helpers'
import Footer from '../components/layout/Footer'

// Mock valid coupons (backend validates in real app)
const VALID_COUPONS = {
  'WELCOME20': { type: 'percent', value: 20, label: '20% off your order' },
  'FLAT5':     { type: 'flat',    value: 5,  label: '$5 off your order'  },
}

function CartItemRow({ item }) {
  const dispatch = useDispatch()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="flex gap-4 py-5 border-b border-gray-100 last:border-0"
    >
      {/* Image */}
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-brand-light shrink-0">
        {item.image
          ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-3xl">🍕</div>
        }
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-brand-dark text-sm leading-tight">{item.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5 capitalize">{item.size} · {item.crust} crust</p>
            {item.extraToppings?.length > 0 && (
              <p className="text-xs text-gray-400">+ {item.extraToppings.map(t => t.name).join(', ')}</p>
            )}
            {item.removedToppings?.length > 0 && (
              <p className="text-xs text-red-400 line-through">{item.removedToppings.join(', ')}</p>
            )}
            {item.specialNote && (
              <p className="text-xs text-gray-400 italic mt-0.5">"{item.specialNote}"</p>
            )}
          </div>
          <button onClick={() => dispatch(removeItem(item.cartId))} className="text-gray-300 hover:text-red-400 transition-colors shrink-0 p-1">
            <Trash2 size={15} />
          </button>
        </div>

        {/* Quantity + price */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-1.5 py-0.5">
            <button
              onClick={() => {
                if (item.quantity === 1) dispatch(removeItem(item.cartId))
                else dispatch(updateQuantity({ cartId: item.cartId, quantity: item.quantity - 1 }))
              }}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
            >
              <Minus size={12} />
            </button>
            <span className="text-sm font-bold text-brand-dark w-5 text-center">{item.quantity}</span>
            <button
              onClick={() => dispatch(updateQuantity({ cartId: item.cartId, quantity: item.quantity + 1 }))}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
            >
              <Plus size={12} />
            </button>
          </div>
          <span className="font-bold text-brand-dark text-sm">{formatCurrency(item.unitPrice * item.quantity)}</span>
        </div>
      </div>
    </motion.div>
  )
}

export default function CartPage() {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const items     = useSelector(selectCartItems)
  const coupon    = useSelector(selectCoupon)
  const { isSignedIn: isAuth } = useAuth()

  const [couponInput, setCouponInput]     = useState('')
  const [couponError, setCouponError]     = useState('')
  const [couponLoading, setCouponLoading] = useState(false)

  const DELIVERY_FEE = items.length > 0 ? 2.99 : 0
  const { subtotal, discount, tax, total } = calcCartTotals(items, coupon, DELIVERY_FEE)

  const handleApplyCoupon = async () => {
    setCouponError('')
    setCouponLoading(true)
    await new Promise(r => setTimeout(r, 600)) // simulate API call
    const found = VALID_COUPONS[couponInput.toUpperCase()]
    if (found) {
      dispatch(applyCoupon({ ...found, code: couponInput.toUpperCase() }))
      setCouponInput('')
    } else {
      setCouponError('Invalid or expired coupon code')
    }
    setCouponLoading(false)
  }

  const handleCheckout = () => {
    if (!isAuth) navigate('/login', { state: { from: { pathname: '/checkout' } } })
    else navigate('/checkout')
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <ShoppingCart size={64} className="text-gray-200 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-brand-dark">Your cart is empty</h2>
            <p className="text-gray-500 mt-2">Add some delicious pizzas to get started.</p>
            <Link to="/menu" className="btn-primary inline-flex items-center gap-2 mt-6">
              Browse Menu <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black text-brand-dark">Your Cart</h1>
          <button onClick={() => dispatch(clearCart())} className="text-sm text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1">
            <X size={14} /> Clear all
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">

          {/* ── Items ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-2">
            <AnimatePresence initial={false}>
              {items.map(item => <CartItemRow key={item.cartId} item={item} />)}
            </AnimatePresence>

            <div className="py-4">
              <Link to="/menu" className="text-brand-red text-sm font-semibold hover:underline flex items-center gap-1">
                + Add more items
              </Link>
            </div>
          </div>

          {/* ── Summary ── */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-brand-dark text-lg mb-5">Order Summary</h2>

              {/* Coupon */}
              <div className="mb-5">
                {coupon ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
                      <Tag size={14} />
                      <span>{coupon.code}</span>
                      <span className="text-xs font-normal text-green-600">({coupon.label})</span>
                    </div>
                    <button onClick={() => dispatch(removeCoupon())} className="text-green-400 hover:text-green-600">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={e => { setCouponInput(e.target.value); setCouponError('') }}
                        onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                        placeholder="Coupon code"
                        className="flex-1 input-field text-sm py-2"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={!couponInput || couponLoading}
                        className="px-4 py-2 bg-brand-dark text-white text-sm font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                      >
                        {couponLoading ? <Loader2 size={14} className="animate-spin" /> : <Tag size={14} />}
                        Apply
                      </button>
                    </div>
                    {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
                    <p className="text-xs text-gray-400 mt-1.5">Try: WELCOME20 or FLAT5</p>
                  </div>
                )}
              </div>

              {/* Line items */}
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span><span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Delivery fee</span><span>{formatCurrency(DELIVERY_FEE)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax (8%)</span><span>{formatCurrency(tax)}</span>
                </div>
                <div className="border-t border-gray-100 pt-2.5 flex justify-between font-black text-brand-dark text-base">
                  <span>Total</span><span>{formatCurrency(total)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3.5 text-base mt-5 shadow-lg shadow-brand-red/20"
              >
                {isAuth ? 'Proceed to Checkout' : 'Sign in to Checkout'}
                <ArrowRight size={18} />
              </button>

              {!isAuth && (
                <p className="text-xs text-center text-gray-400 mt-2">
                  Your cart is saved — sign in to complete your order.
                </p>
              )}
            </div>

            {/* Trust badges */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-2 text-xs text-gray-500">
              {['🔒 Secure checkout via Stripe', '🚚 Free delivery on orders over $30', '⏱️ 30-minute delivery guarantee'].map(t => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
