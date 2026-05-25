// ─── Currency ────────────────────────────────────────────────────────────────
export const formatCurrency = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)

// ─── Date ────────────────────────────────────────────────────────────────────
export const formatDate = (date) =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))

// ─── Order ───────────────────────────────────────────────────────────────────
export const ORDER_STATUSES = ['received', 'preparing', 'ready', 'out_for_delivery', 'delivered']

export const orderStatusLabel = (status) => ({
  received:         'Order Received',
  preparing:        'Being Prepared',
  ready:            'Ready for Pickup',
  out_for_delivery: 'Out for Delivery',
  delivered:        'Delivered',
  cancelled:        'Cancelled',
}[status] ?? status)

export const orderStatusColor = (status) => ({
  received:         'bg-blue-100  text-blue-700',
  preparing:        'bg-yellow-100 text-yellow-700',
  ready:            'bg-purple-100 text-purple-700',
  out_for_delivery: 'bg-orange-100 text-orange-700',
  delivered:        'bg-green-100  text-green-700',
  cancelled:        'bg-red-100    text-red-700',
}[status] ?? 'bg-gray-100 text-gray-700')

// ─── Cart ────────────────────────────────────────────────────────────────────
export const generateCartId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export const calcCartTotals = (items, coupon = null, deliveryFee = 2.99) => {
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const discount = coupon?.type === 'percent'
    ? subtotal * (coupon.value / 100)
    : coupon?.type === 'flat' ? coupon.value : 0
  const tax      = (subtotal - discount) * 0.08
  const total    = subtotal - discount + tax + deliveryFee
  return { subtotal, discount, tax, deliveryFee, total }
}

// ─── Validation helpers ──────────────────────────────────────────────────────
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
