import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[#B85042] text-white hover:bg-[#a04038] focus-visible:ring-[#B85042]',
        destructive: 'bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500',
        outline: 'border border-[#B85042] text-[#B85042] bg-transparent hover:bg-[#B85042]/10',
        secondary: 'bg-[#A7BEAE] text-[#36454F] hover:bg-[#93ab9a]',
        ghost: 'hover:bg-[#E7E8D1] text-[#36454F]',
        link: 'text-[#B85042] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2 min-h-[44px]',
        sm: 'h-9 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-lg px-8 text-base min-h-[44px]',
        icon: 'h-10 w-10 min-h-[44px] min-w-[44px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
