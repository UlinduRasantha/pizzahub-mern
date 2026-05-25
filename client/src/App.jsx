import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, SignIn, SignUp } from '@clerk/clerk-react'
import { useDispatch } from 'react-redux'
import { useSession } from '@clerk/clerk-react'
import { fetchProfile, clearProfile } from './features/auth/authSlice'
import { addNotification } from './features/notifications/notificationSlice'
import { setClerkGetToken } from './services/api'
import { connectSocket, disconnectSocket, onOrderStatusUpdate, onNewOrder } from './services/socket'
import Navbar          from './components/layout/Navbar'
import { PrivateRoute, AdminRoute } from './components/common/ProtectedRoute'
import HomePage        from './pages/HomePage'
import MenuPage        from './pages/MenuPage'
import PizzaDetailPage from './pages/PizzaDetailPage'
import CartPage        from './pages/CartPage'
import CheckoutPage    from './pages/CheckoutPage'
import OrdersPage      from './pages/OrdersPage'
import AdminDashboard  from './pages/AdminDashboard'
import NotFoundPage    from './pages/NotFoundPage'

const STATUS_TITLES = {
  preparing:        'Your order is being prepared 👨‍🍳',
  ready:            'Your order is ready! ✅',
  out_for_delivery: 'Your order is on the way! 🛵',
  delivered:        'Your order has been delivered! 🏠',
  cancelled:        'Your order has been cancelled ❌',
}

const STATUS_BODIES = {
  preparing:        'Our chefs are handcrafting your pizza right now.',
  ready:            'Your pizza is boxed up. A delivery rider is being assigned.',
  out_for_delivery: 'Your pizza is en route — track it in the orders page.',
  delivered:        'Enjoy! Confirm receipt to leave a review.',
  cancelled:        'Your order was cancelled. Any charge will be refunded.',
}

export default function App() {
  const dispatch                  = useDispatch()
  const { isSignedIn, isLoaded }  = useAuth()
  const { session }               = useSession()

  // ── Wire Clerk token into Axios ──────────────────────────────────────────
  useEffect(() => {
    if (session) setClerkGetToken(() => session.getToken())
  }, [session])

  // ── Fetch DB profile whenever auth state changes ─────────────────────────
  useEffect(() => {
    if (!isLoaded) return
    if (isSignedIn)  dispatch(fetchProfile())
    if (!isSignedIn) dispatch(clearProfile())
  }, [isLoaded, isSignedIn, dispatch])

  // ── Socket.IO — connect when signed in, disconnect on sign-out ───────────
  useEffect(() => {
    if (!isLoaded) return
    if (isSignedIn) {
      connectSocket()
    } else {
      disconnectSocket()
    }
    return () => {}
  }, [isLoaded, isSignedIn])

  // ── Listen for order status updates → push notification ──────────────────
  useEffect(() => {
    if (!isSignedIn) return

    const offStatus = onOrderStatusUpdate((data) => {
      const { orderId, orderNumber, status } = data
      if (!STATUS_TITLES[status]) return   // don't notify for 'received'
      dispatch(addNotification({
        type:        status,
        title:       STATUS_TITLES[status],
        body:        STATUS_BODIES[status],
        orderId,
        orderNumber,
      }))
    })

    const offNew = onNewOrder((data) => {
      // Only used for admin — we add a "new order" notification
      dispatch(addNotification({
        type:        'new_order',
        title:       `New order received 🍕`,
        body:        `${data.orderNumber} — $${data.total?.toFixed(2)}`,
        orderId:     data._id,
        orderNumber: data.orderNumber,
      }))
    })

    return () => {
      offStatus?.()
      offNew?.()
    }
  }, [isSignedIn, dispatch])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* ── Public ──────────────────────────────────────────── */}
          <Route path="/"         element={<HomePage />} />
          <Route path="/menu"     element={<MenuPage />} />
          <Route path="/menu/:id" element={<PizzaDetailPage />} />
          <Route path="/cart"     element={<CartPage />} />

          {/* ── Clerk hosted auth pages ──────────────────────────── */}
          <Route path="/sign-in/*" element={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
              <SignIn routing="path" path="/sign-in" afterSignInUrl="/" />
            </div>
          } />
          <Route path="/sign-up/*" element={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
              <SignUp routing="path" path="/sign-up" afterSignUpUrl="/" />
            </div>
          } />

          {/* ── Protected ────────────────────────────────────────── */}
          <Route path="/checkout"   element={<PrivateRoute><CheckoutPage /></PrivateRoute>} />
          <Route path="/orders"     element={<PrivateRoute><OrdersPage /></PrivateRoute>} />
          <Route path="/orders/:id" element={<PrivateRoute><OrdersPage /></PrivateRoute>} />

          {/* ── Admin ────────────────────────────────────────────── */}
          <Route path="/admin"        element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/orders" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/menu"   element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/users"  element={<AdminRoute><AdminDashboard /></AdminRoute>} />

          {/* ── 404 ──────────────────────────────────────────────── */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  )
}
