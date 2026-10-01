"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarIcon, ExternalLinkIcon } from "lucide-react"
import { cn } from "cn"
import { toast } from "sonner"
import { AppSelect } from "@/components/app-select"
import { ActivityAttachmentsField } from "@/components/activity-attachments"
import { CategoryField } from "@/components/category-field"
import { FormField, FormSection } from "@/components/form-section"
import { PersonField } from "@/components/person-field"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/labels"
import { useNimbus } from "@/lib/store"
import {
  buildGoogleCalendarAllDayUrl,
  buildGoogleCalendarEventUrl,
} from "@/lib/google-calendar"
import { personName, personNames } from "@/lib/people"
import { safeHttpUrl } from "@/lib/urls"
import {
  buildStartsAt,
  taskByActivityId,
  taskDate,
  taskTime,
} from "@/lib/tasks"
import {
  NONE_PROJECT,
  type Activity,
  type ActivitySource,
  type ActivityStatus,
  type Priority,
} from "@/lib/types"

const DIALOG_STATUSES: ActivityStatus[] = [
  "in_attesa",
  "in_corso",
  "fatto",
  "fallita",
]

type FormState = {
  title: string
  description: string
  projectId: string
  source: ActivitySource
  requesterId: string | null
  responsibleId: string | null
  participantIds: string[]
  reminderOn: string
  status: ActivityStatus
  priority: Priority
  waitingOnPersonId: string | null
  waitingReason: string
  closingNote: string
  driveUrl: string
  categoryId: string | null
  taskDate: string
  taskStart: string
  taskEnd: string
  taskExecutorIds: string[]
  taskNotes: string
  taskPlanned: boolean
}

const emptyForm = (defaults?: Partial<FormState>): FormState => ({
  title: "",
  description: "",
  projectId: NONE_PROJECT,
  source: "altro",
  requesterId: null,
  responsibleId: null,
  participantIds: [],
  reminderOn: "",
  status: "in_attesa",
  priority: "media",
  waitingOnPersonId: null,
  waitingReason: "",
  closingNote: "",
  driveUrl: "",
  categoryId: null,
  taskDate: "",
  taskStart: "",
  taskEnd: "",
  taskExecutorIds: [],
  taskNotes: "",
  taskPlanned: false,
  ...defaults,
})

function fromActivity(
  activity: Activity,
  task: ReturnType<typeof taskByActivityId>,
): FormState {
  const status =
    activity.status === "inbox" ? "in_attesa" : activity.status
  return {
    title: activity.title,
    description: activity.description,
    projectId: activity.projectId ?? NONE_PROJECT,
    source: activity.source || "altro",
    requesterId: activity.requesterId,
    responsibleId: activity.responsibleId,
    participantIds: activity.participantIds,
    reminderOn: activity.reminderOn ?? "",
    status,
    priority: activity.priority,
    waitingOnPersonId: activity.waitingOnPersonId,
    waitingReason: activity.waitingReason,
    closingNote: activity.closingNote,
    driveUrl: activity.driveUrl,
    categoryId: activity.categoryId,
    taskDate: task ? taskDate(task.startsAt) : "",
    taskStart: task ? taskTime(task.startsAt) : "",
    taskEnd: task ? taskTime(task.endsAt) : "",
    taskExecutorIds: task?.executorIds ?? [],
    taskNotes: task?.notes ?? "",
    taskPlanned: Boolean(task),
  }
}

const SHOW_DRIVE_AND_ATTACHMENTS = false
const SHOW_CATEGORY = false

