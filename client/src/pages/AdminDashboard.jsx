import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import {
  LayoutDashboard, ShoppingBag, Pizza, Users,
  TrendingUp, Clock, CheckCircle, DollarSign,
  RefreshCw, Search, Plus, Pencil, Trash2,
  ToggleLeft, ToggleRight, X, Loader2,
  AlertTriangle, Star, ShieldCheck,
} from 'lucide-react'
import { orderService, pizzaService } from '../services/api'
import { formatCurrency, orderStatusColor, orderStatusLabel, ORDER_STATUSES } from '../utils/helpers'
import toast from 'react-hot-toast'

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ['classic', 'vegetarian', 'specialty', 'seasonal']

const MOCK_STATS = { ordersToday: 47, revenueToday: 892.40, activeOrders: 8, avgDelivery: 27 }

const MOCK_LIVE_ORDERS = [
  { _id: 'o1', orderNumber: 'PH-20260515-0067', status: 'preparing',        total: 21.97, createdAt: new Date(Date.now() - 12*60000).toISOString(), customer: 'Alice M.',  orderType: 'delivery' },
  { _id: 'o2', orderNumber: 'PH-20260515-0068', status: 'received',         total: 38.47, createdAt: new Date(Date.now() -  5*60000).toISOString(), customer: 'Bob K.',    orderType: 'delivery' },
  { _id: 'o3', orderNumber: 'PH-20260515-0069', status: 'out_for_delivery', total: 15.99, createdAt: new Date(Date.now() - 30*60000).toISOString(), customer: 'Sofia R.',  orderType: 'delivery' },
  { _id: 'o4', orderNumber: 'PH-20260515-0070', status: 'ready',            total: 26.48, createdAt: new Date(Date.now() -  8*60000).toISOString(), customer: 'James T.',  orderType: 'pickup'   },
  { _id: 'o5', orderNumber: 'PH-20260515-0071', status: 'preparing',        total: 44.96, createdAt: new Date(Date.now() -  3*60000).toISOString(), customer: 'Priya N.',  orderType: 'delivery' },
]

