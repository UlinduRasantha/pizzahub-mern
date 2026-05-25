import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, CheckCheck, Trash2, Package, ChevronRight } from 'lucide-react'
import {
  selectNotifications, selectUnreadCount,
  markRead, markAllRead, clearAll,
} from '../../features/notifications/notificationSlice'

// ─── Status colours ───────────────────────────────────────────────────────────
const STATUS_META = {
  received:         { emoji: '📋', color: 'bg-blue-100   text-blue-700'   },
  preparing:        { emoji: '👨‍🍳', color: 'bg-yellow-100 text-yellow-700' },
  ready:            { emoji: '✅', color: 'bg-purple-100 text-purple-700' },
  out_for_delivery: { emoji: '🛵', color: 'bg-orange-100 text-orange-700' },
  delivered:        { emoji: '🏠', color: 'bg-green-100  text-green-700'  },
  cancelled:        { emoji: '❌', color: 'bg-red-100    text-red-700'    },
  new_order:        { emoji: '🍕', color: 'bg-brand-light text-brand-red' },
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function NotificationBell() {
  const dispatch     = useDispatch()
  const notifications= useSelector(selectNotifications)
  const unread       = useSelector(selectUnreadCount)
  const [open, setOpen] = useState(false)
  const ref          = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Mark all read when panel opens
  useEffect(() => {
    if (open && unread > 0) dispatch(markAllRead())
  }, [open])

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={22} className="text-gray-700" />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{   scale: 0 }}
              className="absolute -top-1 -right-1 bg-brand-red text-white text-xs font-black w-5 h-5 flex items-center justify-center rounded-full"
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.95, y: -8  }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-brand-red" />
                <span className="font-bold text-brand-dark text-sm">Notifications</span>
                {notifications.length > 0 && (
                  <span className="text-xs text-gray-400">({notifications.length})</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={() => dispatch(markAllRead())}
                      title="Mark all read"
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <CheckCheck size={14} />
                    </button>
                    <button
                      onClick={() => dispatch(clearAll())}
                      title="Clear all"
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Bell size={36} className="text-gray-200 mb-3" />
                  <p className="font-semibold text-gray-400 text-sm">No notifications yet</p>
                  <p className="text-xs text-gray-300 mt-1">Order updates will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map(n => {
                    const meta = STATUS_META[n.type] || STATUS_META['new_order']
                    return (
                      <motion.div
                        key={n.id}
                        layout
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0  }}
                        className={`flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer ${!n.read ? 'bg-blue-50/40' : ''}`}
                        onClick={() => dispatch(markRead(n.id))}
                      >
                        {/* Emoji badge */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${meta.color}`}>
                          {meta.emoji}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm leading-snug ${!n.read ? 'font-bold text-brand-dark' : 'font-semibold text-gray-700'}`}>
                              {n.title}
                            </p>
                            {!n.read && (
                              <span className="w-2 h-2 rounded-full bg-brand-red shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-xs text-gray-400">{timeAgo(n.timestamp)}</span>
                            {n.orderId && (
                              <Link
                                to={`/orders/${n.orderId}`}
                                onClick={() => setOpen(false)}
                                className="text-xs text-brand-red font-semibold hover:underline flex items-center gap-0.5"
                              >
                                View order <ChevronRight size={11} />
                              </Link>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                <Link
                  to="/orders"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-1.5 text-xs text-brand-red font-semibold hover:underline"
                >
                  <Package size={12} /> View all orders
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
