// Socket.IO is disabled when backend is deployed on Vercel serverless.
// Replaced with React Query polling (refetchInterval) for live order updates.
// This file is kept so imports don't break — all functions are safe no-ops.

export const connectSocket    = () => null
export const disconnectSocket = () => null
export const joinOrderRoom    = () => null
export const joinAdminRoom    = () => null
export const onOrderStatusUpdate = (cb) => () => null
export const onNewOrder          = (cb) => () => null
export const getSocket           = () => null
