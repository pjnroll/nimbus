"use client"

import { XIcon } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cleanPersonName, findPersonByName, personNameKey } from "@/lib/people"
import type { Person } from "@/lib/types"
import { cn } from "@/lib/utils"

export function PersonField({
  people,
  value,
  onChange,
  onCreate,
  multiple = true,
  suggestIds = [],
  placeholder = "Nome e cognome",
  id,
}: {
  people: Person[]
  value: string[]
  onChange: (ids: string[]) => void
  onCreate: (name: string) => Person | null
  multiple?: boolean
  suggestIds?: string[]
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
        .map((personId) => people.find((person) => person.id === personId))
        .filter((person): person is Person => Boolean(person)),
    [people, value],
  )
  const selectedIds = useMemo(() => new Set(value), [value])

  const matches = useMemo(() => {
    const needle = personNameKey(query)
    return people
      .filter((person) => {
        if (selectedIds.has(person.id)) return false
        if (!needle) return true
        return personNameKey(person.name).includes(needle)
      })
      .sort((a, b) => a.name.localeCompare(b.name, "it"))
  }, [people, query, selectedIds])

  const canCreate = useMemo(() => {
    const name = cleanPersonName(query)
    if (!name) return false
    return !findPersonByName(people, name)
  }, [people, query])

  const suggestions = useMemo(
    () =>
      suggestIds
        .filter((personId) => !selectedIds.has(personId))
        .map((personId) => people.find((person) => person.id === personId))
        .filter((person): person is Person => Boolean(person))
        .sort((a, b) => a.name.localeCompare(b.name, "it")),
    [people, selectedIds, suggestIds],
  )

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [])

  function addPerson(person: Person) {
    if (multiple) {
      if (selectedIds.has(person.id)) return
      onChange([...value, person.id])
    } else {
      onChange([person.id])
    }
    setQuery("")
    setOpen(false)
    inputRef.current?.focus()
  }

  function createFromQuery() {
    const person = onCreate(query)
    if (person) addPerson(person)
  }

  function removePerson(personId: string) {
    onChange(value.filter((id) => id !== personId))
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault()
      if (matches.length === 1) {
        addPerson(matches[0])
        return
      }
      const exact = findPersonByName(matches, query)
      if (exact) {
        addPerson(exact)
        return
      }
      if (canCreate) createFromQuery()
      return
    }
    if (event.key === "Backspace" && !query && selected.length > 0) {
      removePerson(selected[selected.length - 1].id)
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
          {selected.map((person) => (
            <Badge
              key={person.id}
              variant="secondary"
              className="h-6 gap-0.5 pr-0.5"
            >
              {person.name}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-foreground/10"
                onClick={(event) => {
                  event.stopPropagation()
                  removePerson(person.id)
                }}
                aria-label={`Rimuovi ${person.name}`}
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
            {matches.slice(0, 8).map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  className="flex w-full rounded-md px-2 py-1.5 text-left hover:bg-muted"
                  onClick={() => addPerson(person)}
                >
                  {person.name}
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
                  Aggiungi «{cleanPersonName(query)}»
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          <span className="w-full text-xs text-muted-foreground">
            Partecipanti al progetto
          </span>
          {suggestions.map((person) => (
            <Button
              key={person.id}
              type="button"
              variant="outline"
              size="xs"
              onClick={() => addPerson(person)}
            >
              {person.name}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