const MOCK_MENU = [
  { _id: 'm1', name: 'Margherita Classica', category: 'classic',    basePrice: 12.99, isAvailable: true,  description: 'San Marzano tomatoes, mozzarella, basil.', ratings: { average: 4.8, count: 312 }, images: ['https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=200&q=70'] },
  { _id: 'm2', name: 'Diavola Picante',     category: 'specialty',  basePrice: 15.99, isAvailable: true,  description: 'Spicy salami, nduja, roasted peppers.', ratings: { average: 4.9, count: 187 }, images: ['https://images.unsplash.com/photo-1628840042765-356cda07504e?w=200&q=70'] },
  { _id: 'm3', name: 'Garden Verde',        category: 'vegetarian', basePrice: 13.99, isAvailable: true,  description: 'Courgette, artichoke, burrata.', ratings: { average: 4.7, count: 224 }, images: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&q=70'] },
  { _id: 'm4', name: 'Truffle Funghi',      category: 'specialty',  basePrice: 18.99, isAvailable: false, description: 'Wild porcini, truffle oil, taleggio.', ratings: { average: 4.9, count: 156 }, images: ['https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&q=70'] },
  { _id: 'm5', name: 'Pepperoni Supreme',   category: 'classic',    basePrice: 14.99, isAvailable: true,  description: 'Double pepperoni, mozzarella, oregano.', ratings: { average: 4.8, count: 401 }, images: [] },
]

const NEXT_STATUS = {
  received: 'preparing', preparing: 'ready',
  ready: 'out_for_delivery', out_for_delivery: 'delivered',
}

// ─── Pizza form validation ────────────────────────────────────────────────────
const pizzaSchema = yup.object({
  name:        yup.string().required('Name is required').min(2, 'Min 2 characters'),
  category:    yup.string().oneOf(CATEGORIES, 'Select a category').required('Category is required'),
  basePrice:   yup.number().typeError('Must be a number').positive('Must be positive').required('Price is required'),
  description: yup.string().required('Description is required').min(10, 'At least 10 characters'),
  imageUrl:    yup.string().url('Must be a valid URL').nullable().transform(v => v === '' ? null : v),
})

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{   opacity: 0, scale: 0.95, y: 12  }}
        className={`relative w-full ${maxWidth} bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-brand-dark text-lg">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </motion.div>
    </div>
  )
}

// ─── CONFIRM DELETE ───────────────────────────────────────────────────────────
function ConfirmDeleteModal({ open, onClose, onConfirm, pizzaName, loading }) {
  return (
    <Modal open={open} onClose={onClose} title="Delete Pizza" maxWidth="max-w-sm">
      <div className="text-center py-2">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={26} className="text-red-500" />
        </div>
        <p className="text-gray-700 font-medium mb-1">
          Delete <span className="font-bold text-brand-dark">"{pizzaName}"</span>?
        </p>
        <p className="text-gray-400 text-sm mb-6">
          This cannot be undone. The item will be removed from the menu immediately.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Delete
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── PIZZA FORM ───────────────────────────────────────────────────────────────
function PizzaForm({ defaultValues, onSubmit, loading, submitLabel }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(pizzaSchema),
    defaultValues: defaultValues || { category: 'classic', imageUrl: '' },
  })

  const field = (label, name, type = 'text', placeholder = '', hint = '') => (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <input
        type={type}
        step={type === 'number' ? '0.01' : undefined}
        placeholder={placeholder}
        {...register(name)}
        className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:border-brand-red transition
          ${errors[name] ? 'border-red-400' : 'border-gray-300'}`}
      />
      {errors[name] && <p className="text-xs text-red-500 mt-1">{errors[name].message}</p>}
      {hint && !errors[name] && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {field('Pizza Name *', 'name', 'text', 'e.g. Quattro Formaggi')}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category *</label>
          <select
            {...register('category')}
            className={`w-full border rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:border-brand-red transition capitalize
              ${errors.category ? 'border-red-400' : 'border-gray-300'}`}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c} className="capitalize">{c}</option>
            ))}
          </select>
          {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category.message}</p>}
        </div>

        {field('Base Price ($) *', 'basePrice', 'number', '12.99')}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description *</label>
        <textarea
          rows={3}
          placeholder="Describe the ingredients and flavour profile…"
          {...register('description')}
          className={`w-full border rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:border-brand-red transition
            ${errors.description ? 'border-red-400' : 'border-gray-300'}`}
        />
        {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
      </div>

      {field(
        'Image URL',
        'imageUrl',
        'url',
        'https://images.unsplash.com/...',
        'Paste any direct image URL. Leave blank for default pizza icon.'
      )}

      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-red text-white font-bold py-3 rounded-xl hover:bg-red-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : submitLabel}
        </button>
      </div>
    </form>
  )
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-black text-brand-dark leading-none">{value}</p>
        <p className="text-sm font-medium text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  )
}

