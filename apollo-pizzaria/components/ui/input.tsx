'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'w-full rounded-xl border border-[#2A2A2A] bg-[#0D0D0D] px-4 py-3.5 text-sm text-white outline-none transition-all focus:border-apollo-orange focus:ring-0',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input }
