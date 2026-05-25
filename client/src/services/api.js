import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
})

// Clerk token injector — set once from App.jsx after session is available
let _getToken = null
export const setClerkGetToken = (fn) => { _getToken = fn }

// Attach Clerk session token to every outgoing request
api.interceptors.request.use(async (config) => {
  if (_getToken) {
    try {
      const token = await _getToken()
      if (token) config.headers.Authorization = `Bearer ${token}`
    } catch { /* session not ready yet */ }
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
)

export default api

// ─── Service modules ──────────────────────────────────────────────────────────

export const pizzaService = {
  getAll:    (params) => api.get('/pizzas', { params }),
  getById:   (id)     => api.get(`/pizzas/${id}`),
  create:    (data)   => api.post('/pizzas', data),
  update:    (id, d)  => api.patch(`/pizzas/${id}`, d),
  delete:    (id)     => api.delete(`/pizzas/${id}`),
  getReviews:(id)     => api.get(`/pizzas/${id}/reviews`),
  addReview: (id, d)  => api.post(`/pizzas/${id}/reviews`, d),
}

export const orderService = {
  createPaymentIntent: (amount) => api.post('/orders/create-payment-intent', { amount }),
  create:              (d)      => api.post('/orders', d),
  getMyOrders:         ()       => api.get('/orders/my'),
  getById:             (id)     => api.get(`/orders/${id}`),
  cancel:              (id)     => api.patch(`/orders/${id}/cancel`),
  confirmReceived:     (id)     => api.patch(`/orders/${id}/confirm-received`),
  getAll:              (params) => api.get('/orders', { params }),
  updateStatus:        (id, d)  => api.patch(`/orders/${id}/status`, d),
}

export const reviewService = {
  add:       (pizzaId, data)         => api.post(`/pizzas/${pizzaId}/reviews`, data),
  getAll:    (pizzaId)               => api.get(`/pizzas/${pizzaId}/reviews`),
  getMyReview:(pizzaId, orderId)     => api.get(`/pizzas/${pizzaId}/my-review`, { params: { orderId } }),
}

export const profileService = {
  getMe:    ()  => api.get('/profile/me'),
  updateMe: (d) => api.patch('/profile/me', d),
}
