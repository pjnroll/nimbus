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
import { Button } from "@/components/ui/button"
import { PERSON_KIND_LABELS } from "@/lib/labels"
import { cleanPersonName, findPersonByName, personNameKey } from "@/lib/people"
import type { Person } from "@/lib/types"
import { cn } from "@/lib/utils"

function PersonLabel({ person }: { person: Person }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="truncate">{person.name}</span>
      {person.kind === "team" ? (
        <span className="shrink-0 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          {PERSON_KIND_LABELS.team}
        </span>
      ) : null}
    </span>
  )
}

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
        if (person.archivedAt) return false
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
        .filter((person): person is Person =>
          person != null && !person.archivedAt,
        )
        .sort((a, b) => a.name.localeCompare(b.name, "it")),
    [people, selectedIds, suggestIds],
  )

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
      const exact = findPersonByName(people, query)
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

  return (
    <div ref={rootRef} className="grid gap-1.5">
      <div ref={anchorRef} className="relative">
        <div
          className={cn(
            "flex min-h-10 w-full flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent px-1.5 py-1 text-base transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 md:min-h-8 md:text-sm",
          )}
          onClick={() => inputRef.current?.focus()}
        >
          {selected.map((person) => (
            <Badge
              key={person.id}
              variant="secondary"
              className="h-6 gap-0.5 pr-0.5"
            >
              <PersonLabel person={person} />
              <button
                type="button"
                className="rounded-full p-1.5 hover:bg-foreground/10"
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
                {matches.slice(0, 8).map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      className="flex min-h-10 w-full rounded-md px-2 py-2 text-left hover:bg-muted md:min-h-0 md:py-1.5"
                      onClick={() => addPerson(person)}
                    >
                      <PersonLabel person={person} />
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
                      Aggiungi «{cleanPersonName(query)}»
                    </button>
                  </li>
                ) : null}
              </ul>,
              document.body,
            )
          : null}
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
              size="sm"
              onClick={() => addPerson(person)}
            >
              <PersonLabel person={person} />
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
