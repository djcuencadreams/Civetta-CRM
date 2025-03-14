import * as React from "react"
import { Input, type InputProps } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SearchInputProps extends Omit<InputProps, 'onChange'> {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  showClearButton?: boolean
  iconPosition?: 'left' | 'right' | 'none'
  iconClassName?: string
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ 
    className, 
    value, 
    onChange, 
    onClear, 
    showClearButton = true,
    iconPosition = 'left',
    iconClassName,
    ...props 
  }, ref) => {
    
    // Determine padding class based on icon position
    const paddingClass = iconPosition === 'left' 
      ? "pl-10" 
      : iconPosition === 'right' 
        ? "pr-10" 
        : "";

    // Handle input change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    // Handle clear button click
    const handleClear = () => {
      onChange("");
      if (onClear) onClear();
    };

    return (
      <div className="relative w-full">
        {/* Search icon */}
        {iconPosition === 'left' && (
          <Search 
            className={cn(
              "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none", 
              iconClassName
            )} 
          />
        )}
        
        {/* Input field */}
        <Input
          ref={ref}
          type="text"
          value={value}
          onChange={handleChange}
          className={cn(paddingClass, className)}
          {...props}
        />
        
        {/* Search icon on the right if specified */}
        {iconPosition === 'right' && (
          <Search 
            className={cn(
              "absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none", 
              iconClassName
            )} 
          />
        )}
        
        {/* Clear button */}
        {showClearButton && value && (
          <X
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground cursor-pointer hover:text-foreground"
            onClick={handleClear}
          />
        )}
      </div>
    )
  }
)

SearchInput.displayName = "SearchInput"

export { SearchInput }