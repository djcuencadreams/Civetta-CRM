import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
    mobileFriendly?: boolean;
    size?: 'xs' | 'sm' | 'md' | 'lg';
  }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, mobileFriendly = true, size = 'md', ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 ring-offset-background file:border-0 file:bg-transparent file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
          // Base size classes
          size === 'xs' && "h-8 text-xs px-2 py-1 file:text-xs",
          size === 'sm' && "h-9 text-sm px-2.5 py-1.5 file:text-sm", 
          size === 'md' && "h-10 text-sm px-3 py-2 file:text-sm",
          size === 'lg' && "h-12 text-base px-4 py-2.5 file:text-base",
          // Mobile optimizations
          mobileFriendly && [
            "transition-all duration-200",
            "text-base sm:text-sm",                  // Larger text on mobile
            "h-12 sm:h-10",                          // Taller on mobile for touch
            "px-4 py-3 sm:px-3 sm:py-2",             // More padding on mobile
            "placeholder:text-sm",                   // Visible placeholder
            "shadow-sm",                             // Subtle shadow for depth
            "focus:ring-2",                          // Clear focus ring
            "touch-manipulation"                     // Better touch handling
          ],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
