"use client"

import { useMemo, useState } from "react"
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"
import { toast } from "sonner"
import { ActivityDialog } from "@/components/activity-dialog"
import { ActivityList } from "@/components/activity-list"
import { AppSelect } from "@/components/app-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { STATUS_LABELS } from "@/lib/labels"
import {
  overdueActivities,
  sortActivitiesByScheduleAscending,
  sortByTaskThenPriority,
} from "@/lib/selectors"
import { activityCategoryName } from "@/lib/categories"
import { activityPersonHaystack } from "@/lib/people"
import { useNimbus } from "@/lib/store"
import { closedActivity, taskByActivityId } from "@/lib/tasks"
import {
  NONE_CATEGORY,
  NONE_PROJECT,
  type Activity,
  type ActivityStatus,
} from "@/lib/types"

const ALL = "__all__"

const BOARD_STATUSES = [
  "in_corso",
  "in_attesa",
  "fatto",
  "fallita",
] as const satisfies readonly ActivityStatus[]

const FILTER_STATUSES: ActivityStatus[] = [
  "in_attesa",
  "in_corso",
  "fatto",
  "fallita",
]

const DEFAULT_OPEN: Record<(typeof BOARD_STATUSES)[number], boolean> = {
  in_attesa: true,
  in_corso: true,
  fatto: false,
  fallita: false,
}

