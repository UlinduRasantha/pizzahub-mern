import { useAuth } from '@clerk/clerk-react'
import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import { selectIsAdmin } from '../../features/auth/authSlice'
import { PageSpinner } from './Spinner'

// Redirects to Clerk's hosted sign-in page if not authenticated
export function PrivateRoute({ children }) {
  const { isLoaded, isSignedIn } = useAuth()
  if (!isLoaded) return <PageSpinner />
  if (!isSignedIn) return <Navigate to="/sign-in" replace />
  return children
}

// Additional role check on top of auth
export function AdminRoute({ children }) {
  const { isLoaded, isSignedIn } = useAuth()
  const isAdmin = useSelector(selectIsAdmin)
  if (!isLoaded) return <PageSpinner />
  if (!isSignedIn) return <Navigate to="/sign-in" replace />
  if (!isAdmin)    return <Navigate to="/" replace />
  return children
}
