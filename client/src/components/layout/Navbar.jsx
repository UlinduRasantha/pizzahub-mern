import { Link, NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Menu, X, Pizza } from 'lucide-react'
import { useState } from 'react'
import {
  SignedIn, SignedOut, SignInButton,
  UserButton, useUser,
} from '@clerk/clerk-react'
import { useSelector } from 'react-redux'
import NotificationBell from '../common/NotificationBell'
import { useCart } from '../../hooks'
import { selectIsAdmin } from '../../features/auth/authSlice'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { user }        = useUser()
  const isAdmin         = useSelector(selectIsAdmin)
  const { count }       = useCart()

  const navLinks = [
    { to: '/',      label: 'Home'      },
    { to: '/menu',  label: 'Menu'      },
    { to: '/orders',label: 'My Orders', auth: true  },
    { to: '/admin', label: 'Admin',     admin: true },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-brand-red">
            <Pizza size={28} /> PizzaHub
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, auth, admin: adminOnly }) => {
              if (adminOnly && !isAdmin) return null
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-brand-red bg-brand-light'
                        : 'text-gray-600 hover:text-brand-red hover:bg-gray-50'
                    }`
                  }
                >
                  {label}
                </NavLink>
              )
            })}
          </div>

          {/* Right: cart + auth */}
          <div className="flex items-center gap-3">
            {/* Cart icon */}
            <Link to="/cart" className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ShoppingCart size={22} className="text-gray-700" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-red text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </Link>

            {/* Notification bell */}
            <NotificationBell />

            {/* Clerk auth buttons — desktop */}
            <div className="hidden md:flex items-center gap-3">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="text-sm font-medium text-gray-600 hover:text-brand-red px-3 py-2 transition-colors">
                    Login
                  </button>
                </SignInButton>
                <SignInButton mode="modal">
                  <button className="btn-primary text-sm py-2 px-4">Sign Up</button>
                </SignInButton>
              </SignedOut>

              <SignedIn>
                {/* Clerk's built-in avatar + dropdown (profile, security, sign out) */}
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: 'w-9 h-9',
                      userButtonPopoverCard: 'shadow-xl border border-gray-100 rounded-2xl',
                      userButtonPopoverActionButton: 'hover:bg-brand-light',
                    },
                  }}
                />
              </SignedIn>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="md:hidden border-t border-gray-100 bg-white px-4 pt-3 pb-4 space-y-1"
          >
            {navLinks.map(({ to, label, admin: adminOnly }) => {
              if (adminOnly && !isAdmin) return null
              return (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block px-4 py-2.5 rounded-lg text-sm font-medium ${
                      isActive ? 'text-brand-red bg-brand-light' : 'text-gray-600 hover:bg-gray-50'
                    }`
                  }
                >
                  {label}
                </NavLink>
              )
            })}

            {/* Mobile auth */}
            <div className="pt-2 border-t border-gray-100">
              <SignedOut>
                <div className="flex gap-2 pt-1">
                  <SignInButton mode="modal">
                    <button className="flex-1 btn-outline text-sm text-center py-2" onClick={() => setOpen(false)}>
                      Login
                    </button>
                  </SignInButton>
                  <SignInButton mode="modal">
                    <button className="flex-1 btn-primary text-sm text-center py-2" onClick={() => setOpen(false)}>
                      Sign Up
                    </button>
                  </SignInButton>
                </div>
              </SignedOut>
              <SignedIn>
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <UserButton afterSignOutUrl="/" />
                  <span className="text-sm text-gray-600">
                    {user?.firstName || user?.emailAddresses?.[0]?.emailAddress}
                  </span>
                </div>
              </SignedIn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
