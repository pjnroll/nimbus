"use client"

import { useState } from "react"
import { toast } from "sonner"
import { AppSelect } from "@/components/app-select"
import { CategoryField } from "@/components/category-field"
import { FormField, FormSection } from "@/components/form-section"
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
import { Textarea } from "@/components/ui/textarea"
import { PROJECT_STATUS_LABELS } from "@/lib/labels"
import { cleanCategoryName, findCategoryByName } from "@/lib/categories"
import { newId } from "@/lib/people"
import {
  PROJECT_COLOR_OPTIONS,
  type ProjectColorId,
} from "@/lib/project-color"
import { useNimbus } from "@/lib/store"
import type { Category, Project, ProjectStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

type FormState = {
  name: string
  client: string
  status: ProjectStatus
  color: ProjectColorId
  driveUrl: string
  personIds: string[]
  categories: Category[]
  notes: string
}

function emptyForm(): FormState {
  return {
    name: "",
    client: "",
    status: "attivo",
    color: "teal",
    driveUrl: "",
    personIds: [],
    categories: [],
    notes: "",
  }
}

function fromProject(project: Project): FormState {
  return {
    name: project.name,
    client: project.client,
    status: project.status,
    color: project.color,
    driveUrl: project.driveUrl,
    personIds: project.personIds,
    categories: project.categories ?? [],
    notes: project.notes,
  }
}

const heroInputClass =
  "h-11 border-input/80 px-3 font-heading text-xl md:text-xl"

export function ProjectDialog({
  open,
  onOpenChange,
  project,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project | null
  onCreated?: (id: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <ProjectDialogForm
          project={project}
          onCreated={onCreated}
          onOpenChange={onOpenChange}
        />
      ) : null}
    </Dialog>
  )
}

function ProjectDialogForm({
  project,
  onCreated,
  onOpenChange,
}: {
  project?: Project | null
  onCreated?: (id: string) => void
  onOpenChange: (open: boolean) => void
}) {
  const { store, addProject, updateProject, deleteProject, upsertPerson } =
    useNimbus()
  const [form, setForm] = useState<FormState>(() =>
    project ? fromProject(project) : emptyForm(),
  )
  const [error, setError] = useState("")

  function save() {
    if (!form.name.trim()) {
      setError("Il progetto ha bisogno di un nome.")
      return
    }
    if (form.driveUrl && !/^https?:\/\//i.test(form.driveUrl)) {
      setError("Il link Drive deve iniziare con http:// o https://")
      return
    }
    const payload = {
      name: form.name.trim(),
      client: form.client.trim(),
      status: form.status,
      color: form.color,
      driveUrl: form.driveUrl.trim(),
      personIds: form.personIds,
      categories: form.categories,
      notes: form.notes.trim(),
    }
    if (project) {
      updateProject(project.id, payload)
      toast.success("Progetto aggiornato")
    } else {
      const created = addProject(payload)
      toast.success("Progetto creato")
      onCreated?.(created.id)
    }
    onOpenChange(false)
  }

  function remove() {
    if (!project) return
    deleteProject(project.id)
    toast.success("Progetto eliminato. Le attività restano, senza progetto.")
    onOpenChange(false)
  }

  return (
    <DialogContent size="lg">
      <DialogHeader className="gap-3 pr-8">
        <DialogTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {project ? "Modifica progetto" : "Nuovo progetto"}
        </DialogTitle>
        <Input
          id="prj-name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          placeholder="Es. Cloud AWS · Piattaforma Tributi"
          className={heroInputClass}
          aria-label="Nome"
        />
      </DialogHeader>
      <div className="grid max-h-[min(70vh,42rem)] gap-6 overflow-y-auto pr-1 md:grid-cols-2">
        <FormSection title="Scheda">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Cliente / ambito" htmlFor="prj-client">
              <Input
                id="prj-client"
                value={form.client}
                onChange={(event) =>
                  setForm({ ...form, client: event.target.value })
                }
                placeholder="Area, ente, pratica"
              />
            </FormField>
            <FormField label="Stato">
              <AppSelect
                value={form.status}
                onChange={(value) =>
                  setForm({ ...form, status: value as ProjectStatus })
                }
                options={Object.entries(PROJECT_STATUS_LABELS).map(
                  ([value, label]) => ({ value, label }),
                )}
              />
            </FormField>
          </div>
          <FormField label="Colore">
            <div className="flex flex-wrap gap-2" role="listbox" aria-label="Colore progetto">
              {PROJECT_COLOR_OPTIONS.map((option) => {
                const selected = form.color === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    title={option.label}
                    onClick={() => setForm({ ...form, color: option.id })}
                    className={cn(
                      "size-7 rounded-full ring-offset-2 transition-shadow",
                      option.swatchClass,
                      selected
                        ? "ring-2 ring-foreground"
                        : "ring-1 ring-foreground/15 hover:ring-foreground/40",
                    )}
                  >
                    <span className="sr-only">{option.label}</span>
                  </button>
                )
              })}
            </div>
          </FormField>
          <FormField label="Cartella Drive" htmlFor="prj-drive">
            <Input
              id="prj-drive"
              value={form.driveUrl}
              onChange={(event) =>
                setForm({ ...form, driveUrl: event.target.value })
              }
              placeholder="https://drive.google.com/drive/folders/..."
            />
          </FormField>
          <FormField label="Note" htmlFor="prj-notes">
            <Textarea
              id="prj-notes"
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="Contesto che nel foglio finiva in una colonna infinita"
            />
          </FormField>
        </FormSection>
        <FormSection title="Squadra">
          <FormField label="Persone coinvolte" htmlFor="prj-people">
            <PersonField
              id="prj-people"
              people={store.people}
              value={form.personIds}
              onChange={(personIds) => setForm({ ...form, personIds })}
              onCreate={upsertPerson}
              placeholder="Nome, poi Invio per aggiungere"
            />
          </FormField>
          <FormField label="Categorie" htmlFor="prj-categories">
            <CategoryField
              id="prj-categories"
              categories={form.categories}
              value={form.categories.map((category) => category.id)}
              onChange={(ids) =>
                setForm((current) => ({
                  ...current,
                  categories: ids
                    .map((id) =>
                      current.categories.find((category) => category.id === id),
                    )
                    .filter((category): category is Category => Boolean(category)),
                }))
              }
              onCreate={(name) => {
                const cleaned = cleanCategoryName(name)
                if (!cleaned) return null
                const existing = findCategoryByName(form.categories, cleaned)
                if (existing) return existing
                const created: Category = { id: newId(), name: cleaned }
                setForm((current) => {
                  if (findCategoryByName(current.categories, cleaned)) return current
                  return {
                    ...current,
                    categories: [...current.categories, created],
                  }
                })
                return created
              }}
              placeholder="Applicativo, Infrastruttura, Documentazione"
            />
          </FormField>
        </FormSection>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <DialogFooter className={project ? "sm:justify-between" : undefined}>
        {project ? (
          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={remove}
          >
            Elimina
          </Button>
        ) : null}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={save}>Salva</Button>
        </div>
      </DialogFooter>
    </DialogContent>
  )
}
