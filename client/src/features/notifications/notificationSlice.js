import { createSlice } from '@reduxjs/toolkit'

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],   // { id, title, body, type, orderId, orderNumber, timestamp, read }
  },
  reducers: {
    addNotification: (state, { payload }) => {
      state.items.unshift({
        id:        Date.now(),
        read:      false,
        timestamp: new Date().toISOString(),
        ...payload,
      })
      if (state.items.length > 20) state.items = state.items.slice(0, 20)
    },
    markRead: (state, { payload }) => {
      const n = state.items.find(i => i.id === payload)
      if (n) n.read = true
    },
    markAllRead: (state) => { state.items.forEach(i => { i.read = true }) },
    clearAll:    (state) => { state.items = [] },
  },
})

export const { addNotification, markRead, markAllRead, clearAll } = notificationSlice.actions
export default notificationSlice.reducer

export const selectNotifications = (state) => state.notifications.items
export const selectUnreadCount   = (state) => state.notifications.items.filter(i => !i.read).length