const heroInputClass =
  "min-h-14 field-sizing-content resize-none border-input/80 px-3 py-2.5 font-heading text-xl leading-snug md:text-xl"

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
  const {
    store,
    addActivity,
    updateActivity,
    deleteActivity,
    upsertTask,
    removeTask,
    uploadActivityFiles,
    removeActivityAttachment,
    upsertPerson,
    upsertCategory,
    readOnly,
  } = useNimbus()
  const existingTask = activity
    ? taskByActivityId(store.tasks, activity.id)
    : undefined
  const [form, setForm] = useState<FormState>(() =>
    activity ? fromActivity(activity, existingTask) : emptyForm(defaults),
  )
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function applyTask(activityId: string) {
    if (!form.taskPlanned) {
      if (existingTask) removeTask(activityId)
      return
    }
    if (!form.taskDate) {
      throw new Error("Per il task serve almeno la data.")
    }
    const startsAt = buildStartsAt(form.taskDate, form.taskStart)
    const endsAt =
      form.taskEnd.trim()
        ? buildStartsAt(form.taskDate, form.taskEnd)
        : null
    upsertTask({
      activityId,
      startsAt,
      endsAt,
      executorIds: form.taskExecutorIds,
      notes: form.taskNotes.trim(),
    })
  }

  async function save() {
    if (!form.title.trim()) {
      setError("Serve un titolo, anche breve.")
      return
    }
    if (!form.responsibleId) {
      setError("Serve il responsabile dell'attività.")
      return
    }
    if (form.driveUrl.trim() && !safeHttpUrl(form.driveUrl)) {
      setError("Il link Drive deve iniziare con http:// o https://")
      return
    }
    if (form.taskPlanned && !form.taskDate) {
      setError("Per pianificare il task serve una data.")
      return
    }
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      projectId: form.projectId === NONE_PROJECT ? null : form.projectId,
      source: form.source,
      requesterId: form.requesterId,
      responsibleId: form.responsibleId,
      participantIds: form.participantIds,
      reminderOn: form.reminderOn.trim() || null,
      status: form.status === "inbox" ? "in_attesa" : form.status,
      priority: form.priority,
      waitingOnPersonId: form.waitingOnPersonId,
      waitingReason: form.waitingReason.trim(),
      closingNote: form.closingNote.trim(),
      driveUrl: form.driveUrl.trim(),
      categoryId: form.projectId === NONE_PROJECT ? null : form.categoryId,
    }
    setBusy(true)
    try {
      if (activity) {
        updateActivity(activity.id, payload)
        applyTask(activity.id)
        toast.success("Attività aggiornata")
        onOpenChange(false)
        return
      }
      const created = addActivity({ ...payload, attachments: [] })
      applyTask(created.id)
      if (pendingFiles.length > 0) {
        await uploadActivityFiles(created.id, pendingFiles)
      }
      toast.success("Attività creata")
      onOpenChange(false)
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Non riesco a salvare",
      )
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
          ?.participantIds ?? [])

  const eventTitle = useMemo(() => {
    const project =
      form.projectId !== NONE_PROJECT
        ? store.projects.find((item) => item.id === form.projectId)
        : undefined
    const titleBase = form.title.trim() || "Attività"
    return project?.name ? `${project.name} · ${titleBase}` : titleBase
  }, [form.projectId, form.title, store.projects])

  const calendarDetails = useMemo(() => {
    const detailsLines: string[] = []
    if (form.description.trim()) {
      detailsLines.push(form.description.trim())
    }
    const requester = personName(store.people, form.requesterId)
    const responsible = personName(store.people, form.responsibleId)
    const participants = personNames(store.people, form.participantIds)
    if (requester) detailsLines.push(`Richiesto da: ${requester}`)
    if (responsible) detailsLines.push(`Responsabile: ${responsible}`)
    if (participants) detailsLines.push(`Coinvolti: ${participants}`)
    const waiting = personName(store.people, form.waitingOnPersonId)
    if (waiting) {
      detailsLines.push(`In attesa di: ${waiting}`)
      if (form.waitingReason.trim()) {
        detailsLines.push(`Motivo: ${form.waitingReason.trim()}`)
      }
    }
    return detailsLines
  }, [
    form.description,
    form.requesterId,
    form.responsibleId,
    form.participantIds,
    form.waitingOnPersonId,
    form.waitingReason,
    store.people,
  ])

  const googleCalendarUrl = useMemo(() => {
    if (!form.taskPlanned || !form.taskDate) return null
    const startsAt = buildStartsAt(form.taskDate, form.taskStart)
    const endsAt = form.taskEnd.trim()
      ? buildStartsAt(form.taskDate, form.taskEnd)
      : null
    const executors = personNames(store.people, form.taskExecutorIds)
    const detailsLines = [...calendarDetails]
    if (form.taskNotes.trim()) {
      detailsLines.push(`Nota slot: ${form.taskNotes.trim()}`)
    }
    if (executors) {
      detailsLines.push(`Esecutori: ${executors}`)
    }
    if (form.driveUrl.trim()) {
      detailsLines.push(`Drive: ${form.driveUrl.trim()}`)
    }
    return buildGoogleCalendarEventUrl({
      title: eventTitle,
      startsAt,
      endsAt,
      detailsLines,
    })
  }, [form, store.people, calendarDetails, eventTitle])

  const reminderCalendarUrl = useMemo(() => {
    if (!form.reminderOn) return null
    const detailsLines = [...calendarDetails]
    if (form.driveUrl.trim()) {
      detailsLines.push(`Drive: ${form.driveUrl.trim()}`)
    }
    return buildGoogleCalendarAllDayUrl({
      title: eventTitle,
      dateISO: form.reminderOn,
      detailsLines,
    })
  }, [form.reminderOn, form.driveUrl, calendarDetails, eventTitle])
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
        <Textarea
          id="act-title"
          value={form.title}
          onChange={(event) => patch("title", event.target.value)}
          placeholder="Titolo dell'attività"
          className={heroInputClass}
          aria-label="Titolo"
          rows={2}
        />
      </DialogHeader>
      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto pr-1">
        <div className="grid content-start gap-4 md:grid-cols-2 md:gap-6">
          <FormSection title="Persone">
            <FormField label="Responsabile" htmlFor="act-responsible">
              <PersonField
                id="act-responsible"
                people={store.people}
                value={form.responsibleId ? [form.responsibleId] : []}
                onChange={(ids) => patch("responsibleId", ids[0] ?? null)}
                onCreate={upsertPerson}
                multiple={false}
                placeholder="Chi è accountable del risultato"
              />
            </FormField>
            <FormField label="Richiesto da" htmlFor="act-req">
              <PersonField
                id="act-req"
                people={store.people}
                value={form.requesterId ? [form.requesterId] : []}
                onChange={(ids) => patch("requesterId", ids[0] ?? null)}
                onCreate={upsertPerson}
                multiple={false}
                placeholder="Chi ha originato la richiesta"
              />
            </FormField>
            <FormField label="Coinvolti" htmlFor="act-participants">
              <PersonField
                id="act-participants"
                people={store.people}
                value={form.participantIds}
                onChange={(ids) => patch("participantIds", ids)}
                onCreate={upsertPerson}
                suggestIds={projectPeople}
                placeholder="Persone o team da tenere in copia"
              />
            </FormField>
          </FormSection>
          <FormSection title="Piano">
            <FormField label="Progetto" htmlFor="act-project">
              <div className="grid gap-1.5">
                <AppSelect
                  id="act-project"
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
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto justify-start px-0"
                    onClick={() => {
                      onOpenChange(false)
                      router.push(`/progetti/${form.projectId}`)
                    }}
                  >
                    Vai al progetto
                    <ExternalLinkIcon className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            </FormField>
            {SHOW_CATEGORY && form.projectId !== NONE_PROJECT ? (
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
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Stato" htmlFor="act-status">
                <AppSelect
                  id="act-status"
                  value={form.status === "inbox" ? "in_attesa" : form.status}
                  onChange={(value) => patch("status", value as ActivityStatus)}
                  options={DIALOG_STATUSES.map((value) => ({
                    value,
                    label: STATUS_LABELS[value],
                  }))}
                />
              </FormField>
              <FormField label="Priorità" htmlFor="act-priority">
                <AppSelect
                  id="act-priority"
                  value={form.priority}
                  onChange={(value) => patch("priority", value as Priority)}
                  options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </FormField>
            </div>
            {form.status === "fatto" || form.status === "fallita" ? (
              <FormField label="Nota di chiusura" htmlFor="act-closing">
                <Textarea
                  id="act-closing"
                  value={form.closingNote}
                  onChange={(event) => patch("closingNote", event.target.value)}
                  placeholder="Come si è chiusa, cosa è rimasto in Drive, chi ha sbloccato"
                />
              </FormField>
            ) : null}
            <FormField label="Scadenza / reminder" htmlFor="act-reminder">
              <Input
                id="act-reminder"
                type="date"
                value={form.reminderOn}
                onChange={(event) => patch("reminderOn", event.target.value)}
                className="min-w-[12rem] w-auto"
              />
              {form.reminderOn && reminderCalendarUrl ? (
                <div className="grid gap-1.5">
                  <a
                    href={reminderCalendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "w-full justify-center sm:w-auto",
                    )}
                  >
                    <CalendarIcon />
                    Aggiungi al calendario
                  </a>
                  <p className="text-xs text-muted-foreground">
                    Evento giornaliero sulla data di scadenza.
                  </p>
                </div>
              ) : null}
            </FormField>
          </FormSection>
        </div>
        <FormSection title="Note">
          <Textarea
            id="act-desc"
            value={form.description}
            onChange={(event) => patch("description", event.target.value)}
            placeholder="Dettagli, contesto o chi sta bloccando"
            aria-label="Note"
          />
          {SHOW_DRIVE_AND_ATTACHMENTS ? (
            <>
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
                  disabled={busy || readOnly}
                />
              </FormField>
            </>
          ) : null}
        </FormSection>
        <FormSection title="Pianificazione">
            {!form.taskPlanned ? (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    taskPlanned: true,
                  }))
                }
              >
                Pianifica esecuzione
              </Button>
            ) : (
              <div className="grid gap-3">
                <div className="flex min-w-0 flex-wrap gap-3">
                  <FormField label="Data" htmlFor="task-date" className="min-w-[12rem] flex-1">
                    <Input
                      id="task-date"
                      type="date"
                      value={form.taskDate}
                      onChange={(event) => patch("taskDate", event.target.value)}
                      className="min-w-[12rem] w-auto"
                    />
                  </FormField>
                  <FormField label="Inizio" htmlFor="task-start" className="min-w-[8.5rem] flex-1">
                    <Input
                      id="task-start"
                      type="time"
                      value={form.taskStart}
                      onChange={(event) => patch("taskStart", event.target.value)}
                      className="min-w-[8.5rem] w-auto"
                    />
                  </FormField>
                  <FormField label="Fine" htmlFor="task-end" className="min-w-[8.5rem] flex-1">
                    <Input
                      id="task-end"
                      type="time"
                      value={form.taskEnd}
                      onChange={(event) => patch("taskEnd", event.target.value)}
                      className="min-w-[8.5rem] w-auto"
                    />
                  </FormField>
                </div>
                <FormField label="Esecutori" htmlFor="task-people">
                  <PersonField
                    id="task-people"
                    people={store.people}
                    value={form.taskExecutorIds}
                    onChange={(ids) => patch("taskExecutorIds", ids)}
                    onCreate={upsertPerson}
                    suggestIds={projectPeople}
                    placeholder="Chi esegue materialmente lo slot"
                  />
                </FormField>
                <FormField label="Nota dello slot" htmlFor="task-notes">
                  <Input
                    id="task-notes"
                    value={form.taskNotes}
                    onChange={(event) => patch("taskNotes", event.target.value)}
                    placeholder="Nota per questo slot"
                  />
                </FormField>
                {form.taskDate && googleCalendarUrl ? (
                  <div className="grid gap-1.5">
                    <a
                      href={googleCalendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "w-full justify-center sm:w-auto",
                      )}
                    >
                      <CalendarIcon />
                      Aggiungi al calendario
                    </a>
                    <p className="text-xs text-muted-foreground">
                      Apre Google Calendar con titolo e orario già compilati.
                    </p>
                  </div>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  className="justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      taskPlanned: false,
                      taskDate: "",
                      taskStart: "",
                      taskEnd: "",
                      taskExecutorIds: [],
                      taskNotes: "",
                    }))
                  }
                >
                  Rimuovi task
                </Button>
              </div>
            )}
          </FormSection>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <DialogFooter className={activity ? "sm:justify-between" : undefined}>
        {activity ? (
          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={remove}
            disabled={readOnly}
          >
            Elimina
          </Button>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          {readOnly ? (
            <p className="text-xs text-muted-foreground">Sola lettura</p>
          ) : null}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {readOnly ? "Chiudi" : "Annulla"}
          </Button>
          <Button onClick={() => void save()} disabled={busy || readOnly}>
            {busy ? "Salvataggio…" : "Salva"}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  )
}
