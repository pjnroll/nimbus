"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { ActivityDialog } from "@/components/activity-dialog"
import { ActivityList } from "@/components/activity-list"
import { AppSelect } from "@/components/app-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { STATUS_LABELS, TYPE_LABELS } from "@/lib/labels"
import { sortByDueThenPriority } from "@/lib/selectors"
import { activityCategoryName } from "@/lib/categories"
import { activityPersonHaystack } from "@/lib/people"
import { useNimbus } from "@/lib/store"
import {
  NONE_CATEGORY,
  NONE_PROJECT,
  type Activity,
  type ActivityStatus,
} from "@/lib/types"

const ALL = "__all__"

export default function AttivitaPage() {
  const { store, updateActivity, deleteActivity } = useNimbus()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState(ALL)
  const [type, setType] = useState(ALL)
  const [projectId, setProjectId] = useState(ALL)
  const [categoryId, setCategoryId] = useState(ALL)
  const [selected, setSelected] = useState<Activity | null>(null)
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const list = store.activities.filter((activity) => {
      if (status !== ALL && activity.status !== status) return false
      if (type !== ALL && activity.type !== type) return false
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
      const haystack = [
        activity.title,
        activity.description,
        activity.closingNote,
        activityPersonHaystack(store.people, activity),
        activityCategoryName(store, activity),
        project?.name ?? "",
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(needle)
    })
    return sortByDueThenPriority(list)
  }, [store.activities, store.projects, store.people, query, status, type, projectId, categoryId])

  const selectedProject =
    projectId !== ALL && projectId !== NONE_PROJECT
      ? store.projects.find((project) => project.id === projectId)
      : undefined

  const boardStatuses: ActivityStatus[] = ["in_corso", "in_attesa", "fatto"]

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

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Attività
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Filtra per ciò che fai tu e ciò che stai coordinando. La bacheca
            ignora l’inbox: quella si smista a parte.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>Nuova attività</Button>
      </header>

      <div
        className={`grid gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:grid-cols-2 ${
          selectedProject ? "lg:grid-cols-5" : "lg:grid-cols-4"
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
            ...Object.entries(STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
        <AppSelect
          value={type}
          onChange={setType}
          options={[
            { value: ALL, label: "Eseguo e coordino" },
            ...Object.entries(TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
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
            onOpen={setSelected}
            onStatus={onStatus}
            onDelete={onDelete}
            emptyTitle="Nessuna attività con questi filtri"
            emptyDescription="Svuota la ricerca o cambia stato, tipo e progetto."
          />
        </TabsContent>
        <TabsContent value="bacheca" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {boardStatuses.map((column) => (
              <div key={column} className="space-y-3">
                <h2 className="font-heading text-sm font-medium tracking-wide uppercase">
                  {STATUS_LABELS[column]}
                </h2>
                <ActivityList
                  activities={filtered.filter(
                    (activity) => activity.status === column,
                  )}
                  projects={store.projects}
                  onOpen={setSelected}
                  onStatus={onStatus}
                  onDelete={onDelete}
                  emptyTitle="Vuota"
                  emptyDescription="Niente in questa colonna con i filtri attuali."
                />
              </div>
            ))}
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
        defaults={{ status: "in_corso" }}
      />
    </div>
  )
}
