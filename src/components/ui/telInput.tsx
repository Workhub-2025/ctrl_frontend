'use client';

import * as React from "react";
import { useState, useCallback, forwardRef, useImperativeHandle, useEffect } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

// Dynamically import IntlTelInput to prevent SSR issues
const IntlTelInput = dynamic(() => import("intl-tel-input/reactWithUtils"), {
  ssr: false,
  loading: () => (
    <div className="flex h-10 w-full rounded-md border border-input bg-background px-12 py-2 text-base">
      <input 
        className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
        placeholder="Loading..."
        disabled
      />
    </div>
  ),
});

// Load styles on client-side only
const loadStyles = () => {
  if (typeof window !== 'undefined') {
    // Create link element for styles
    const existingLink = document.getElementById('intl-tel-input-styles');
    if (!existingLink) {
      const link = document.createElement('link');
      link.id = 'intl-tel-input-styles';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/intl-tel-input@25.11.0/build/css/intlTelInput.css';
      document.head.appendChild(link);
    }
  }
};

// Error messages mapping
const errorMap = [
  "Invalid number",
  "Invalid country code", 
  "Too short",
  "Too long",
  "Invalid number",
];

export interface TelInputProps {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onValueChange?: (number: string, isValid: boolean, errorCode?: number | null) => void;
  onCountryChange?: (countryCode: string) => void;
  initialCountry?: string;
  preferredCountries?: string[];
  excludeCountries?: string[];
  onlyCountries?: string[];
  autoPlaceholder?: "off" | "polite" | "aggressive";
  formatOnDisplay?: boolean;
  nationalMode?: boolean;
  separateDialCode?: boolean;
  showFlags?: boolean;
  usePreciseValidation?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
}

export interface TelInputRef {
  focus: () => void;
  blur: () => void;
  setNumber: (number: string) => void;
  setCountry: (countryCode: string) => void;
  getNumber: () => string;
  getSelectedCountryData: () => any;
  isValidNumber: () => boolean;
  getInstance: () => any;
  getInput: () => HTMLInputElement | null;
}

const TelInput = forwardRef<TelInputRef, TelInputProps>(({
  value,
  placeholder = "Enter phone number",
  disabled = false,
  className,
  onValueChange,
  onCountryChange,
  initialCountry = "gb",
  preferredCountries,
  excludeCountries,
  onlyCountries,
  autoPlaceholder = "polite",
  formatOnDisplay = true,
  nationalMode = true,
  separateDialCode = false,
  showFlags = true,
  usePreciseValidation = false,
  required = false,
  id,
  name,
  ...props
}, ref) => {
  const [number, setNumber] = useState<string>(value || "");
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [isClient, setIsClient] = useState(false);
  const intlTelInputRef = React.useRef<any>(null);

  // Load styles and set client-side flag
  useEffect(() => {
    loadStyles();
    setIsClient(true);
  }, []);

  // Sync internal state when value prop changes
  useEffect(() => {
    if (value !== undefined) {
      setNumber(value);
    }
  }, [value]);

  const handleChangeNumber = useCallback((newNumber: string) => {
    setNumber(newNumber);
  }, []);

  const handleChangeValidity = useCallback((newIsValid: boolean) => {
    setIsValid(newIsValid);
  }, []);

  const handleChangeErrorCode = useCallback((newErrorCode: number | null) => {
    setErrorCode(newErrorCode);
  }, []);

  const onCountryChangeRef = React.useRef(onCountryChange);
  onCountryChangeRef.current = onCountryChange;

  const handleChangeCountry = useCallback((countryCode: string) => {
    onCountryChangeRef.current?.(countryCode);
  }, []);

  // Use a ref to store the latest callback to avoid infinite loops
  const onValueChangeRef = React.useRef(onValueChange);
  onValueChangeRef.current = onValueChange;

  // Call onValueChange when any relevant state changes
  React.useEffect(() => {
    if (onValueChangeRef.current) {
      onValueChangeRef.current(number, isValid ?? false, errorCode);
    }
  }, [number, isValid, errorCode]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      const input = intlTelInputRef.current?.getInput();
      input?.focus();
    },
    blur: () => {
      const input = intlTelInputRef.current?.getInput();
      input?.blur();
    },
    setNumber: (newNumber: string) => {
      intlTelInputRef.current?.getInstance()?.setNumber(newNumber);
    },
    setCountry: (countryCode: string) => {
      intlTelInputRef.current?.getInstance()?.setCountry(countryCode);
    },
    getNumber: () => {
      return intlTelInputRef.current?.getInstance()?.getNumber() || "";
    },
    getSelectedCountryData: () => {
      return intlTelInputRef.current?.getInstance()?.getSelectedCountryData();
    },
    isValidNumber: () => {
      return intlTelInputRef.current?.getInstance()?.isValidNumber() || false;
    },
    getInstance: () => {
      return intlTelInputRef.current?.getInstance();
    },
    getInput: () => {
      return intlTelInputRef.current?.getInput();
    },
  }), []);

  const getErrorMessage = () => {
    if (errorCode !== null && errorCode >= 0 && errorCode < errorMap.length) {
      return errorMap[errorCode];
    }
    return null;
  };

  // Render fallback on server-side or while loading
  if (!isClient) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="relative">
          <input
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-12 py-2 text-base ring-offset-background",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              "md:text-sm"
            )}
            placeholder={placeholder}
            disabled={disabled}
            id={id}
            name={name}
            value={number}
            onChange={(e) => {
              const newNumber = e.target.value;
              setNumber(newNumber);
              onValueChange?.(newNumber, false, null);
            }}
          />
        </div>
        {required && !number && (
          <p className="text-sm text-muted-foreground">
            This field is required
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <IntlTelInput
          ref={intlTelInputRef}
          disabled={disabled}
          initialValue={value}
          onChangeNumber={handleChangeNumber}
          onChangeValidity={handleChangeValidity}
          onChangeErrorCode={handleChangeErrorCode}
          onChangeCountry={handleChangeCountry}
          usePreciseValidation={usePreciseValidation}
          inputProps={{
            className: cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-12 py-2 text-base ring-offset-background",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              "md:text-sm",
              // Error state
              isValid === false && "border-destructive focus-visible:ring-destructive",
              // Success state  
              isValid === true && "border-green-500 focus-visible:ring-green-500"
            ),
            placeholder,
            required,
            id,
            name,
            ...props
          }}
          initOptions={{
            initialCountry: initialCountry as any,
            ...(preferredCountries && { preferredCountries: preferredCountries as any }),
            ...(excludeCountries && { excludeCountries: excludeCountries as any }),
            ...(onlyCountries && { onlyCountries: onlyCountries as any }),
            autoPlaceholder,
            formatOnDisplay,
            nationalMode,
            separateDialCode,
            showFlags,
            // Load utils from CDN
            loadUtils: "https://cdn.jsdelivr.net/npm/intl-tel-input@25.11.0/build/js/utils.js" as any,
          } as any}
        />
        
        {/* Validation indicator */}
        {isValid !== null && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isValid ? (
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            ) : (
              <div className="w-2 h-2 bg-destructive rounded-full" />
            )}
          </div>
        )}
      </div>
      
      {/* Error message */}
      {isValid === false && errorCode !== null && (
        <p className="text-sm text-destructive">
          {getErrorMessage()}
        </p>
      )}
      
      {/* Required indicator */}
      {required && !number && (
        <p className="text-sm text-muted-foreground">
          This field is required
        </p>
      )}
    </div>
  );
});

TelInput.displayName = "TelInput";

export { TelInput };
