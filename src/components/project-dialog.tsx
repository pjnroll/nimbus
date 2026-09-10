"use client"

import { useState } from "react"
import { toast } from "sonner"
import { AppSelect } from "@/components/app-select"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PROJECT_STATUS_LABELS } from "@/lib/labels"
import { useNimbus } from "@/lib/store"
import type { Project, ProjectStatus } from "@/lib/types"

type FormState = {
  name: string
  client: string
  status: ProjectStatus
  driveUrl: string
  people: string
  notes: string
}

function emptyForm(): FormState {
  return {
    name: "",
    client: "",
    status: "attivo",
    driveUrl: "",
    people: "",
    notes: "",
  }
}

function fromProject(project: Project): FormState {
  return {
    name: project.name,
    client: project.client,
    status: project.status,
    driveUrl: project.driveUrl,
    people: project.people,
    notes: project.notes,
  }
}

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
  const { addProject, updateProject, deleteProject } = useNimbus()
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
      driveUrl: form.driveUrl.trim(),
      people: form.people.trim(),
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
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{project ? "Modifica progetto" : "Nuovo progetto"}</DialogTitle>
        <DialogDescription>
          Un progetto raggruppa le attività e tiene il link alla cartella Drive,
          senza sincronizzare Google.
        </DialogDescription>
      </DialogHeader>
      <div className="grid max-h-[min(60vh,32rem)] gap-3 overflow-y-auto pr-1">
        <div className="grid gap-1.5">
          <Label htmlFor="prj-name">Nome</Label>
          <Input
            id="prj-name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Es. Cloud AWS · Piattaforma Tributi"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="prj-client">Cliente / ambito</Label>
            <Input
              id="prj-client"
              value={form.client}
              onChange={(event) =>
                setForm({ ...form, client: event.target.value })
              }
              placeholder="Area, ente, pratica"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Stato</Label>
            <AppSelect
              value={form.status}
              onChange={(value) =>
                setForm({ ...form, status: value as ProjectStatus })
              }
              options={Object.entries(PROJECT_STATUS_LABELS).map(
                ([value, label]) => ({ value, label }),
              )}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="prj-drive">Cartella Drive</Label>
          <Input
            id="prj-drive"
            value={form.driveUrl}
            onChange={(event) =>
              setForm({ ...form, driveUrl: event.target.value })
            }
            placeholder="https://drive.google.com/drive/folders/..."
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="prj-people">Persone coinvolte</Label>
          <Input
            id="prj-people"
            value={form.people}
            onChange={(event) =>
              setForm({ ...form, people: event.target.value })
            }
            placeholder="Nomi, ruoli, team"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="prj-notes">Note</Label>
          <Textarea
            id="prj-notes"
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            placeholder="Contesto che nel foglio finiva in una colonna infinita"
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
      <DialogFooter className={project ? "sm:justify-between" : undefined}>
        {project ? (
          <Button variant="destructive" onClick={remove}>
            Elimina
          </Button>
        ) : (
          <span />
        )}
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
