"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxOption {
  value: string
  label: string
  description?: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  initialDisplayCount?: number
  className?: string
  disabled?: boolean
  onSearchChange?: (query: string) => void
  manualFiltering?: boolean
  loading?: boolean
  selectedLabel?: string
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  initialDisplayCount = 10,
  className,
  disabled = false,
  onSearchChange,
  manualFiltering = false,
  loading = false,
  selectedLabel,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const selectedOption = options.find((option) => option.value === value)
  const displayLabel = selectedOption?.label ?? selectedLabel

  const searchQuery = search.trim()

  const filteredOptions = React.useMemo(() => {
    if (manualFiltering) return options
    if (!searchQuery) {
      return options.slice(0, initialDisplayCount)
    }
    const q = searchQuery.toLowerCase()
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        option.value.toLowerCase().includes(q)
    )
  }, [options, searchQuery, initialDisplayCount, manualFiltering])

  const showMore = !manualFiltering && !searchQuery && options.length > initialDisplayCount

  const handleSearchChange = (next: string) => {
    setSearch(next)
    onSearchChange?.(next)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setSearch("")
          onSearchChange?.("")
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          <span className="truncate text-left">{displayLabel ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching…
              </div>
            ) : (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}
            {!loading && (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={(selectedValue) => {
                      const normalized = selectedValue.toLowerCase()
                      const next =
                        options.find((opt) => opt.value === selectedValue) ||
                        options.find((opt) => opt.value.toLowerCase() === normalized)
                      if (next) {
                        onValueChange?.(next.value === value ? "" : next.value)
                        setOpen(false)
                        setSearch("")
                        onSearchChange?.("")
                      }
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{option.label}</span>
                      {option.description ? (
                        <span className="text-xs text-muted-foreground truncate">{option.description}</span>
                      ) : null}
                    </div>
                  </CommandItem>
                ))}
                {showMore && (
                  <CommandItem disabled className="text-xs text-muted-foreground italic">
                    Type to search for more options ({options.length - initialDisplayCount} more)
                  </CommandItem>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
