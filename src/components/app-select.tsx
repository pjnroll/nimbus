"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type Option = { value: string; label: string }

export function AppSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  id,
}: {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  className?: string
  id?: string
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (typeof next === "string") onChange(next)
      }}
    >
      <SelectTrigger id={id} className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder}>
          {options.find((option) => option.value === value)?.label ?? placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align="start">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
