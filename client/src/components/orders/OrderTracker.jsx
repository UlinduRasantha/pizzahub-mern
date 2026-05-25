import { motion } from 'framer-motion'
import { Check, Circle } from 'lucide-react'
import { ORDER_STATUSES, orderStatusLabel } from '../../utils/helpers'

const STATUS_ICONS = {
  received:         '📋',
  preparing:        '👨‍🍳',
  ready:            '✅',
  out_for_delivery: '🛵',
  delivered:        '🏠',
}

const STATUS_DESCRIPTIONS = {
  received:         'We\'ve received your order and it\'s in the queue.',
  preparing:        'Our chefs are handcrafting your pizza right now.',
  ready:            'Your order is boxed up and ready to go!',
  out_for_delivery: 'Your pizza is on its way — won\'t be long!',
  delivered:        'Enjoy your pizza! 🍕',
}

export default function OrderTracker({ status, estimatedDelivery }) {
  const currentIndex = ORDER_STATUSES.indexOf(status)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="font-bold text-brand-dark text-lg mb-1">Order Status</h3>
      {estimatedDelivery && (
        <p className="text-sm text-gray-400 mb-6">
          Estimated delivery: <span className="font-semibold text-brand-dark">
            {new Date(estimatedDelivery).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </p>
      )}

      {/* Stepper */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[18px] top-6 bottom-6 w-0.5 bg-gray-100" />
        <motion.div
          className="absolute left-[18px] top-6 w-0.5 bg-brand-red origin-top"
          initial={{ height: 0 }}
          animate={{ height: `${(currentIndex / (ORDER_STATUSES.length - 1)) * 100}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />

        <div className="space-y-6">
          {ORDER_STATUSES.map((s, i) => {
            const done    = i < currentIndex
            const active  = i === currentIndex
            const pending = i > currentIndex

            return (
              <motion.div
                key={s}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative flex items-start gap-4 pl-1"
              >
                {/* Node */}
                <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-500
                  ${done    ? 'bg-green-500 border-green-500' :
                    active  ? 'bg-brand-red border-brand-red ring-4 ring-brand-red/20' :
                              'bg-white border-gray-200'}`}
                >
                  {done ? (
                    <Check size={15} className="text-white" />
                  ) : active ? (
                    <span className="text-base">{STATUS_ICONS[s]}</span>
                  ) : (
                    <span className="text-sm text-gray-300">{i + 1}</span>
                  )}
                  {active && (
                    <span className="absolute inset-0 rounded-full bg-brand-red/30 animate-ping" />
                  )}
                </div>

                {/* Label */}
                <div className="pt-1.5">
                  <p className={`text-sm font-bold transition-colors ${active ? 'text-brand-red' : done ? 'text-green-600' : 'text-gray-400'}`}>
                    {orderStatusLabel(s)}
                  </p>
                  {active && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-xs text-gray-500 mt-0.5 leading-relaxed"
                    >
                      {STATUS_DESCRIPTIONS[s]}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
