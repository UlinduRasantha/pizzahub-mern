import { io } from 'socket.io-client'

let socket = null

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1')
  .replace('/api/v1', '')

// ─── Connect ──────────────────────────────────────────────────────────────────
export const connectSocket = () => {
  if (socket?.connected) return socket
  socket = io(BASE_URL, {
    withCredentials: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  })
  socket.on('connect',    () => console.log('[Socket] connected:', socket.id))
  socket.on('disconnect', () => console.log('[Socket] disconnected'))
  socket.on('connect_error', (e) => console.warn('[Socket] error:', e.message))
  return socket
}

// ─── Disconnect ───────────────────────────────────────────────────────────────
export const disconnectSocket = () => {
  socket?.disconnect()
  socket = null
}

// ─── Join rooms ───────────────────────────────────────────────────────────────
export const joinOrderRoom = (orderId) => {
  if (socket) socket.emit('joinOrder', orderId)
}

export const joinAdminRoom = () => {
  if (socket) socket.emit('joinAdmin')
}

// ─── Listen ───────────────────────────────────────────────────────────────────
export const onOrderStatusUpdate = (cb) => {
  socket?.on('orderStatusUpdate', cb)
  return () => socket?.off('orderStatusUpdate', cb)
}

export const onNewOrder = (cb) => {
  socket?.on('newOrder', cb)
  return () => socket?.off('newOrder', cb)
}

export const getSocket = () => socket
