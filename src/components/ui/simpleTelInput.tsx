'use client';

import * as React from "react";
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface SimpleTelInputProps {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  id?: string;
  name?: string;
}

export interface SimpleTelInputRef {
  focus: () => void;
  blur: () => void;
  getValue: () => string;
}

// Simple fallback phone input for SSR compatibility
const SimpleTelInput = forwardRef<SimpleTelInputRef, SimpleTelInputProps>(({
  value = "",
  placeholder = "Enter phone number",
  disabled = false,
  className,
  onChange,
  required = false,
  id,
  name,
}, ref) => {
  const [inputValue, setInputValue] = useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(newValue);
  };

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
    getValue: () => inputValue,
  }), [inputValue]);

  return (
    <div className={cn("space-y-2", className)}>
      <Input
        ref={inputRef}
        type="tel"
        id={id}
        name={name}
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={cn(
          "pl-4", // Standard padding since no country selector
        )}
      />
      
      {required && !inputValue && (
        <p className="text-sm text-muted-foreground">
          This field is required
        </p>
      )}
    </div>
  );
});

SimpleTelInput.displayName = "SimpleTelInput";

export { SimpleTelInput };