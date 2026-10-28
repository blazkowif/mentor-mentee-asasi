import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  children: ReactNode
  loadingLabel?: string
}

export default function LoadingButton({
  loading = false,
  loadingLabel = 'Processing…',
  children,
  disabled,
  className = '',
  ...props
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent align-[-2px]"
        />
      )}
      {loading ? loadingLabel : children}
    </button>
  )
}
