"use client"

import { useState } from "react"
import { toast } from "sonner"
import { AppSelect } from "@/components/app-select"
import { FormField } from "@/components/form-section"
import { PersonField } from "@/components/person-field"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { PERSON_KIND_LABELS } from "@/lib/labels"
import { cleanPersonName, findPersonByName } from "@/lib/people"
import { useNimbus } from "@/lib/store"
import type { Person, PersonKind } from "@/lib/types"

type FormState = {
  name: string
  kind: PersonKind
  memberIds: string[]
}

function emptyForm(kind: PersonKind): FormState {
  return { name: "", kind, memberIds: [] }
}

function fromPerson(person: Person): FormState {
  return {
    name: person.name,
    kind: person.kind,
    memberIds: person.memberIds,
  }
}

export function PersonDialog({
  open,
  onOpenChange,
  person,
  defaultKind = "persona",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  person?: Person | null
  defaultKind?: PersonKind
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <PersonDialogForm
          person={person}
          defaultKind={defaultKind}
          onOpenChange={onOpenChange}
        />
      ) : null}
    </Dialog>
  )
}

function PersonDialogForm({
  person,
  defaultKind,
  onOpenChange,
}: {
  person?: Person | null
  defaultKind: PersonKind
  onOpenChange: (open: boolean) => void
}) {
  const {
    store,
    upsertPerson,
    updatePerson,
    archivePerson,
    restorePerson,
    readOnly,
  } = useNimbus()
  const [form, setForm] = useState<FormState>(() =>
    person ? fromPerson(person) : emptyForm(defaultKind),
  )
  const [error, setError] = useState("")

  function save() {
    const name = cleanPersonName(form.name)
    if (!name) {
      setError("Serve un nome.")
      return
    }
    const existing = findPersonByName(store.people, name)
    if (existing && existing.id !== person?.id) {
      setError("Esiste già una persona o un team con questo nome.")
      return
    }
    if (person) {
      updatePerson(person.id, {
        name,
        kind: form.kind,
        memberIds: form.kind === "team" ? form.memberIds : [],
      })
      toast.success("Anagrafica aggiornata")
    } else {
      const created = upsertPerson(name, form.kind)
      if (!created) {
        setError("Non riesco a creare l’anagrafica.")
        return
      }
      if (form.kind === "team" && form.memberIds.length > 0) {
        updatePerson(created.id, { kind: "team", memberIds: form.memberIds })
      }
      toast.success(form.kind === "team" ? "Team creato" : "Persona creata")
    }
    onOpenChange(false)
  }

  function archive() {
    if (!person) return
    archivePerson(person.id)
    toast.success("Disattivata. Resta visibile dove è già assegnata.")
    onOpenChange(false)
  }

  function restore() {
    if (!person) return
    restorePerson(person.id)
    toast.success("Riattivata")
    onOpenChange(false)
  }

  const memberPeople = store.people.filter(
    (item) => item.kind === "persona" || form.memberIds.includes(item.id),
  )

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {person
            ? "Modifica"
            : defaultKind === "team"
              ? "Nuovo team"
              : "Nuova persona"}
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-4">
        <FormField label="Nome" htmlFor="ppl-name">
          <Input
            id="ppl-name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder={
              form.kind === "team" ? "Es. NetOps" : "Nome e cognome"
            }
          />
        </FormField>
        <FormField label="Tipo" htmlFor="ppl-kind">
          <AppSelect
            id="ppl-kind"
            value={form.kind}
            onChange={(value) =>
              setForm({
                ...form,
                kind: value as PersonKind,
                memberIds: value === "team" ? form.memberIds : [],
              })
            }
            options={Object.entries(PERSON_KIND_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </FormField>
        {form.kind === "team" ? (
          <FormField label="Membri (opzionale)" htmlFor="ppl-members">
            <PersonField
              id="ppl-members"
              people={memberPeople}
              value={form.memberIds}
              onChange={(memberIds) => setForm({ ...form, memberIds })}
              onCreate={upsertPerson}
              placeholder="Persone del team, se le conosci"
            />
            <p className="text-xs text-muted-foreground">
              Un team si può usare come responsabile o esecutore anche senza
              membri.
            </p>
          </FormField>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <DialogFooter className={person ? "sm:justify-between" : undefined}>
        {person ? (
          person.archivedAt ? (
            <Button variant="outline" onClick={restore} disabled={readOnly}>
              Riattiva
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={archive}
              disabled={readOnly}
            >
              Disattiva
            </Button>
          )
        ) : null}
        <div className="flex items-center gap-2">
          {readOnly ? (
            <p className="text-xs text-muted-foreground">Sola lettura</p>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? "Chiudi" : "Annulla"}
          </Button>
          <Button onClick={save} disabled={readOnly}>
            Salva
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  )
}
