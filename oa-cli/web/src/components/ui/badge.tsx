import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff6b35] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#ff6b35] text-white",
        secondary: "border-transparent bg-gray-100 text-[#1a2a3a]",
        destructive: "border-transparent bg-red-600 text-white",
        outline: "border-gray-300 text-[#1a2a3a]",
        running: "border-transparent bg-blue-100 text-blue-700",
        done: "border-transparent bg-green-100 text-green-700",
        failed: "border-transparent bg-red-100 text-red-700",
        timeout: "border-transparent bg-amber-100 text-amber-700",
        killed: "border-transparent bg-gray-100 text-gray-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
