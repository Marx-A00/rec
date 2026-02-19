import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        primary:
          'bg-cosmic-latte text-black shadow hover:bg-cosmic-latte/90 focus-visible:ring-cosmic-latte/50',
        success:
          'bg-emeraled-green text-white shadow hover:bg-emeraled-green/90 focus-visible:ring-emeraled-green/50',
        warning:
          'bg-maximum-yellow text-black shadow hover:bg-maximum-yellow/90 focus-visible:ring-maximum-yellow/50',
        danger:
          'bg-dark-pastel-red text-white shadow hover:bg-dark-pastel-red/90 focus-visible:ring-dark-pastel-red/50',
        'primary-outline':
          'border border-cosmic-latte bg-transparent text-cosmic-latte shadow-sm hover:bg-cosmic-latte hover:text-black focus-visible:ring-cosmic-latte/50',
        'success-outline':
          'border border-emeraled-green bg-transparent text-emeraled-green shadow-sm hover:bg-emeraled-green hover:text-white focus-visible:ring-emeraled-green/50',
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        xl: "h-12 rounded-lg px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
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
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
