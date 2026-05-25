import { useState, useEffect } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { joinOrderRoom } from '../services/socket'
import { useUser } from '@clerk/clerk-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, RotateCcw, Package, ChevronRight,
  CheckCircle, Star, X, Loader2, Send, ThumbsUp,
} from 'lucide-react'
import { useDispatch } from 'react-redux'
import { addItem } from '../features/cart/cartSlice'
import { orderService, reviewService } from '../services/api'
import { formatCurrency, formatDate, orderStatusColor, orderStatusLabel, generateCartId } from '../utils/helpers'
import OrderTracker from '../components/orders/OrderTracker'
import Footer from '../components/layout/Footer'
import toast from 'react-hot-toast'

// ─── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_ORDERS = [
  {
    _id: 'ord_001', orderNumber: 'PH-20260428-0042',
    status: 'delivered', paymentStatus: 'paid', orderType: 'delivery',
    total: 38.47, confirmedReceived: false,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    estimatedDelivery: new Date(Date.now() - 2 * 86400000 + 30 * 60000).toISOString(),
    items: [
      { pizza: 'p1', _id: 'i1', name: 'Truffle Funghi',  size: 'large',  crust: 'classic', quantity: 1, unitPrice: 18.99, subtotal: 18.99, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=120&q=70' },
      { pizza: 'p2', _id: 'i2', name: 'Diavola Picante', size: 'medium', crust: 'thin',    quantity: 1, unitPrice: 15.99, subtotal: 15.99, image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=120&q=70' },
    ],
    deliveryAddress: { street: '12 Oak Lane', city: 'Portland', state: 'OR', zip: '97201' },
    subtotal: 34.98, discount: 0, deliveryFee: 2.99, tax: 2.80,
  },
  {
    _id: 'ord_002', orderNumber: 'PH-20260425-0031',
    status: 'delivered', paymentStatus: 'paid', orderType: 'pickup',
    total: 26.48, confirmedReceived: true,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    estimatedDelivery: null,
    items: [
      { pizza: 'p3', _id: 'i3', name: 'Margherita Classica', size: 'large', crust: 'stuffed', quantity: 2, unitPrice: 12.99, subtotal: 25.98, image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=120&q=70' },
    ],
    deliveryAddress: null,
    subtotal: 25.98, discount: 0, deliveryFee: 0, tax: 2.08,
  },
]

const MOCK_ACTIVE = {
  _id: 'ord_active', orderNumber: 'PH-20260515-0067',
  status: 'preparing', paymentStatus: 'paid', orderType: 'delivery',
  total: 21.97, confirmedReceived: false,
  createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
  estimatedDelivery: new Date(Date.now() + 18 * 60000).toISOString(),
  items: [
    { pizza: 'p4', _id: 'i4', name: 'Garden Verde', size: 'medium', crust: 'thin', quantity: 1, unitPrice: 13.99, subtotal: 13.99, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=120&q=70' },
  ],
  deliveryAddress: { street: '12 Oak Lane', city: 'Portland', state: 'OR', zip: '97201' },
  subtotal: 13.99, discount: 0, deliveryFee: 2.99, tax: 1.12,
}

// ─── Star Rating Input ────────────────────────────────────────────────────────
function StarRating({ value, onChange, size = 28 }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            size={size}
            className={`transition-colors ${
              star <= (hovered || value)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-gray-100 text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

// ─── Review Modal ─────────────────────────────────────────────────────────────
function ReviewModal({ item, orderId, onClose }) {
  const qc              = useQueryClient()
  const { user: clerkUser } = useUser()
  const [rating, setRating]   = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const reviewMutation = useMutation({
    mutationFn: () => reviewService.add(item.pizza, { rating, comment, orderId, customerName: clerkUser?.fullName || clerkUser?.firstName || '' }),
    onSuccess: () => {
      setSubmitted(true)
      qc.invalidateQueries(['order', orderId])
      qc.invalidateQueries(['myOrders'])
      toast.success('Review submitted — thank you!')
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to submit review'
      toast.error(msg)
    },
  })

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!']

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <ThumbsUp size={28} className="text-green-500" />
          </motion.div>
          <h3 className="text-xl font-black text-brand-dark mb-2">Thanks for your review!</h3>
          <p className="text-gray-500 text-sm mb-6">Your feedback helps other customers discover great pizzas.</p>
          <button onClick={onClose} className="w-full btn-primary py-3">Done</button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-brand-dark text-lg">Rate your pizza</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Pizza info */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-brand-light shrink-0">
              {item.image
                ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-2xl">🍕</div>}
            </div>
            <div>
              <p className="font-bold text-brand-dark">{item.name}</p>
              <p className="text-xs text-gray-400 capitalize">{item.size} · {item.crust} crust</p>
            </div>
          </div>

          {/* Stars */}
          <div className="text-center py-2">
            <p className="text-sm font-semibold text-gray-600 mb-3">How would you rate this pizza?</p>
            <div className="flex justify-center mb-2">
              <StarRating value={rating} onChange={setRating} size={36} />
            </div>
            <p className={`text-sm font-bold transition-all ${rating ? 'text-amber-500 opacity-100' : 'opacity-0'}`}>
              {ratingLabels[rating]}
            </p>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Leave a comment <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="What did you love about it? Any suggestions?"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:border-brand-red transition"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{comment.length}/500</p>
          </div>

          {/* Submit */}
          <button
            onClick={() => reviewMutation.mutate()}
            disabled={!rating || reviewMutation.isPending}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {reviewMutation.isPending
              ? <><Loader2 size={16} className="animate-spin" /> Submitting…</>
              : <><Send size={16} /> Submit Review</>}
          </button>
          {!rating && (
            <p className="text-xs text-center text-gray-400 -mt-2">Please select a star rating to continue</p>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ─── Confirm Received Banner ──────────────────────────────────────────────────
function ConfirmReceivedBanner({ order, onConfirmed }) {
  const qc = useQueryClient()

  const confirmMutation = useMutation({
    mutationFn: () => orderService.confirmReceived(order._id),
    onSuccess: () => {
      qc.invalidateQueries(['order', order._id])
      qc.invalidateQueries(['myOrders'])
      onConfirmed()
      toast.success('Order confirmed received! You can now rate your pizzas.')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to confirm order'),
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">📦</span>
          <div>
            <p className="font-bold text-orange-800">Did you receive your order?</p>
            <p className="text-orange-600 text-sm mt-0.5">
              Confirm receipt to unlock the ability to rate and review your pizzas.
            </p>
          </div>
        </div>
        <button
          onClick={() => confirmMutation.mutate()}
          disabled={confirmMutation.isPending}
          className="shrink-0 flex items-center gap-2 bg-orange-500 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-60 text-sm whitespace-nowrap"
        >
          {confirmMutation.isPending
            ? <><Loader2 size={15} className="animate-spin" /> Confirming…</>
            : <><CheckCircle size={15} /> Yes, I received it</>}
        </button>
      </div>
    </motion.div>
  )
}

// ─── Review Section ───────────────────────────────────────────────────────────
function ReviewSection({ order }) {
  const [reviewingItem, setReviewingItem] = useState(null)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Star size={18} className="fill-amber-400 text-amber-400" />
        <h3 className="font-bold text-brand-dark">Rate Your Pizzas</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Share your experience to help other customers find great pizzas.
      </p>

      <div className="space-y-3">
        {order.items.map((item, i) => (
          <ReviewItemRow
            key={i}
            item={item}
            orderId={order._id}
            onReview={() => setReviewingItem(item)}
          />
        ))}
      </div>

      {/* Review modal */}
      <AnimatePresence>
        {reviewingItem && (
          <ReviewModal
            item={reviewingItem}
            orderId={order._id}
            onClose={() => setReviewingItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Single pizza row in review section ──────────────────────────────────────
function ReviewItemRow({ item, orderId, onReview }) {
  const { data: existingReview } = useQuery({
    queryKey: ['myReview', item.pizza, orderId],
    queryFn:  () => reviewService.getMyReview(item.pizza, orderId).then(r => r.data.data),
    staleTime: Infinity,
  })

  const alreadyReviewed = !!existingReview

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-brand-light shrink-0">
        {item.image
          ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-lg">🍕</div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-brand-dark truncate">{item.name}</p>
        {alreadyReviewed ? (
          <div className="flex items-center gap-1 mt-0.5">
            {[...Array(5)].map((_, j) => (
              <Star
                key={j}
                size={11}
                className={j < existingReview.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-200'}
              />
            ))}
            <span className="text-xs text-gray-400 ml-1">Your rating</span>
          </div>
        ) : (
          <p className="text-xs text-gray-400 mt-0.5">Not reviewed yet</p>
        )}
      </div>
      {alreadyReviewed ? (
        <span className="text-xs text-green-600 font-semibold flex items-center gap-1 shrink-0">
          <CheckCircle size={13} /> Reviewed
        </span>
      ) : (
        <button
          onClick={onReview}
          className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-brand-red bg-brand-light hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Star size={12} /> Rate it
        </button>
      )}
    </div>
  )
}

// ─── ORDER DETAIL ─────────────────────────────────────────────────────────────
function OrderDetail({ orderId }) {
  const dispatch   = useDispatch()
  const location   = useLocation()
  const justPlaced = location.state?.justPlaced
  const [showReviewPrompt, setShowReviewPrompt] = useState(false)

  // Join Socket.IO room for this order — enables live status updates
  useEffect(() => {
    if (orderId) joinOrderRoom(orderId)
  }, [orderId])

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn:  () => orderService.getById(orderId).then(r => r.data.data),
    placeholderData: orderId?.startsWith('demo') || orderId === 'ord_active'
      ? MOCK_ACTIVE
      : MOCK_ORDERS.find(o => o._id === orderId),
    refetchInterval: (data) =>
      ['received', 'preparing', 'ready', 'out_for_delivery'].includes(data?.status) ? 15000 : false,
  })

  const handleReorder = () => {
    order.items.forEach(item => {
      dispatch(addItem({
        cartId:          generateCartId(),
        pizzaId:         item.pizza || item._id,
        name:            item.name,
        image:           item.image,
        size:            item.size,
        crust:           item.crust,
        extraToppings:   item.extraToppings   || [],
        removedToppings: item.removedToppings || [],
        specialNote:     item.specialNote     || '',
        unitPrice:       item.unitPrice,
        quantity:        item.quantity,
      }))
    })
    toast.success('Items added to cart!')
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-48 bg-gray-100 rounded-2xl" />
        <div className="h-48 bg-gray-100 rounded-2xl" />
      </div>
    )
  }

  if (!order) return (
    <div className="text-center py-20">
      <p className="text-gray-400">Order not found.</p>
      <Link to="/orders" className="btn-primary inline-block mt-4">My Orders</Link>
    </div>
  )

  const isActive    = ['received', 'preparing', 'ready', 'out_for_delivery'].includes(order.status)
  const isDelivered = order.status === 'delivered'
  const needsConfirm= isDelivered && !order.confirmedReceived
  const canReview   = isDelivered && order.confirmedReceived

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Back */}
      <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-red transition-colors mb-6">
        <ArrowLeft size={15} /> All orders
      </Link>

      {/* ── Just placed banner ── */}
      {justPlaced && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex items-center gap-3"
        >
          <span className="text-2xl">🎉</span>
          <div>
            <p className="font-bold text-green-700">Order placed successfully!</p>
            <p className="text-green-600 text-sm">We're warming up the oven. You'll receive a confirmation email shortly.</p>
          </div>
        </motion.div>
      )}

      {/* ── Confirm received banner ── */}
      <AnimatePresence>
        {needsConfirm && (
          <div className="mb-5">
            <ConfirmReceivedBanner
              order={order}
              onConfirmed={() => setShowReviewPrompt(true)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* ── Review prompt after confirming ── */}
      <AnimatePresence>
        {showReviewPrompt && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3"
          >
            <span className="text-2xl">⭐</span>
            <div className="flex-1">
              <p className="font-bold text-amber-800">Thanks for confirming!</p>
              <p className="text-amber-700 text-sm">Scroll down to rate the pizzas you ordered.</p>
            </div>
            <button onClick={() => setShowReviewPrompt(false)} className="text-amber-400 hover:text-amber-600">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-brand-dark">{order.orderNumber}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{formatDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full capitalize ${orderStatusColor(order.status)}`}>
            {orderStatusLabel(order.status)}
          </span>
          {canReview && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
              <CheckCircle size={12} /> Received
            </span>
          )}
          {isDelivered && (
            <button onClick={handleReorder} className="flex items-center gap-1.5 text-sm text-brand-red font-semibold hover:underline">
              <RotateCcw size={14} /> Reorder
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-5">

          {/* Live tracker */}
          {isActive && (
            <OrderTracker status={order.status} estimatedDelivery={order.estimatedDelivery} />
          )}

          {/* Delivered tracker (full green) */}
          {isDelivered && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle size={20} className="text-green-500" />
                </div>
                <div>
                  <p className="font-bold text-green-700">
                    {canReview ? 'Order received & confirmed' : 'Order delivered'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {canReview
                      ? 'You confirmed receipt — rate your pizzas below'
                      : 'Confirm receipt below to unlock reviews'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Items ordered */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-brand-dark mb-4">Items Ordered</h3>
            <div className="space-y-4">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-brand-light shrink-0">
                    {item.image
                      ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">🍕</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-dark truncate">{item.name}</p>
                    <p className="text-xs text-gray-400 capitalize">
                      {item.size} · {item.crust} crust · ×{item.quantity}
                    </p>
                    {item.extraToppings?.length > 0 && (
                      <p className="text-xs text-gray-400">
                        + {item.extraToppings.map(t => t.name || t).join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-gray-700 shrink-0">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Review section — only after confirmedReceived ── */}
          {canReview && <ReviewSection order={order} />}

          {/* Delivery address */}
          {order.deliveryAddress && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-brand-dark mb-2">Delivery Address</h3>
              <p className="text-sm text-gray-500">
                {order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zip}
              </p>
            </div>
          )}
        </div>

        {/* Payment summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-fit">
          <h3 className="font-bold text-brand-dark mb-4">Payment Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            {order.discount > 0 && (
              <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(order.discount)}</span></div>
            )}
            <div className="flex justify-between text-gray-500"><span>Delivery</span><span>{formatCurrency(order.deliveryFee)}</span></div>
            <div className="flex justify-between text-gray-500"><span>Tax</span><span>{formatCurrency(order.tax)}</span></div>
            <div className="flex justify-between font-black text-brand-dark text-base pt-2 border-t border-gray-100">
              <span>Total</span><span>{formatCurrency(order.total)}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Payment</span>
              <span className={`font-semibold ${order.paymentStatus === 'paid' ? 'text-green-500' : 'text-gray-500'}`}>
                {order.paymentStatus === 'paid' ? '✓ Paid' : order.paymentStatus}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Type</span>
              <span className="font-semibold text-gray-600 capitalize">{order.orderType}</span>
            </div>
            {canReview && (
              <div className="flex justify-between text-xs text-gray-400">
                <span>Confirmed</span>
                <span className="font-semibold text-green-500">✓ Received</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ORDER LIST ───────────────────────────────────────────────────────────────
function OrderList() {
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['myOrders'],
    queryFn:  () => orderService.getMyOrders().then(r => r.data.data),
    placeholderData: [MOCK_ACTIVE, ...MOCK_ORDERS],
  })

  const orders = ordersData || [MOCK_ACTIVE, ...MOCK_ORDERS]

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-black text-brand-dark mb-8">My Orders</h1>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-28 animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <Package size={56} className="text-gray-200 mx-auto mb-4" />
          <h3 className="font-bold text-gray-600 text-lg">No orders yet</h3>
          <p className="text-gray-400 mt-1">Your order history will appear here.</p>
          <Link to="/menu" className="btn-primary inline-flex items-center gap-2 mt-5">
            Order Now <ChevronRight size={16} />
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, i) => (
            <motion.div
              key={order._id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                to={`/orders/${order._id}`}
                className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-brand-red/20 transition-all p-5"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-brand-dark text-sm">{order.orderNumber}</span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${orderStatusColor(order.status)}`}>
                        {orderStatusLabel(order.status)}
                      </span>
                      {/* Badges */}
                      {order.status === 'delivered' && !order.confirmedReceived && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-600">
                          Confirm Receipt
                        </span>
                      )}
                      {order.confirmedReceived && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-600 flex items-center gap-1">
                          <CheckCircle size={10} /> Received
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-black text-brand-dark">{formatCurrency(order.total)}</p>
                      <p className="text-xs text-gray-400">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                    </div>
                    <ChevronRight size={18} className="text-gray-300 shrink-0" />
                  </div>
                </div>

                {/* Item previews */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                  <div className="flex -space-x-2">
                    {order.items.slice(0, 4).map((item, j) => (
                      <div key={j} className="w-8 h-8 rounded-full overflow-hidden bg-brand-light border-2 border-white shrink-0">
                        {item.image
                          ? <img src={item.image} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-xs">🍕</div>}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    {order.items.map(i => i.name).join(', ')}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const { id } = useParams()
  return (
    <div className="min-h-screen bg-gray-50">
      {id ? <OrderDetail orderId={id} /> : <OrderList />}
      <Footer />
    </div>
  )
}
