import { forwardRef } from 'react'

const Input = forwardRef(function Input(
  { label, error, hint, icon: Icon, className = '', ...props },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      )}
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon size={16} />
          </span>
        )}
        <input
          ref={ref}
          {...props}
          className={`input-field ${Icon ? 'pl-9' : ''} ${error ? 'border-red-400 focus:ring-red-400/30' : ''} ${className}`}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
})

export default Input
