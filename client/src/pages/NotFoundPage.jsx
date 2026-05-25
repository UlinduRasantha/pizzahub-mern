import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Menu } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        <div className="text-8xl mb-6">🍕</div>
        <h1 className="text-8xl font-black text-brand-red leading-none">404</h1>
        <h2 className="text-2xl font-bold text-brand-dark mt-3">Page not found</h2>
        <p className="text-gray-500 mt-3 leading-relaxed">
          Looks like this page got lost on the way to your door. Let's get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link to="/"     className="btn-primary  flex items-center justify-center gap-2 py-3 px-6"><Home size={16} /> Go Home</Link>
          <Link to="/menu" className="btn-outline flex items-center justify-center gap-2 py-3 px-6"><Menu size={16} /> View Menu</Link>
        </div>
      </motion.div>
    </div>
  )
}
