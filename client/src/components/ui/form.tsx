import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { Slot } from "@radix-ui/react-slot"
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from "react-hook-form"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
)

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { 
    fullWidth?: boolean,
    spacing?: 'tight' | 'normal' | 'loose',
    mobileSpacing?: 'tighter' | 'tight' | 'normal',
    mobilePadding?: boolean,
    touchFriendly?: boolean,
  }
>(({ 
  className, 
  fullWidth = true, 
  spacing = 'normal', 
  mobileSpacing = 'tight', 
  mobilePadding = false,
  touchFriendly = true,
  ...props 
}, ref) => {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div 
        ref={ref} 
        className={cn(
          // Spacing between elements (label, input, description)
          mobileSpacing === 'tighter' && "space-y-1 sm:space-y-2",
          mobileSpacing === 'tight' && "space-y-1.5 sm:space-y-2",
          mobileSpacing === 'normal' && "space-y-2",
          spacing === 'tight' && "sm:space-y-1.5",
          spacing === 'normal' && "sm:space-y-2",
          spacing === 'loose' && "sm:space-y-3",
          
          // Width and positioning
          fullWidth && "w-full",
          
          // Mobile padding
          mobilePadding && "px-1 py-1 sm:p-0",
          
          // Touch optimization
          touchFriendly && "touch-manipulation",
          
          className
        )} 
        {...props} 
      />
    </FormItemContext.Provider>
  )
})
FormItem.displayName = "FormItem"

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & { 
    responsive?: boolean,
    mobileFriendly?: boolean
  }
>(({ className, responsive = true, mobileFriendly = true, ...props }, ref) => {
  const { error, formItemId } = useFormField()

  return (
    <Label
      ref={ref}
      className={cn(
        // Error state styling
        error && "text-destructive", 
        
        // Responsive text size
        responsive && "text-sm sm:text-base", 
        
        // Mobile optimizations
        mobileFriendly && [
          "font-medium",                        // Bolder font on all devices
          "block pb-1",                         // More spacing below label
          "touch-manipulation"                  // Better touch handling
        ],
        className
      )}
      htmlFor={formItemId}
      {...props}
    />
  )
})
FormLabel.displayName = "FormLabel"

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot> & {
    size?: 'default' | 'sm' | 'lg',
    mobileSize?: 'xs' | 'sm' | 'default',
    touchFriendly?: boolean
  }
>(({ size = 'default', mobileSize = 'sm', touchFriendly = true, className, ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      ref={ref}
      id={formItemId}
      className={cn(
        // Text sizes
        mobileSize === 'xs' && "text-xs sm:text-sm",
        mobileSize === 'sm' && "text-sm",
        size === 'sm' && "sm:text-sm",
        size === 'default' && "sm:text-base",
        size === 'lg' && "sm:text-lg",
        
        // Touch friendly (mobile optimization)
        touchFriendly && [
          "touch-manipulation",                 // Better touch handling
        ],
        className
      )}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
})
FormControl.displayName = "FormControl"

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-xs sm:text-sm text-muted-foreground mt-1", className)}
      {...props}
    />
  )
})
FormDescription.displayName = "FormDescription"

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & {
    mobilePadding?: boolean
  }
>(({ className, children, mobilePadding = true, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message) : children

  if (!body) {
    return null
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn(
        "text-xs sm:text-sm font-medium text-destructive", 
        mobilePadding && "px-1 pt-1 mt-1",      // Padding for better touch and visibility
        className
      )}
      {...props}
    >
      {body}
    </p>
  )
})
FormMessage.displayName = "FormMessage"

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}