// ─── ORDERS TAB ───────────────────────────────────────────────────────────────
function OrdersTab() {
  const qc = useQueryClient()
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const { data: ordersData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['adminOrders'],
    queryFn:  () => orderService.getAll({ limit: 50 }).then(r => r.data.data),
    placeholderData: MOCK_LIVE_ORDERS,
    refetchInterval: 20000,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => orderService.updateStatus(id, { status }),
    onSuccess:  () => { qc.invalidateQueries(['adminOrders']); toast.success('Status updated') },
    onError:    () => toast.error('Failed to update status'),
  })

  const orders = (ordersData || MOCK_LIVE_ORDERS).filter(o => {
    const name = typeof o.customer === 'object' ? o.customer?.name : o.customer
    const matchSearch = !search || o.orderNumber.includes(search) || name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || o.status === filterStatus
    return matchSearch && matchStatus
  })

  const minutesAgo = (d) => Math.floor((Date.now() - new Date(d)) / 60000)

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by order # or customer…"
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red transition"
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-red/30">
          <option value="all">All Statuses</option>
          {ORDER_STATUSES.map(s => <option key={s} value={s}>{orderStatusLabel(s)}</option>)}
        </select>
        <button onClick={() => refetch()}
          className={`flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition ${isFetching ? 'opacity-60' : ''}`}>
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Order #', 'Customer', 'Type', 'Total', 'Time', 'Status', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-5 bg-gray-100 rounded animate-pulse w-full" /></td></tr>
              )) : orders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">No orders match your filters</td></tr>
              ) : orders.map(order => {
                const customerName = typeof order.customer === 'object' ? order.customer?.name : order.customer
                return (
                  <tr key={order._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-dark">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{customerName || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${order.orderType === 'delivery' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                        {order.orderType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-brand-dark">{formatCurrency(order.total)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{minutesAgo(order.createdAt)}m ago</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${orderStatusColor(order.status)}`}>
                        {orderStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {NEXT_STATUS[order.status] ? (
                        <button
                          onClick={() => updateMutation.mutate({ id: order._id, status: NEXT_STATUS[order.status] })}
                          disabled={updateMutation.isPending}
                          className="text-xs font-semibold px-3 py-1.5 bg-brand-dark text-white rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap disabled:opacity-50"
                        >
                          → {orderStatusLabel(NEXT_STATUS[order.status])}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300 flex items-center gap-1"><CheckCircle size={12} /> Done</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── MENU TAB — full CRUD ─────────────────────────────────────────────────────
function MenuTab() {
  const qc = useQueryClient()
  const [search,      setSearch]      = useState('')
  const [showAdd,     setShowAdd]     = useState(false)
  const [editPizza,   setEditPizza]   = useState(null)
  const [deletePizza, setDeletePizza] = useState(null)

  // Fetch
  const { data: pizzasData, isLoading } = useQuery({
    queryKey: ['adminPizzas'],
    queryFn:  () => pizzaService.getAll({ limit: 100 }).then(r => r.data.data),
    placeholderData: MOCK_MENU,
  })

  // Create
  const createMutation = useMutation({
    mutationFn: (data) => pizzaService.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['adminPizzas'])
      qc.invalidateQueries(['pizzas'])
      setShowAdd(false)
      toast.success('🍕 Pizza added to menu!')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create pizza'),
  })

  // Update
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => pizzaService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['adminPizzas'])
      qc.invalidateQueries(['pizzas'])
      setEditPizza(null)
      toast.success('Pizza updated!')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update pizza'),
  })

  // Toggle availability
  const toggleMutation = useMutation({
    mutationFn: ({ id, isAvailable }) => pizzaService.update(id, { isAvailable }),
    onSuccess: () => {
      qc.invalidateQueries(['adminPizzas'])
      qc.invalidateQueries(['pizzas'])
    },
    onError: () => toast.error('Failed to update availability'),
  })

  // Delete
  const deleteMutation = useMutation({
    mutationFn: (id) => pizzaService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(['adminPizzas'])
      qc.invalidateQueries(['pizzas'])
      setDeletePizza(null)
      toast.success('Pizza removed from menu')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete pizza'),
  })

  const buildPayload = (formData) => ({
    name:        formData.name.trim(),
    category:    formData.category,
    basePrice:   parseFloat(formData.basePrice),
    description: formData.description.trim(),
    images:      formData.imageUrl ? [formData.imageUrl.trim()] : [],
    isAvailable: true,
  })

  const handleCreate = (formData) => createMutation.mutate(buildPayload(formData))

  const handleUpdate = (formData) => {
    const payload = {
      name:        formData.name.trim(),
      category:    formData.category,
      basePrice:   parseFloat(formData.basePrice),
      description: formData.description.trim(),
      ...(formData.imageUrl ? { images: [formData.imageUrl.trim()] } : {}),
    }
    updateMutation.mutate({ id: editPizza._id, data: payload })
  }

  const pizzas = (pizzasData || MOCK_MENU).filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or category…"
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/30"
          />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-5 py-2 bg-brand-red text-white text-sm font-bold rounded-xl hover:bg-red-700 active:scale-95 transition-all shadow-sm shadow-brand-red/20 whitespace-nowrap"
        >
          <Plus size={16} /> Add New Pizza
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 h-64 animate-pulse" />
          ))}
        </div>
      ) : pizzas.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Pizza size={52} className="mx-auto mb-3 text-gray-200" />
          <p className="font-semibold">No pizzas found</p>
          <button onClick={() => setShowAdd(true)} className="mt-3 text-brand-red text-sm font-semibold hover:underline">
            Add your first pizza →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {pizzas.map(pizza => (
              <motion.div
                key={pizza._id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow ${!pizza.isAvailable ? 'opacity-60' : ''}`}
              >
                {/* Image */}
                <div className="relative h-40 bg-brand-light overflow-hidden">
                  {pizza.images?.[0] ? (
                    <img src={pizza.images[0]} alt={pizza.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl select-none">🍕</div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pizza.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {pizza.isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/90 text-gray-600 capitalize">
                      {pizza.category}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-brand-dark text-sm leading-snug">{pizza.name}</h3>
                    <span className="font-black text-brand-red text-base shrink-0">{formatCurrency(pizza.basePrice)}</span>
                  </div>

                  {pizza.ratings?.count > 0 && (
                    <div className="flex items-center gap-1 mb-1.5">
                      <Star size={11} className="fill-amber-400 text-amber-400" />
                      <span className="text-xs text-gray-500">{pizza.ratings.average.toFixed(1)} ({pizza.ratings.count} reviews)</span>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-3">{pizza.description}</p>

                  {/* Actions */}
                  <div className="flex items-center gap-1 pt-3 border-t border-gray-100">
                    {/* Toggle */}
                    <button
                      onClick={() => toggleMutation.mutate({ id: pizza._id, isAvailable: !pizza.isAvailable })}
                      disabled={toggleMutation.isPending}
                      title={pizza.isAvailable ? 'Mark as unavailable' : 'Mark as available'}
                      className="flex items-center gap-1 text-xs font-semibold py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors flex-1 justify-center"
                    >
                      {pizza.isAvailable
                        ? <><ToggleRight size={18} className="text-green-500" /><span className="text-green-600 hidden sm:inline">On</span></>
                        : <><ToggleLeft  size={18} className="text-gray-400" /><span className="text-gray-400 hidden sm:inline">Off</span></>}
                    </button>

                    <div className="w-px h-5 bg-gray-200" />

                    {/* Edit */}
                    <button
                      onClick={() => setEditPizza(pizza)}
                      title="Edit pizza"
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 py-1.5 px-3 rounded-lg transition-colors flex-1 justify-center"
                    >
                      <Pencil size={14} /> <span className="hidden sm:inline">Edit</span>
                    </button>

                    <div className="w-px h-5 bg-gray-200" />

                    {/* Delete */}
                    <button
                      onClick={() => setDeletePizza(pizza)}
                      title="Delete pizza"
                      className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:bg-red-50 py-1.5 px-3 rounded-lg transition-colors flex-1 justify-center"
                    >
                      <Trash2 size={14} /> <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Add Modal ── */}
      <AnimatePresence>
        {showAdd && (
          <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Pizza">
            <PizzaForm
              onSubmit={handleCreate}
              loading={createMutation.isPending}
              submitLabel="Add to Menu"
            />
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Edit Modal ── */}
      <AnimatePresence>
        {editPizza && (
          <Modal open={!!editPizza} onClose={() => setEditPizza(null)} title={`Edit — ${editPizza.name}`}>
            <PizzaForm
              defaultValues={{
                name:        editPizza.name,
                category:    editPizza.category,
                basePrice:   editPizza.basePrice,
                description: editPizza.description,
                imageUrl:    editPizza.images?.[0] || '',
              }}
              onSubmit={handleUpdate}
              loading={updateMutation.isPending}
              submitLabel="Save Changes"
            />
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Confirm Delete Modal ── */}
      <AnimatePresence>
        {deletePizza && (
          <ConfirmDeleteModal
            open={!!deletePizza}
            onClose={() => setDeletePizza(null)}
            onConfirm={() => deleteMutation.mutate(deletePizza._id)}
            pizzaName={deletePizza.name}
            loading={deleteMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── DASHBOARD TAB ────────────────────────────────────────────────────────────
function DashboardTab({ onNavigate }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={ShoppingBag} label="Orders Today"  value={MOCK_STATS.ordersToday}                   sub="+12% vs yesterday"  color="bg-brand-red"  index={0} />
        <StatCard icon={DollarSign}  label="Revenue Today" value={formatCurrency(MOCK_STATS.revenueToday)}  sub="from 47 orders"     color="bg-green-500"  index={1} />
        <StatCard icon={TrendingUp}  label="Active Orders" value={MOCK_STATS.activeOrders}                  sub="being prepared now" color="bg-orange-500" index={2} />
        <StatCard icon={Clock}       label="Avg Delivery"  value={`${MOCK_STATS.avgDelivery}m`}             sub="target: 30m"        color="bg-blue-500"   index={3} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-brand-dark text-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Live Orders
          </h2>
          <button onClick={() => onNavigate('orders')} className="text-sm text-brand-red font-semibold hover:underline">
            View all →
          </button>
        </div>
        <div className="space-y-3">
          {MOCK_LIVE_ORDERS.filter(o => ['received','preparing','ready','out_for_delivery'].includes(o.status)).map(order => (
            <div key={order._id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${orderStatusColor(order.status)}`}>
                  {orderStatusLabel(order.status)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-dark truncate">{order.orderNumber}</p>
                  <p className="text-xs text-gray-400">{order.customer}</p>
                </div>
              </div>
              <span className="font-bold text-brand-dark text-sm shrink-0">{formatCurrency(order.total)}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders',    label: 'Orders',    icon: ShoppingBag     },
  { id: 'menu',      label: 'Menu',      icon: Pizza           },
  { id: 'users',     label: 'Users',     icon: Users           },
]

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-brand-dark border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <span className="text-white font-bold flex items-center gap-2 text-sm">
              🍕 PizzaHub <span className="text-white/40">·</span><span className="text-white/60">Admin</span>
            </span>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Live
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap
                ${activeTab === id ? 'bg-brand-red text-white shadow-md shadow-brand-red/20' : 'text-gray-500 hover:bg-white hover:text-gray-700'}`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <DashboardTab onNavigate={setActiveTab} />
            </motion.div>
          )}
          {activeTab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-black text-brand-dark">Order Management</h2>
                <span className="text-sm text-gray-400">Auto-refreshes every 20s</span>
              </div>
              <OrdersTab />
            </motion.div>
          )}
          {activeTab === 'menu' && (
            <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-black text-brand-dark">Menu Management</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Add, edit, delete, and toggle pizza availability</p>
                </div>
              </div>
              <MenuTab />
            </motion.div>
          )}
          {activeTab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="text-center py-20 text-gray-400">
                <Users size={52} className="mx-auto mb-3 text-gray-200" />
                <p className="font-semibold text-gray-600">User Management</p>
                <p className="text-sm mt-1">Manage users directly in the Clerk Dashboard</p>
                <a
                  href="https://dashboard.clerk.com"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-brand-dark text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
                >
                  Open Clerk Dashboard →
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
