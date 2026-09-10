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
import {
  PRIORITY_LABELS,
  SOURCE_LABELS,
  STATUS_LABELS,
  TYPE_LABELS,
} from "@/lib/labels"
import { useNimbus } from "@/lib/store"
import {
  NONE_PROJECT,
  type Activity,
  type ActivitySource,
  type ActivityStatus,
  type ActivityType,
  type Priority,
} from "@/lib/types"

type FormState = {
  title: string
  description: string
  projectId: string
  source: ActivitySource
  requester: string
  type: ActivityType
  status: ActivityStatus
  priority: Priority
  dueDate: string
  waitingOn: string
  waitingReason: string
  driveUrl: string
}

const emptyForm = (defaults?: Partial<FormState>): FormState => ({
  title: "",
  description: "",
  projectId: NONE_PROJECT,
  source: "email",
  requester: "",
  type: "eseguo",
  status: "inbox",
  priority: "media",
  dueDate: "",
  waitingOn: "",
  waitingReason: "",
  driveUrl: "",
  ...defaults,
})

function fromActivity(activity: Activity): FormState {
  return {
    title: activity.title,
    description: activity.description,
    projectId: activity.projectId ?? NONE_PROJECT,
    source: activity.source,
    requester: activity.requester,
    type: activity.type,
    status: activity.status,
    priority: activity.priority,
    dueDate: activity.dueDate ?? "",
    waitingOn: activity.waitingOn,
    waitingReason: activity.waitingReason,
    driveUrl: activity.driveUrl,
  }
}

export function ActivityDialog({
  open,
  onOpenChange,
  activity,
  defaults,
  heading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  activity?: Activity | null
  defaults?: Partial<FormState>
  heading?: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <ActivityDialogForm
          activity={activity}
          defaults={defaults}
          heading={heading}
          onOpenChange={onOpenChange}
        />
      ) : null}
    </Dialog>
  )
}

function ActivityDialogForm({
  activity,
  defaults,
  heading,
  onOpenChange,
}: {
  activity?: Activity | null
  defaults?: Partial<FormState>
  heading?: string
  onOpenChange: (open: boolean) => void
}) {
  const { store, addActivity, updateActivity, deleteActivity } = useNimbus()
  const [form, setForm] = useState<FormState>(() =>
    activity ? fromActivity(activity) : emptyForm(defaults),
  )
  const [error, setError] = useState("")

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function save() {
    if (!form.title.trim()) {
      setError("Serve un titolo, anche breve.")
      return
    }
    if (form.driveUrl && !/^https?:\/\//i.test(form.driveUrl)) {
      setError("Il link Drive deve iniziare con http:// o https://")
      return
    }
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      projectId: form.projectId === NONE_PROJECT ? null : form.projectId,
      source: form.source,
      requester: form.requester.trim(),
      type: form.type,
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate || null,
      waitingOn: form.waitingOn.trim(),
      waitingReason: form.waitingReason.trim(),
      driveUrl: form.driveUrl.trim(),
    }
    if (activity) {
      updateActivity(activity.id, payload)
      toast.success("Attività aggiornata")
    } else {
      addActivity(payload)
      toast.success("Attività creata")
    }
    onOpenChange(false)
  }

  function remove() {
    if (!activity) return
    deleteActivity(activity.id)
    toast.success("Attività eliminata")
    onOpenChange(false)
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>
          {heading ?? (activity ? "Modifica attività" : "Nuova attività")}
        </DialogTitle>
        <DialogDescription>
          Distingui se la fai tu o se stai coordinando qualcun altro. Il link
          Drive è facoltativo: incollalo a mano.
        </DialogDescription>
      </DialogHeader>
      <div className="grid max-h-[min(60vh,32rem)] gap-3 overflow-y-auto pr-1">
        <Field label="Titolo" htmlFor="act-title">
          <Input
            id="act-title"
            value={form.title}
            onChange={(event) => patch("title", event.target.value)}
            placeholder="Cosa ti hanno chiesto?"
          />
        </Field>
        <Field label="Note" htmlFor="act-desc">
          <Textarea
            id="act-desc"
            value={form.description}
            onChange={(event) => patch("description", event.target.value)}
            placeholder="Contesto dalla mail o dalla chat"
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Origine">
            <AppSelect
              value={form.source}
              onChange={(value) => patch("source", value as ActivitySource)}
              options={Object.entries(SOURCE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </Field>
          <Field label="Richiedente" htmlFor="act-req">
            <Input
              id="act-req"
              value={form.requester}
              onChange={(event) => patch("requester", event.target.value)}
              placeholder="Chi te l'ha chiesto"
            />
          </Field>
        </div>
        <Field label="Progetto">
          <AppSelect
            value={form.projectId}
            onChange={(value) => patch("projectId", value)}
            options={[
              { value: NONE_PROJECT, label: "Nessun progetto" },
              ...store.projects.map((project) => ({
                value: project.id,
                label: project.name,
              })),
            ]}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tipo">
            <AppSelect
              value={form.type}
              onChange={(value) => patch("type", value as ActivityType)}
              options={Object.entries(TYPE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </Field>
          <Field label="Stato">
            <AppSelect
              value={form.status}
              onChange={(value) => patch("status", value as ActivityStatus)}
              options={Object.entries(STATUS_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Priorità">
            <AppSelect
              value={form.priority}
              onChange={(value) => patch("priority", value as Priority)}
              options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </Field>
          <Field label="Scadenza" htmlFor="act-due">
            <Input
              id="act-due"
              type="date"
              value={form.dueDate}
              onChange={(event) => patch("dueDate", event.target.value)}
            />
          </Field>
        </div>
        {form.type === "coordino" || form.status === "in_attesa" ? (
          <div className="grid gap-3 rounded-lg bg-amber-50 p-3 sm:grid-cols-2">
            <Field label="In attesa di" htmlFor="act-wait">
              <Input
                id="act-wait"
                value={form.waitingOn}
                onChange={(event) => patch("waitingOn", event.target.value)}
                placeholder="Nome o team"
              />
            </Field>
            <Field label="Perché è fermo" htmlFor="act-reason">
              <Input
                id="act-reason"
                value={form.waitingReason}
                onChange={(event) => patch("waitingReason", event.target.value)}
                placeholder="Cosa manca"
              />
            </Field>
          </div>
        ) : null}
        <Field label="Link Drive" htmlFor="act-drive">
          <Input
            id="act-drive"
            value={form.driveUrl}
            onChange={(event) => patch("driveUrl", event.target.value)}
            placeholder="https://drive.google.com/..."
          />
        </Field>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
      <DialogFooter className={activity ? "sm:justify-between" : undefined}>
        {activity ? (
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

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}
