import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary:  'bg-brand-red text-white hover:bg-red-700 shadow-sm shadow-brand-red/20 disabled:bg-red-300',
  outline:  'border border-brand-red text-brand-red hover:bg-brand-light disabled:opacity-50',
  ghost:    'text-gray-600 hover:bg-gray-100 disabled:opacity-50',
  danger:   'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  dark:     'bg-brand-dark text-white hover:bg-gray-800 disabled:opacity-50',
}

const SIZES = {
  sm:  'px-3 py-1.5 text-xs rounded-lg',
  md:  'px-5 py-2.5 text-sm rounded-xl',
  lg:  'px-7 py-3.5 text-base rounded-xl',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  className = '',
  ...props
}) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading
        ? <Loader2 size={16} className="animate-spin" />
        : Icon && <Icon size={16} />}
      {children}
    </button>
  )
}
