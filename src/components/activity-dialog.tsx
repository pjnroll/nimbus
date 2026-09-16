"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AppSelect } from "@/components/app-select"
import { ActivityAttachmentsField } from "@/components/activity-attachments"
import { CategoryField } from "@/components/category-field"
import { FormField, FormSection } from "@/components/form-section"
import { PersonField } from "@/components/person-field"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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
  requesterId: string | null
  type: ActivityType
  status: ActivityStatus
  priority: Priority
  dueDate: string
  assigneeIds: string[]
  waitingOnPersonId: string | null
  waitingReason: string
  closingNote: string
  driveUrl: string
  categoryId: string | null
}

const emptyForm = (defaults?: Partial<FormState>): FormState => ({
  title: "",
  description: "",
  projectId: NONE_PROJECT,
  source: "email",
  requesterId: null,
  type: "eseguo",
  status: "inbox",
  priority: "media",
  dueDate: "",
  assigneeIds: [],
  waitingOnPersonId: null,
  waitingReason: "",
  closingNote: "",
  driveUrl: "",
  categoryId: null,
  ...defaults,
})

function fromActivity(activity: Activity): FormState {
  return {
    title: activity.title,
    description: activity.description,
    projectId: activity.projectId ?? NONE_PROJECT,
    source: activity.source,
    requesterId: activity.requesterId,
    type: activity.type,
    status: activity.status,
    priority: activity.priority,
    dueDate: activity.dueDate ?? "",
    assigneeIds: activity.assigneeIds,
    waitingOnPersonId: activity.waitingOnPersonId,
    waitingReason: activity.waitingReason,
    closingNote: activity.closingNote,
    driveUrl: activity.driveUrl,
    categoryId: activity.categoryId,
  }
}

