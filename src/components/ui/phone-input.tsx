"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string
  onChange?: (value: string) => void
  onValidation?: (isValid: boolean) => void
  className?: string
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ 
    className, 
    value = "", 
    onChange,
    onValidation,
    disabled,
    ...props 
  }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null)
    const itiRef = React.useRef<any>(null)
    const [mounted, setMounted] = React.useState(false)

    React.useImperativeHandle(ref, () => inputRef.current!, [])

    React.useEffect(() => {
      setMounted(true)
    }, [])

    React.useEffect(() => {
      if (!mounted || !inputRef.current || itiRef.current) return

      let isDestroyed = false

      const initPhone = async () => {
        try {
          // Import intl-tel-input
          const intlTelInputModule = await import('intl-tel-input')
          const intlTelInput = intlTelInputModule.default

          if (!inputRef.current || isDestroyed) return

          // Initialize
          itiRef.current = intlTelInput(inputRef.current, {
            initialCountry: "us",
            separateDialCode: true,
            formatOnDisplay: true,
            allowDropdown: true,
            showFlags: true
          } as any)

          // Set initial value
          if (value) {
            itiRef.current.setNumber(value)
          }

          // Add event handlers
          const handleChange = () => {
            if (isDestroyed || !itiRef.current) return
            
            try {
              const phoneNumber = itiRef.current.getNumber()
              const isValid = itiRef.current.isValidNumber()
              
              onChange?.(phoneNumber)
              onValidation?.(isValid)
            } catch (err) {
              console.warn('Phone validation error:', err)
            }
          }

          const handleKeydown = (e: KeyboardEvent) => {
            // Allow: backspace, delete, tab, escape, enter, arrows
            if ([8, 9, 27, 13, 37, 38, 39, 40, 46].includes(e.keyCode) ||
                // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                (e.keyCode === 65 && e.ctrlKey) ||
                (e.keyCode === 67 && e.ctrlKey) ||
                (e.keyCode === 86 && e.ctrlKey) ||
                (e.keyCode === 88 && e.ctrlKey)) {
              return
            }
            
            // Allow: numbers
            if ((e.keyCode >= 48 && e.keyCode <= 57) || 
                (e.keyCode >= 96 && e.keyCode <= 105)) {
              return
            }
            
            // Allow: +
            if (e.keyCode === 187 && e.shiftKey) {
              return
            }
            
            e.preventDefault()
          }

          if (inputRef.current) {
            inputRef.current.addEventListener('input', handleChange)
            inputRef.current.addEventListener('countrychange', handleChange)
            inputRef.current.addEventListener('keydown', handleKeydown)
          }

        } catch (error) {
          console.error('Error initializing phone input:', error)
        }
      }

      initPhone()

      return () => {
        isDestroyed = true
        if (itiRef.current) {
          try {
            itiRef.current.destroy()
          } catch (e) {
            // Ignore cleanup errors
          }
          itiRef.current = null
        }
      }
    }, [mounted])

    // Update value when prop changes
    React.useEffect(() => {
      if (itiRef.current && value !== undefined) {
        try {
          const current = itiRef.current.getNumber()
          if (current !== value) {
            itiRef.current.setNumber(value)
          }
        } catch (e) {
          // Ignore
        }
      }
    }, [value])

    if (!mounted) {
      return (
        <input
          type="tel"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          disabled={disabled}
          placeholder="Loading..."
          {...props}
        />
      )
    }

    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="tel"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          disabled={disabled}
          {...props}
        />
        
        {/* Inline styles to avoid CSS import issues */}
        <style dangerouslySetInnerHTML={{
          __html: `
            .iti {
              width: 100% !important;
              display: block;
            }
            .iti__input {
              width: 100% !important;
              height: 40px !important;
              padding-left: 52px !important;
              border: 1px solid hsl(var(--border)) !important;
              border-radius: 6px !important;
              background-color: transparent !important;
              font-size: 14px !important;
            }
            .iti__input:focus {
              outline: 2px solid hsl(var(--ring)) !important;
              outline-offset: 2px !important;
            }
            .iti__selected-flag {
              padding: 0 8px !important;
              border-right: 1px solid hsl(var(--border)) !important;
              cursor: pointer !important;
            }
            .iti__selected-flag:hover {
              background-color: hsl(var(--muted)) !important;
            }
            .iti__country-list {
              background-color: hsl(var(--background)) !important;
              border: 1px solid hsl(var(--border)) !important;
              border-radius: 6px !important;
              box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1) !important;
              z-index: 1000 !important;
            }
            .iti__country {
              padding: 8px 12px !important;
              color: hsl(var(--foreground)) !important;
              cursor: pointer !important;
            }
            .iti__country:hover,
            .iti__country.iti__highlight {
              background-color: hsl(var(--muted)) !important;
            }
          `
        }} />
      </div>
    )
  }
)

PhoneInput.displayName = "PhoneInput"

export { PhoneInput }