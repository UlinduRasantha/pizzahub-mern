import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { motion, AnimatePresence } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import {
  MapPin, Clock, CreditCard, ChevronRight, ChevronLeft,
  Check, Loader2, ShieldCheck, ArrowLeft
} from 'lucide-react'
import { selectCartItems, selectCoupon, clearCart } from '../features/cart/cartSlice'
import { formatCurrency, calcCartTotals } from '../utils/helpers'
import { orderService } from '../services/api'
import toast from 'react-hot-toast'
import Footer from '../components/layout/Footer'

// ─── Stripe setup ─────────────────────────────────────────────────────────────
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

const stripeAppearance = {
  theme: 'stripe',
  variables: {
    colorPrimary:    '#C0392B',
    colorBackground: '#ffffff',
    colorText:       '#1A1A2E',
    borderRadius:    '12px',
    fontFamily:      'Plus Jakarta Sans, sans-serif',
  },
}

// ─── Validation schemas ───────────────────────────────────────────────────────
const deliverySchema = yup.object({
  orderType:    yup.string().oneOf(['delivery', 'pickup']).required(),
  street:       yup.string().when('orderType', { is: 'delivery', then: s => s.required('Street is required') }),
  city:         yup.string().when('orderType', { is: 'delivery', then: s => s.required('City is required') }),
  state:        yup.string().when('orderType', { is: 'delivery', then: s => s.required('State is required') }),
  zip:          yup.string().when('orderType', { is: 'delivery', then: s => s.matches(/^\d{5}$/, 'Enter a valid ZIP').required('ZIP is required') }),
  scheduledFor: yup.string().required('Choose a delivery time'),
})

