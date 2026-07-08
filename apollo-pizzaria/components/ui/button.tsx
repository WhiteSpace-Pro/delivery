'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline'
  size?: 'default' | 'sm' | 'lg'
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  default:
    'bg-apollo-orange text-white shadow-lg shadow-[#E85D24]/20 hover:bg-[#E85D24] border border-transparent',
  secondary: 'bg-white/5 text-white border border-white/10 hover:bg-white/10',
  outline: 'bg-transparent text-white border border-white/10 hover:bg-white/5',
}

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  default: 'h-12 px-5 text-sm',
  sm: 'h-10 px-4 text-sm',
  lg: 'h-14 px-6 text-base',
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apollo-orange focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    />
  ),
)
Button.displayName = 'Button'

export { Button }
