"use client"

import { XIcon } from "lucide-react"
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"
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
  const anchorRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)

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

  const showInput = multiple || selected.length === 0
  const showList = open && showInput && (matches.length > 0 || canCreate)

  useLayoutEffect(() => {
    if (!showList) {
      setCoords(null)
      return
    }
    function update() {
      const el = anchorRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setCoords({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }
    update()
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [showList, query, matches.length, canCreate, selected.length])

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (
        !rootRef.current?.contains(target) &&
        !listRef.current?.contains(target)
      ) {
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

  return (
    <div ref={rootRef} className="grid gap-1.5">
      <div ref={anchorRef} className="relative">
        <div
          className={cn(
            "flex min-h-10 w-full flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent px-1.5 py-1 text-base transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 md:min-h-8 md:text-sm",
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
                className="rounded-full p-1.5 hover:bg-foreground/10"
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
              className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-base outline-none placeholder:text-muted-foreground md:text-sm"
              autoComplete="off"
            />
          ) : null}
        </div>
        {showList && coords
          ? createPortal(
              <ul
                ref={listRef}
                style={{
                  position: "fixed",
                  top: coords.top,
                  left: coords.left,
                  width: coords.width,
                }}
                className="z-[100] max-h-48 overflow-auto rounded-lg border bg-popover p-1 text-sm shadow-md"
              >
                {matches.slice(0, 8).map((category) => (
                  <li key={category.id}>
                    <button
                      type="button"
                      className="flex min-h-10 w-full rounded-md px-2 py-2 text-left hover:bg-muted md:min-h-0 md:py-1.5"
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
                      className="flex min-h-10 w-full rounded-md px-2 py-2 text-left text-primary hover:bg-muted md:min-h-0 md:py-1.5"
                      onClick={createFromQuery}
                    >
                      Aggiungi «{cleanCategoryName(query)}»
                    </button>
                  </li>
                ) : null}
              </ul>,
              document.body,
            )
          : null}
      </div>
    </div>
  )
}
