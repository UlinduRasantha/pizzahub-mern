// Socket.IO is disabled — backend runs on Vercel serverless (stateless).
// All functions are safe no-ops so existing imports don't break.
// Order status updates are delivered by email instead.
export const connectSocket        = () => null
export const disconnectSocket     = () => null
export const joinOrderRoom        = () => null
export const joinAdminRoom        = () => null
export const onOrderStatusUpdate  = () => () => null
export const onNewOrder           = () => () => null
export const getSocket            = () => null