const heroInputClass =
  "h-11 border-input/80 px-3 font-heading text-xl md:text-xl"

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
  const router = useRouter()
  const { store, addActivity, updateActivity, deleteActivity, uploadActivityFiles, removeActivityAttachment, upsertPerson, upsertCategory } =
    useNimbus()
  const [form, setForm] = useState<FormState>(() =>
    activity ? fromActivity(activity) : emptyForm(defaults),
  )
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function save() {
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
      requesterId: form.requesterId,
      type: form.type,
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate || null,
      assigneeIds: form.assigneeIds,
      waitingOnPersonId: form.waitingOnPersonId,
      waitingReason: form.waitingReason.trim(),
      closingNote: form.closingNote.trim(),
      driveUrl: form.driveUrl.trim(),
      categoryId:
        form.projectId === NONE_PROJECT ? null : form.categoryId,
    }
    setBusy(true)
    try {
      if (activity) {
        updateActivity(activity.id, payload)
        toast.success("Attività aggiornata")
        onOpenChange(false)
        return
      }
      const created = addActivity({ ...payload, attachments: [] })
      if (pendingFiles.length > 0) {
        await uploadActivityFiles(created.id, pendingFiles)
      }
      toast.success("Attività creata")
      onOpenChange(false)
    } catch (uploadError) {
      toast.error(
        uploadError instanceof Error
          ? uploadError.message
          : "Attività salvata, ma i file non sono partiti",
      )
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  function remove() {
    if (!activity) return
    deleteActivity(activity.id)
    toast.success("Attività eliminata")
    onOpenChange(false)
  }

  const projectPeople =
    form.projectId === NONE_PROJECT
      ? []
      : (store.projects.find((project) => project.id === form.projectId)
          ?.personIds ?? [])
  const savedAttachments = activity
    ? (store.activities.find((item) => item.id === activity.id)?.attachments ??
      activity.attachments)
    : []

  return (
    <DialogContent size="lg">
      <DialogHeader className="gap-3 pr-8">
        <DialogTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {heading ?? (activity ? "Modifica attività" : "Nuova attività")}
        </DialogTitle>
        <Input
          id="act-title"
          value={form.title}
          onChange={(event) => patch("title", event.target.value)}
          placeholder="Cosa ti hanno chiesto?"
          className={heroInputClass}
          aria-label="Titolo"
        />
      </DialogHeader>
      <div className="grid max-h-[min(70vh,42rem)] gap-6 overflow-y-auto pr-1 md:grid-cols-2">
        <FormSection title="Contesto">
          <FormField label="Note" htmlFor="act-desc">
            <Textarea
              id="act-desc"
              value={form.description}
              onChange={(event) => patch("description", event.target.value)}
              placeholder="Contesto dalla mail o dalla chat"
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Origine">
              <AppSelect
                value={form.source}
                onChange={(value) => patch("source", value as ActivitySource)}
                options={Object.entries(SOURCE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </FormField>
            <FormField label="Richiedente" htmlFor="act-req">
              <PersonField
                id="act-req"
                people={store.people}
                value={form.requesterId ? [form.requesterId] : []}
                onChange={(ids) => patch("requesterId", ids[0] ?? null)}
                onCreate={upsertPerson}
                multiple={false}
                placeholder="Chi te l'ha chiesto"
              />
            </FormField>
          </div>
          <FormField label="Link Drive" htmlFor="act-drive">
            <Input
              id="act-drive"
              value={form.driveUrl}
              onChange={(event) => patch("driveUrl", event.target.value)}
              placeholder="https://drive.google.com/..."
            />
          </FormField>
          <FormField label="Allegati" htmlFor="act-files">
            <ActivityAttachmentsField
              activityId={activity?.id}
              attachments={savedAttachments}
              pendingFiles={pendingFiles}
              onPendingFiles={setPendingFiles}
              onUpload={
                activity
                  ? (files) => uploadActivityFiles(activity.id, files)
                  : undefined
              }
              onRemove={
                activity
                  ? (attachmentId) =>
                      removeActivityAttachment(activity.id, attachmentId)
                  : undefined
              }
              disabled={busy}
            />
          </FormField>
        </FormSection>
        <FormSection title="Piano">
          <FormField label="Progetto">
            <div className="grid gap-1.5">
              <AppSelect
                value={form.projectId}
                onChange={(value) => {
                  setForm((current) => {
                    const nextProject =
                      value === NONE_PROJECT
                        ? undefined
                        : store.projects.find((project) => project.id === value)
                    const keep = nextProject?.categories.some(
                      (category) => category.id === current.categoryId,
                    )
                    return {
                      ...current,
                      projectId: value,
                      categoryId: keep ? current.categoryId : null,
                    }
                  })
                }}
                options={[
                  { value: NONE_PROJECT, label: "Nessun progetto" },
                  ...[...store.projects]
                    .sort((a, b) => a.name.localeCompare(b.name, "it"))
                    .map((project) => ({
                      value: project.id,
                      label: project.name,
                    })),
                ]}
              />
              {form.projectId !== NONE_PROJECT ? (
                <button
                  type="button"
                  className="w-fit text-xs font-medium text-primary underline-offset-4 hover:underline"
                  onClick={() => {
                    onOpenChange(false)
                    router.push(`/progetti/${form.projectId}`)
                  }}
                >
                  Vai al progetto
                </button>
              ) : null}
            </div>
          </FormField>
          {form.projectId !== NONE_PROJECT ? (
            <FormField label="Categoria" htmlFor="act-category">
              <CategoryField
                id="act-category"
                categories={
                  store.projects.find((project) => project.id === form.projectId)
                    ?.categories ?? []
                }
                value={form.categoryId ? [form.categoryId] : []}
                onChange={(ids) => patch("categoryId", ids[0] ?? null)}
                onCreate={(name) => upsertCategory(form.projectId, name)}
                multiple={false}
                placeholder="Applicativo, infrastruttura, documentazione"
              />
            </FormField>
          ) : null}
          <FormField label="Svolta da" htmlFor="act-assignees">
            <PersonField
              id="act-assignees"
              people={store.people}
              value={form.assigneeIds}
              onChange={(assigneeIds) => patch("assigneeIds", assigneeIds)}
              onCreate={upsertPerson}
              suggestIds={projectPeople}
              placeholder="Chi deve svolgere l’attività"
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Tipo">
              <AppSelect
                value={form.type}
                onChange={(value) => patch("type", value as ActivityType)}
                options={Object.entries(TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </FormField>
            <FormField label="Stato">
              <AppSelect
                value={form.status}
                onChange={(value) => patch("status", value as ActivityStatus)}
                options={Object.entries(STATUS_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </FormField>
            <FormField label="Priorità">
              <AppSelect
                value={form.priority}
                onChange={(value) => patch("priority", value as Priority)}
                options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </FormField>
            <FormField label="Scadenza" htmlFor="act-due">
              <Input
                id="act-due"
                type="date"
                value={form.dueDate}
                onChange={(event) => patch("dueDate", event.target.value)}
              />
            </FormField>
          </div>
          {form.type === "coordino" || form.status === "in_attesa" ? (
            <div className="grid gap-3 rounded-lg bg-amber-50 p-3 sm:grid-cols-2">
              <FormField label="In attesa di" htmlFor="act-wait">
                <PersonField
                  id="act-wait"
                  people={store.people}
                  value={form.waitingOnPersonId ? [form.waitingOnPersonId] : []}
                  onChange={(ids) => patch("waitingOnPersonId", ids[0] ?? null)}
                  onCreate={upsertPerson}
                  multiple={false}
                  suggestIds={projectPeople}
                  placeholder="Nome o team"
                />
              </FormField>
              <FormField label="Perché è fermo" htmlFor="act-reason">
                <Input
                  id="act-reason"
                  value={form.waitingReason}
                  onChange={(event) => patch("waitingReason", event.target.value)}
                  placeholder="Cosa manca"
                />
              </FormField>
            </div>
          ) : null}
          {form.status === "fatto" ? (
            <FormField label="Nota di chiusura" htmlFor="act-closing">
              <Textarea
                id="act-closing"
                value={form.closingNote}
                onChange={(event) => patch("closingNote", event.target.value)}
                placeholder="Come si è chiusa, cosa è rimasto in Drive, chi ha sbloccato"
              />
            </FormField>
          ) : null}
        </FormSection>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <DialogFooter className={activity ? "sm:justify-between" : undefined}>
        {activity ? (
          <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={remove}>
            Elimina
          </Button>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Annulla
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? "Salvataggio…" : "Salva"}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  )
}
