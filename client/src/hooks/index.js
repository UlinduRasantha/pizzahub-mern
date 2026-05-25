import { useSelector, useDispatch } from 'react-redux'
import { useUser } from '@clerk/clerk-react'
import toast from 'react-hot-toast'
import { selectIsAdmin, selectProfile } from '../features/auth/authSlice'
import {
  selectCartItems, selectCartCount, selectCartSubtotal,
  addItem, removeItem, updateQuantity, clearCart,
} from '../features/cart/cartSlice'
import { generateCartId } from '../utils/helpers'

// ─── useAuth — wraps Clerk's useUser + our DB profile ────────────────────────
export const useAuth = () => {
  const { user, isSignedIn, isLoaded } = useUser()
  const profile = useSelector(selectProfile)
  const isAdmin = useSelector(selectIsAdmin)

  return {
    // Clerk user (name, email, avatar)
    clerkUser: user,
    isSignedIn,
    isLoaded,
    // Our DB profile (role, addresses)
    profile,
    isAdmin,
    // Convenience
    displayName: user?.firstName || user?.emailAddresses?.[0]?.emailAddress || '',
    avatarUrl:   user?.imageUrl || '',
  }
}

// ─── useCart ──────────────────────────────────────────────────────────────────
export const useCart = () => {
  const dispatch = useDispatch()
  const items    = useSelector(selectCartItems)
  const count    = useSelector(selectCartCount)
  const subtotal = useSelector(selectCartSubtotal)

  const addToCart = (pizza, options = {}) => {
    dispatch(addItem({
      cartId:          generateCartId(),
      pizzaId:         pizza._id,
      name:            pizza.name,
      image:           pizza.images?.[0],
      size:            options.size   || 'medium',
      crust:           options.crust  || 'classic',
      extraToppings:   options.extraToppings   || [],
      removedToppings: options.removedToppings || [],
      specialNote:     options.specialNote     || '',
      unitPrice:       options.unitPrice || pizza.basePrice,
      quantity:        options.quantity  || 1,
    }))
    toast.success(`${pizza.name} added to cart!`)
  }

  return {
    items,
    count,
    subtotal,
    addToCart,
    removeItem:     (cartId)      => dispatch(removeItem(cartId)),
    updateQuantity: (cartId, qty) => dispatch(updateQuantity({ cartId, quantity: qty })),
    clearCart:      ()            => dispatch(clearCart()),
  }
}
