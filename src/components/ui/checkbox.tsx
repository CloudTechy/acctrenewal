"use client"

import * as React from "react"
import { Check } from "lucide-react"

export interface CheckboxProps {
  id?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ id, checked = false, onCheckedChange, disabled = false, className = "", ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked);
    };

    return (
      <div className="relative">
        <input
          type="checkbox"
          id={id}
          ref={ref}
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <label
          htmlFor={id}
          className={`flex h-4 w-4 items-center justify-center rounded border border-gray-600 bg-gray-800 hover:border-gray-500 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 transition-colors duration-200 cursor-pointer ${
            checked ? "bg-blue-600 border-blue-600" : ""
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
        >
          {checked && (
            <Check className="h-3 w-3 text-white" />
          )}
        </label>
      </div>
    )
  }
)

Checkbox.displayName = "Checkbox"

export { Checkbox } 