"use client"

import { XIcon } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  cleanCategoryName,
  findCategoryByName,
  categoryNameKey,
} from "@/lib/categories"
import { newId } from "@/lib/people"
import type { Category } from "@/lib/types"
import { cn } from "@/lib/utils"

export function CategoryField({
  categories,
  value,
  onChange,
  onCreate,
  multiple = true,
  placeholder = "Nome categoria",
  id,
}: {
  categories: Category[]
  value: string[]
  onChange: (ids: string[]) => void
  onCreate?: (name: string) => Category | null
  multiple?: boolean
  placeholder?: string
  id?: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)

  const selected = useMemo(
    () =>
      value
        .map((categoryId) =>
          categories.find((category) => category.id === categoryId),
        )
        .filter((category): category is Category => Boolean(category)),
    [categories, value],
  )
  const selectedIds = useMemo(() => new Set(value), [value])

  const matches = useMemo(() => {
    const needle = categoryNameKey(query)
    return categories.filter((category) => {
      if (selectedIds.has(category.id)) return false
      if (!needle) return true
      return categoryNameKey(category.name).includes(needle)
    })
  }, [categories, query, selectedIds])

  const canCreate = useMemo(() => {
    const name = cleanCategoryName(query)
    if (!name) return false
    return !findCategoryByName(categories, name)
  }, [categories, query])

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [])

  function addCategory(category: Category) {
    if (multiple) {
      if (selectedIds.has(category.id)) return
      onChange([...value, category.id])
    } else {
      onChange([category.id])
    }
    setQuery("")
    setOpen(false)
    inputRef.current?.focus()
  }

  function createFromQuery() {
    const name = cleanCategoryName(query)
    const created = onCreate
      ? onCreate(name)
      : findCategoryByName(categories, name) ??
        (name ? { id: newId(), name } : null)
    if (created) addCategory(created)
  }

  function removeCategory(categoryId: string) {
    onChange(value.filter((id) => id !== categoryId))
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault()
      if (matches.length === 1) {
        addCategory(matches[0])
        return
      }
      const exact = findCategoryByName(matches, query)
      if (exact) {
        addCategory(exact)
        return
      }
      if (canCreate) createFromQuery()
      return
    }
    if (event.key === "Backspace" && !query && selected.length > 0) {
      removeCategory(selected[selected.length - 1].id)
    }
    if (event.key === "Escape") {
      setOpen(false)
    }
  }

  const showInput = multiple || selected.length === 0

  return (
    <div ref={rootRef} className="grid gap-1.5">
      <div className="relative">
        <div
          className={cn(
            "flex min-h-8 w-full flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent px-1.5 py-1 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          )}
          onClick={() => inputRef.current?.focus()}
        >
          {selected.map((category) => (
            <Badge
              key={category.id}
              variant="secondary"
              className="h-6 gap-0.5 pr-0.5"
            >
              {category.name}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-foreground/10"
                onClick={(event) => {
                  event.stopPropagation()
                  removeCategory(category.id)
                }}
                aria-label={`Rimuovi ${category.name}`}
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
          {showInput ? (
            <input
              ref={inputRef}
              id={id}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder={selected.length === 0 ? placeholder : ""}
              className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground"
              autoComplete="off"
            />
          ) : null}
        </div>
        {open && showInput && (matches.length > 0 || canCreate) ? (
          <ul className="absolute top-full z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border bg-popover p-1 text-sm shadow-md">
            {matches.slice(0, 8).map((category) => (
              <li key={category.id}>
                <button
                  type="button"
                  className="flex w-full rounded-md px-2 py-1.5 text-left hover:bg-muted"
                  onClick={() => addCategory(category)}
                >
                  {category.name}
                </button>
              </li>
            ))}
            {canCreate ? (
              <li>
                <button
                  type="button"
                  className="flex w-full rounded-md px-2 py-1.5 text-left text-primary hover:bg-muted"
                  onClick={createFromQuery}
                >
                  Aggiungi «{cleanCategoryName(query)}»
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
