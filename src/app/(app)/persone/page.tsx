"use client"

import { useMemo, useState } from "react"
import { SearchXIcon, UsersIcon } from "lucide-react"
import { PersonDialog } from "@/components/person-dialog"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PERSON_KIND_LABELS } from "@/lib/labels"
import { personNameKey } from "@/lib/people"
import { useNimbus } from "@/lib/store"
import type { Person, PersonKind } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function PersonePage() {
  const { store } = useNimbus()
  const [query, setQuery] = useState("")
  const [creating, setCreating] = useState<PersonKind | null>(null)
  const [selected, setSelected] = useState<Person | null>(null)

  const filtered = useMemo(() => {
    const needle = personNameKey(query)
    return store.people
      .filter((person) => {
        if (!needle) return true
        return (
          personNameKey(person.name).includes(needle) ||
          person.email.toLocaleLowerCase("it").includes(needle)
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name, "it"))
  }, [store.people, query])

  const persone = filtered.filter((person) => person.kind === "persona")
  const team = filtered.filter((person) => person.kind === "team")

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Persone e Team
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Anagrafica globale. Usala per responsabili, richiedenti, coinvolti e
            esecutori.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setCreating("persona")}>
            Nuova persona
          </Button>
          <Button onClick={() => setCreating("team")}>Nuovo team</Button>
        </div>
      </header>

      {store.people.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="Nessuna persona o team"
          description="Crea la prima persona o il primo team. Potrai assegnarli a progetti e attività."
        >
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCreating("persona")}>
              Nuova persona
            </Button>
            <Button onClick={() => setCreating("team")}>Nuovo team</Button>
          </div>
        </EmptyState>
      ) : (
        <>
          <div className="surface-panel p-3">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca nome o email"
            />
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              icon={SearchXIcon}
              title="Nessun risultato"
              description="Prova un altro nome o un’email."
            />
          ) : (
            <div className="space-y-8">
              <PersonGroup
                title="Persone"
                people={persone}
                onOpen={setSelected}
              />
              <PersonGroup title="Team" people={team} onOpen={setSelected} />
            </div>
          )}
        </>
      )}

      <PersonDialog
        open={creating !== null}
        onOpenChange={(open) => {
          if (!open) setCreating(null)
        }}
        defaultKind={creating ?? "persona"}
      />
      <PersonDialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        person={selected}
      />
    </div>
  )
}

function PersonGroup({
  title,
  people,
  onOpen,
}: {
  title: string
  people: Person[]
  onOpen: (person: Person) => void
}) {
  if (people.length === 0) return null
  return (
    <section className="space-y-2">
      <h2 className="font-heading text-sm font-medium tracking-wide uppercase">
        {title}
      </h2>
      <div className="surface divide-y divide-border overflow-hidden">
        {people.map((person) => (
          <button
            key={person.id}
            type="button"
            onClick={() => onOpen(person)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
          >
            <span className="min-w-0 flex-1">
              <span className="font-heading block truncate font-medium">
                {person.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {person.email || "Email mancante"}
                {person.kind === "team" && person.memberIds.length > 0
                  ? ` · ${
                      person.memberIds.length === 1
                        ? "1 membro"
                        : `${person.memberIds.length} membri`
                    }`
                  : ""}
              </span>
            </span>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 font-medium",
                person.kind === "team"
                  ? "border-badge-warn/40 bg-badge-warn text-badge-warn-fg"
                  : "border-badge-info/40 bg-badge-info text-badge-info-fg",
              )}
            >
              {PERSON_KIND_LABELS[person.kind]}
            </Badge>
            {person.archivedAt ? (
              <Badge variant="outline" className="shrink-0 text-muted-foreground">
                Disattivata
              </Badge>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  )
}
