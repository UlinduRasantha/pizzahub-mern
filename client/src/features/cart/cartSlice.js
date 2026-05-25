import { createSlice } from '@reduxjs/toolkit'

const loadFromStorage = () => {
  try { return JSON.parse(localStorage.getItem('cart')) || [] }
  catch { return [] }
}

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: loadFromStorage(), coupon: null },
  reducers: {
    addItem: (state, { payload }) => {
      const existing = state.items.find(
        (i) => i.pizzaId === payload.pizzaId && i.size === payload.size && i.crust === payload.crust
      )
      if (existing) {
        existing.quantity += payload.quantity || 1
      } else {
        state.items.push({ ...payload, quantity: payload.quantity || 1 })
      }
      localStorage.setItem('cart', JSON.stringify(state.items))
    },
    removeItem: (state, { payload }) => {
      state.items = state.items.filter((i) => i.cartId !== payload)
      localStorage.setItem('cart', JSON.stringify(state.items))
    },
    updateQuantity: (state, { payload: { cartId, quantity } }) => {
      const item = state.items.find((i) => i.cartId === cartId)
      if (item) item.quantity = quantity
      localStorage.setItem('cart', JSON.stringify(state.items))
    },
    applyCoupon: (state, { payload }) => { state.coupon = payload },
    removeCoupon: (state) => { state.coupon = null },
    clearCart: (state) => {
      state.items = []
      state.coupon = null
      localStorage.removeItem('cart')
    },
  },
})

export const { addItem, removeItem, updateQuantity, applyCoupon, removeCoupon, clearCart } = cartSlice.actions
export default cartSlice.reducer

// Selectors
export const selectCartItems    = (state) => state.cart.items
export const selectCartCount    = (state) => state.cart.items.reduce((sum, i) => sum + i.quantity, 0)
export const selectCartSubtotal = (state) => state.cart.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
export const selectCoupon       = (state) => state.cart.coupon
