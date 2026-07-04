import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-body font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-saffron text-white shadow hover:bg-saffron-hover hover:-translate-y-0.5",
        secondary: "bg-maroon text-white shadow hover:bg-maroon-hover hover:-translate-y-0.5",
        outline: "border-2 border-maroon bg-transparent text-maroon hover:bg-maroon hover:text-white hover:-translate-y-0.5",
        ghost: "hover:bg-maroon-light text-maroon",
        link: "text-maroon underline-offset-4 hover:underline",
        gold: "border-2 border-gold text-gold bg-transparent hover:bg-gold hover:text-white hover:-translate-y-0.5",
        destructive: "bg-red-600 text-white hover:bg-red-700 hover:-translate-y-0.5",
      },
      size: {
        default: "min-h-[52px] px-7 py-3",
        sm: "min-h-[38px] px-4 py-2 text-sm",
        lg: "min-h-[56px] px-8 py-4 text-lg",
        icon: "h-10 w-10",
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
