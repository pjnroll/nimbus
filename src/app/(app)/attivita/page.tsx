"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { ActivityDialog } from "@/components/activity-dialog"
import { ActivityList } from "@/components/activity-list"
import { AppSelect } from "@/components/app-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { STATUS_LABELS, TYPE_LABELS } from "@/lib/labels"
import { sortByTaskThenPriority } from "@/lib/selectors"
import { activityCategoryName } from "@/lib/categories"
import { activityPersonHaystack } from "@/lib/people"
import { useNimbus } from "@/lib/store"
import { taskByActivityId } from "@/lib/tasks"
import {
  NONE_CATEGORY,
  NONE_PROJECT,
  type Activity,
  type ActivityStatus,
} from "@/lib/types"

const ALL = "__all__"

const BOARD_STATUSES: ActivityStatus[] = [
  "in_corso",
  "in_attesa",
  "fatto",
  "fallita",
]

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
    return sortByTaskThenPriority(list, store.tasks)
  }, [
    store.activities,
    store.projects,
    store.people,
    store.tasks,
    query,
    status,
    type,
    projectId,
    categoryId,
  ])

  const selectedProject =
    projectId !== ALL && projectId !== NONE_PROJECT
      ? store.projects.find((project) => project.id === projectId)
      : undefined

  const boardStatuses = BOARD_STATUSES

  // #region agent log
  useEffect(() => {
    const board = document.querySelector("[data-debug-board]")
    if (!board) return
    const main = document.querySelector("main")
    const columns = [...board.querySelectorAll("[data-debug-col]")]
    const cards = [...board.querySelectorAll("article")]
    const colRects = columns.map((el) => {
      const r = el.getBoundingClientRect()
      const style = getComputedStyle(el)
      return {
        status: el.getAttribute("data-debug-col"),
        width: Math.round(r.width),
        left: Math.round(r.left),
        right: Math.round(r.right),
        minWidth: style.minWidth,
        overflow: style.overflow,
      }
    })
    const cardRects = cards.map((el) => {
      const r = el.getBoundingClientRect()
      const col = el.closest("[data-debug-col]")
      const colR = col?.getBoundingClientRect()
      return {
        title: (el.querySelector("h3")?.textContent ?? "").slice(0, 40),
        width: Math.round(r.width),
        scrollWidth: el.scrollWidth,
        left: Math.round(r.left),
        right: Math.round(r.right),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        col: col?.getAttribute("data-debug-col"),
        overflowsCol: colR
          ? Math.round(r.right) > Math.round(colR.right) + 1 ||
            Math.round(r.left) < Math.round(colR.left) - 1
          : null,
        widerThanCol: colR ? Math.round(r.width) > Math.round(colR.width) + 1 : null,
      }
    })
    const overlaps: { a: string; b: string; dx: number; dy: number }[] = []
    for (let i = 0; i < cardRects.length; i++) {
      for (let j = i + 1; j < cardRects.length; j++) {
        const a = cardRects[i]
        const b = cardRects[j]
        const dx = Math.min(a.right, b.right) - Math.max(a.left, b.left)
        const dy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
        if (dx > 4 && dy > 4) {
          overlaps.push({
            a: `${a.col}:${a.title}`,
            b: `${b.col}:${b.title}`,
            dx,
            dy,
          })
        }
      }
    }
    const boardStyle = getComputedStyle(board)
    const payload = {
      sessionId: "b36c36",
      runId: "pre-fix",
      hypothesisId: "A-C",
      location: "attivita/page.tsx:board-measure",
      message: "Board layout geometry",
      data: {
        viewport: window.innerWidth,
        mainWidth: main ? Math.round(main.getBoundingClientRect().width) : null,
        boardWidth: Math.round(board.getBoundingClientRect().width),
        gridTemplateColumns: boardStyle.gridTemplateColumns,
        colCount: columns.length,
        cardCount: cards.length,
        colRects,
        overflows: cardRects.filter((c) => c.overflowsCol),
        overlaps,
        sampleCards: cardRects.slice(0, 6),
      },
      timestamp: Date.now(),
    }
    fetch("http://127.0.0.1:7925/ingest/0c835834-643c-4ae6-96f5-b2e1662b0892", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "b36c36",
      },
      body: JSON.stringify(payload),
    }).catch(() => {})
  }, [filtered])
  // #endregion

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
          <div
            data-debug-board
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {boardStatuses.map((column) => (
              <div
                key={column}
                data-debug-col={column}
                className="space-y-3"
              >
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
