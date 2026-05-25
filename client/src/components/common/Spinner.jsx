export default function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-3', lg: 'w-14 h-14 border-4' }
  return (
    <div className={`${sizes[size]} rounded-full border-gray-200 border-t-brand-red animate-spin ${className}`} />
  )
}

export function PageSpinner() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
      <Spinner size="lg" />
      <p className="text-sm text-gray-400 animate-pulse">Loading…</p>
    </div>
  )
}