export default function AttivitaPage() {
  const { store, updateActivity, deleteActivity } = useNimbus()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState(ALL)
  const [projectId, setProjectId] = useState(ALL)
  const [categoryId, setCategoryId] = useState(ALL)
  const [selected, setSelected] = useState<Activity | null>(null)
  const [creating, setCreating] = useState(false)
  const [openColumns, setOpenColumns] = useState(DEFAULT_OPEN)
  const [overdueOpen, setOverdueOpen] = useState(true)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const list = store.activities.filter((activity) => {
      if (activity.status === "inbox") return false
      if (status !== ALL && activity.status !== status) return false
      if (projectId === NONE_PROJECT && activity.projectId) return false
      if (
        projectId !== ALL &&
        projectId !== NONE_PROJECT &&
        activity.projectId !== projectId
      ) {
        return false
      }
      if (
        projectId !== ALL &&
        projectId !== NONE_PROJECT &&
        categoryId !== ALL
      ) {
        if (categoryId === NONE_CATEGORY) {
          if (activity.categoryId) return false
        } else if (activity.categoryId !== categoryId) {
          return false
        }
      }
      if (!needle) return true
      const project = store.projects.find((item) => item.id === activity.projectId)
      const task = taskByActivityId(store.tasks, activity.id)
      const haystack = [
        activity.title,
        activity.description,
        activity.closingNote,
        activityPersonHaystack(store.people, activity, task),
        task?.notes ?? "",
        activityCategoryName(store, activity),
        project?.name ?? "",
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(needle)
    })
    const open = sortActivitiesByScheduleAscending(
      list.filter((activity) => !closedActivity(activity.status)),
      store.tasks,
    )
    const closed = sortByTaskThenPriority(
      list.filter((activity) => closedActivity(activity.status)),
      store.tasks,
    )
    return [...open, ...closed]
  }, [
    store.activities,
    store.projects,
    store.people,
    store.tasks,
    query,
    status,
    projectId,
    categoryId,
  ])

  const overdue = useMemo(
    () => overdueActivities(filtered, store.tasks),
    [filtered, store.tasks],
  )
  const overdueIds = useMemo(
    () => new Set(overdue.map((activity) => activity.id)),
    [overdue],
  )

  const selectedProject =
    projectId !== ALL && projectId !== NONE_PROJECT
      ? store.projects.find((project) => project.id === projectId)
      : undefined

  function onStatus(
    id: string,
    next: Activity["status"],
    extra?: Partial<Activity>,
  ) {
    updateActivity(id, { status: next, ...extra })
    toast.success("Stato aggiornato")
  }

  function onDelete(id: string) {
    deleteActivity(id)
    toast.success("Attività eliminata")
  }

  function toggleColumn(column: (typeof BOARD_STATUSES)[number]) {
    setOpenColumns((current) => ({
      ...current,
      [column]: !current[column],
    }))
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Attività
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Organizza il lavoro per stato. Apri una scheda per i dettagli e la
            pianificazione.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>Nuova attività</Button>
      </header>

      <div
        className={`surface-panel grid gap-2 p-3 sm:grid-cols-2 ${
          selectedProject ? "lg:grid-cols-4" : "lg:grid-cols-3"
        }`}
      >
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cerca titolo, persona, progetto"
        />
        <AppSelect
          value={status}
          onChange={setStatus}
          options={[
            { value: ALL, label: "Tutti gli stati" },
            ...FILTER_STATUSES.map((value) => ({
              value,
              label: STATUS_LABELS[value],
            })),
          ]}
        />
        <AppSelect
          value={projectId}
          onChange={(value) => {
            setProjectId(value)
            setCategoryId(ALL)
          }}
          options={[
            { value: ALL, label: "Tutti i progetti" },
            { value: NONE_PROJECT, label: "Senza progetto" },
            ...[...store.projects]
              .sort((a, b) => a.name.localeCompare(b.name, "it"))
              .map((project) => ({
                value: project.id,
                label: project.name,
              })),
          ]}
        />
        {selectedProject ? (
          <AppSelect
            value={categoryId}
            onChange={setCategoryId}
            options={[
              { value: ALL, label: "Tutte le categorie" },
              { value: NONE_CATEGORY, label: "Senza categoria" },
              ...selectedProject.categories.map((category) => ({
                value: category.id,
                label: category.name,
              })),
            ]}
          />
        ) : null}
      </div>

      <Tabs defaultValue="bacheca">
        <TabsList>
          <TabsTrigger value="bacheca">Bacheca</TabsTrigger>
          <TabsTrigger value="lista">Lista</TabsTrigger>
        </TabsList>
        <TabsContent value="lista" className="mt-4">
          <ActivityList
            activities={filtered}
            projects={store.projects}
            density="dense"
            onOpen={setSelected}
            onStatus={onStatus}
            onDelete={onDelete}
            emptyTitle="Nessuna attività con questi filtri"
            emptyDescription="Svuota la ricerca o cambia stato e progetto."
          />
        </TabsContent>
        <TabsContent value="bacheca" className="mt-4 space-y-6">
          {overdue.length > 0 ? (
            <section className="min-w-0 space-y-2">
              <button
                type="button"
                onClick={() => setOverdueOpen((current) => !current)}
                className="font-heading flex w-full items-center gap-2 text-left text-lg font-semibold tracking-tight text-red-700"
                aria-expanded={overdueOpen}
              >
                {overdueOpen ? (
                  <ChevronDownIcon className="size-4 shrink-0" />
                ) : (
                  <ChevronRightIcon className="size-4 shrink-0" />
                )}
                <span className="flex-1">In ritardo</span>
                <span className="text-sm font-medium">{overdue.length}</span>
              </button>
              {overdueOpen ? (
                <ActivityList
                  activities={overdue}
                  projects={store.projects}
                  density="dense"
                  onOpen={setSelected}
                  onStatus={onStatus}
                  onDelete={onDelete}
                  emptyTitle="Nessuna attività in ritardo"
                  emptyDescription="Non ci sono pianificazioni scadute con i filtri attuali."
                />
              ) : null}
            </section>
          ) : null}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {BOARD_STATUSES.map((column) => {
              const columnActivities = filtered.filter(
                (activity) =>
                  activity.status === column && !overdueIds.has(activity.id),
              )
              const open = openColumns[column]
              return (
                <div key={column} className="min-w-0 space-y-2">
                  <button
                    type="button"
                    onClick={() => toggleColumn(column)}
                    className="font-heading flex w-full items-center gap-2 text-left text-lg font-semibold tracking-tight"
                    aria-expanded={open}
                  >
                    {open ? (
                      <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="flex-1">{STATUS_LABELS[column]}</span>
                    <span className="text-sm font-medium text-muted-foreground">
                      {columnActivities.length}
                    </span>
                  </button>
                  {open ? (
                    <ActivityList
                      activities={columnActivities}
                      projects={store.projects}
                      density="dense"
                      compactEmpty
                      onOpen={setSelected}
                      onStatus={onStatus}
                      onDelete={onDelete}
                      emptyTitle="Vuota"
                      emptyDescription="Niente in questa colonna con i filtri attuali."
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      <ActivityDialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        activity={selected}
      />
      <ActivityDialog
        open={creating}
        onOpenChange={setCreating}
        heading="Nuova attività"
        defaults={{ status: "in_attesa" }}
      />
    </div>
  )
}