// ─── Time slots ───────────────────────────────────────────────────────────────
function getTimeSlots() {
  const slots = [{ value: 'asap', label: 'ASAP (25–35 min)' }]
  const now = new Date()
  for (let i = 1; i <= 6; i++) {
    const t  = new Date(now.getTime() + i * 30 * 60000)
    const hh = t.getHours().toString().padStart(2, '0')
    const mm = t.getMinutes() < 30 ? '00' : '30'
    slots.push({ value: `${hh}:${mm}`, label: `${hh}:${mm}` })
  }
  return slots
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ step }) {
  const steps = ['Delivery', 'Payment', 'Confirm']
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all
              ${i < step  ? 'bg-green-500 text-white' :
                i === step ? 'bg-brand-red text-white ring-4 ring-brand-red/20' :
                             'bg-gray-100 text-gray-400'}`}>
              {i < step ? <Check size={15} /> : i + 1}
            </div>
            <span className={`text-xs font-semibold ${i === step ? 'text-brand-red' : 'text-gray-400'}`}>{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-16 sm:w-24 h-0.5 mx-1 mb-4 transition-colors ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Order summary sidebar ────────────────────────────────────────────────────
function OrderSummary({ items, coupon }) {
  const DELIVERY_FEE = 2.99
  const { subtotal, discount, tax, total } = calcCartTotals(items, coupon, DELIVERY_FEE)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
      <h3 className="font-bold text-brand-dark mb-4">Order Summary</h3>
      <div className="space-y-3 mb-4 max-h-56 overflow-y-auto pr-1">
        {items.map(item => (
          <div key={item.cartId} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-brand-light shrink-0">
              {item.image
                ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-lg">🍕</div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-brand-dark truncate">{item.name}</p>
              <p className="text-xs text-gray-400 capitalize">{item.size} · ×{item.quantity}</p>
            </div>
            <span className="text-xs font-bold text-gray-700 shrink-0">{formatCurrency(item.unitPrice * item.quantity)}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
        {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(discount)}</span></div>}
        <div className="flex justify-between text-gray-500"><span>Delivery</span><span>{formatCurrency(DELIVERY_FEE)}</span></div>
        <div className="flex justify-between text-gray-500"><span>Tax</span><span>{formatCurrency(tax)}</span></div>
        <div className="flex justify-between font-black text-brand-dark text-base pt-2 border-t border-gray-100">
          <span>Total</span><span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Step 1: Delivery ─────────────────────────────────────────────────────────
function DeliveryStep({ onNext, defaultValues }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: yupResolver(deliverySchema),
    defaultValues: defaultValues || { orderType: 'delivery', scheduledFor: 'asap' },
  })
  const orderType = watch('orderType')
  const timeSlots = getTimeSlots()

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      {/* Order type */}
      <div>
        <p className="text-sm font-bold text-brand-dark mb-3">How would you like to receive your order?</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'delivery', label: 'Delivery', emoji: '🚚', desc: 'To your door' },
            { value: 'pickup',   label: 'Pick Up',  emoji: '🏪', desc: 'At the restaurant' },
          ].map(opt => (
            <label key={opt.value} className={`cursor-pointer flex items-center gap-3 p-4 rounded-xl border-2 transition-all
              ${watch('orderType') === opt.value ? 'border-brand-red bg-brand-light' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" value={opt.value} {...register('orderType')} className="sr-only" />
              <span className="text-2xl">{opt.emoji}</span>
              <div>
                <p className="font-bold text-brand-dark text-sm">{opt.label}</p>
                <p className="text-xs text-gray-400">{opt.desc}</p>
              </div>
              {watch('orderType') === opt.value && <Check size={16} className="text-brand-red ml-auto" />}
            </label>
          ))}
        </div>
      </div>

      {/* Delivery address */}
      <AnimatePresence>
        {orderType === 'delivery' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="text-sm font-bold text-brand-dark mb-3 flex items-center gap-1.5">
              <MapPin size={14} className="text-brand-red" /> Delivery Address
            </p>
            <div className="space-y-3">
              <div>
                <input {...register('street')} placeholder="Street address"
                  className={`input-field ${errors.street ? 'border-red-400' : ''}`} />
                {errors.street && <p className="text-xs text-red-500 mt-1">{errors.street.message}</p>}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <input {...register('city')} placeholder="City"
                    className={`input-field ${errors.city ? 'border-red-400' : ''}`} />
                  {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city.message}</p>}
                </div>
                <div>
                  <input {...register('state')} placeholder="State"
                    className={`input-field ${errors.state ? 'border-red-400' : ''}`} />
                  {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state.message}</p>}
                </div>
                <div>
                  <input {...register('zip')} placeholder="ZIP"
                    className={`input-field ${errors.zip ? 'border-red-400' : ''}`} />
                  {errors.zip && <p className="text-xs text-red-500 mt-1">{errors.zip.message}</p>}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Time slot */}
      <div>
        <p className="text-sm font-bold text-brand-dark mb-3 flex items-center gap-1.5">
          <Clock size={14} className="text-brand-red" />
          {orderType === 'delivery' ? 'Delivery' : 'Pickup'} Time
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {timeSlots.map(slot => (
            <label key={slot.value} className={`cursor-pointer text-center text-xs font-semibold px-2 py-2.5 rounded-xl border-2 transition-all
              ${watch('scheduledFor') === slot.value ? 'border-brand-red bg-brand-light text-brand-red' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              <input type="radio" value={slot.value} {...register('scheduledFor')} className="sr-only" />
              {slot.label}
            </label>
          ))}
        </div>
        {errors.scheduledFor && <p className="text-xs text-red-500 mt-1">{errors.scheduledFor.message}</p>}
      </div>

      <button type="submit" className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-base">
        Continue to Payment <ChevronRight size={18} />
      </button>
    </form>
  )
}

// ─── Step 2: Payment (real Stripe Elements) ───────────────────────────────────
function PaymentStep({ onSuccess, onBack, total }) {
  const stripe   = useStripe()
  const elements = useElements()
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError('')

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      })

      if (stripeError) {
        setError(stripeError.message)
        setLoading(false)
        return
      }

      // Payment confirmed — hand the real paymentIntent.id to the parent
      onSuccess(paymentIntent.id)
    } catch (err) {
      setError('Payment failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">
        <ShieldCheck size={15} className="text-green-500" />
        <span>Secured by Stripe — your card details never touch our servers</span>
      </div>

      {/* Stripe's hosted, PCI-compliant card UI */}
      <div className="border border-gray-200 rounded-xl p-4 bg-white">
        <PaymentElement
          options={{
            layout: 'tabs',
            wallets: { applePay: 'auto', googlePay: 'auto' },
          }}
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 btn-primary py-3.5 flex items-center justify-center gap-2 text-base disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading
            ? <><Loader2 size={18} className="animate-spin" /> Processing…</>
            : <><CreditCard size={18} /> Pay {formatCurrency(total)}</>}
        </button>
      </div>
    </form>
  )
}

// ─── Step 3: Placing order spinner ────────────────────────────────────────────
function PlacingOrder() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-16"
    >
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-brand-red/20" />
        <div className="absolute inset-0 rounded-full border-4 border-brand-red border-t-transparent animate-spin" />
        <span className="absolute inset-0 flex items-center justify-center text-3xl">🍕</span>
      </div>
      <h3 className="text-xl font-black text-brand-dark">Placing your order…</h3>
      <p className="text-gray-400 mt-2 text-sm">Confirming payment and firing up the oven</p>
    </motion.div>
  )
}

// ─── CheckoutPage ─────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const items    = useSelector(selectCartItems)
  const coupon   = useSelector(selectCoupon)

  const [step,         setStep]         = useState(0)
  const [deliveryData, setDeliveryData] = useState(null)
  const [clientSecret, setClientSecret] = useState(null)
  const [placing,      setPlacing]      = useState(false)

  const DELIVERY_FEE = 2.99
  const { total } = calcCartTotals(items, coupon, DELIVERY_FEE)

  // Step 1 complete — fetch Stripe PaymentIntent before showing card form
  const handleDeliveryNext = async (data) => {
    setDeliveryData(data)
    try {
      const amountInCents = Math.round(total * 100)
      const { data: res } = await orderService.createPaymentIntent(amountInCents)
      setClientSecret(res.data.clientSecret)
      setStep(1)
    } catch (err) {
      toast.error('Could not initialise payment. Please try again.')
    }
  }

  // Step 2 complete — Stripe confirmed payment, now create order in our DB
  const handlePaymentSuccess = async (stripePaymentId) => {
    setPlacing(true)
    setStep(2)
    try {
      const payload = {
        items: items.map(i => ({
          pizza:           i.pizzaId,
          name:            i.name,
          size:            i.size,
          crust:           i.crust,
          extraToppings:   i.extraToppings,
          removedToppings: i.removedToppings,
          specialNote:     i.specialNote,
          quantity:        i.quantity,
          unitPrice:       i.unitPrice,
          subtotal:        i.unitPrice * i.quantity,
        })),
        orderType:       deliveryData.orderType,
        deliveryAddress: deliveryData.orderType === 'delivery' ? {
          street: deliveryData.street,
          city:   deliveryData.city,
          state:  deliveryData.state,
          zip:    deliveryData.zip,
        } : null,
        scheduledFor:    deliveryData.scheduledFor,
        couponCode:      coupon?.code,
        stripePaymentId,   // real pi_xxx from Stripe
      }
      const { data } = await orderService.create(payload)
      dispatch(clearCart())
      navigate(`/orders/${data.data._id}`, { state: { justPlaced: true } })
    } catch (err) {
      toast.error('Order failed. Your card has not been charged.')
      setPlacing(false)
      setStep(1)
    }
  }

  if (items.length === 0 && !placing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-4">🍕</p>
          <h2 className="text-xl font-bold text-brand-dark">Your cart is empty</h2>
          <Link to="/menu" className="btn-primary inline-block mt-4">Browse Menu</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/cart" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-black text-brand-dark">Checkout</h1>
        </div>

        <StepIndicator step={step} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">

          {/* ── Form area ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <AnimatePresence mode="wait">

              {/* Step 0 — Delivery */}
              {step === 0 && (
                <motion.div
                  key="delivery"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h2 className="text-xl font-black text-brand-dark mb-6 flex items-center gap-2">
                    <MapPin size={20} className="text-brand-red" /> Delivery Details
                  </h2>
                  <DeliveryStep onNext={handleDeliveryNext} defaultValues={deliveryData} />
                </motion.div>
              )}

              {/* Step 1 — Payment (only renders once clientSecret is ready) */}
              {step === 1 && clientSecret && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h2 className="text-xl font-black text-brand-dark mb-6 flex items-center gap-2">
                    <CreditCard size={20} className="text-brand-red" /> Payment
                  </h2>
                  <Elements
                    stripe={stripePromise}
                    options={{ clientSecret, appearance: stripeAppearance }}
                  >
                    <PaymentStep
                      onSuccess={handlePaymentSuccess}
                      onBack={() => setStep(0)}
                      total={total}
                    />
                  </Elements>
                </motion.div>
              )}

              {/* Step 2 — Placing order */}
              {step === 2 && (
                <motion.div
                  key="placing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <PlacingOrder />
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* ── Order summary sidebar ── */}
          <OrderSummary items={items} coupon={coupon} />
        </div>
      </div>
      <Footer />
    </div>
  )
}
