"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { FolderKanbanIcon, SearchXIcon } from "lucide-react"
import { toast } from "sonner"
import { AppSelect } from "@/components/app-select"
import { EmptyState } from "@/components/empty-state"
import { ProjectRow } from "@/components/project-card"
import { ProjectDialog } from "@/components/project-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PROJECT_STATUS_LABELS } from "@/lib/labels"
import { personNames } from "@/lib/people"
import { projectOpenCount } from "@/lib/selectors"
import { useNimbus } from "@/lib/store"
import type { NimbusStore, Project, ProjectStatus } from "@/lib/types"

const ALL = "__all__"

const GROUPS: { status: ProjectStatus; title: string }[] = [
  { status: "attivo", title: "Attivi" },
  { status: "in_attesa", title: PROJECT_STATUS_LABELS.in_attesa },
  { status: "chiuso", title: "Chiusi" },
]

type SortKey = "name-asc" | "name-desc" | "open" | "updated"

function matchesQuery(
  project: Project,
  people: NimbusStore["people"],
  needle: string,
): boolean {
  if (!needle) return true
  const haystack = [
    project.name,
    project.client,
    personNames(people, project.personIds),
  ]
    .join(" ")
    .toLowerCase()
  return haystack.includes(needle)
}

function sortProjects(
  projects: Project[],
  store: NimbusStore,
  sort: SortKey,
): Project[] {
  return [...projects].sort((a, b) => {
    if (sort === "name-asc") return a.name.localeCompare(b.name, "it")
    if (sort === "name-desc") return b.name.localeCompare(a.name, "it")
    if (sort === "open") {
      const diff = projectOpenCount(store, b.id) - projectOpenCount(store, a.id)
      if (diff !== 0) return diff
      return a.name.localeCompare(b.name, "it")
    }
    const byDate = b.updatedAt.localeCompare(a.updatedAt)
    if (byDate !== 0) return byDate
    return a.name.localeCompare(b.name, "it")
  })
}

export default function ProgettiPage() {
  const { store, cloneProject } = useNimbus()
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState(ALL)
  const [sort, setSort] = useState<SortKey>("name-asc")

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return store.projects.filter((project) => {
      if (status !== ALL && project.status !== status) return false
      return matchesQuery(project, store.people, needle)
    })
  }, [store.projects, store.people, query, status])

  const groups = useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        projects: sortProjects(
          filtered.filter((project) => project.status === group.status),
          store,
          sort,
        ),
      })).filter((group) => group.projects.length > 0),
    [filtered, store, sort],
  )

  const flat = useMemo(
    () => sortProjects(filtered, store, sort),
    [filtered, store, sort],
  )

  function handleClone(id: string) {
    const copy = cloneProject(id)
    if (!copy) {
      toast.error("Non riesco a clonare il progetto.")
      return
    }
    toast.success("Progetto clonato. Cambia nome e Drive se serve.")
    router.push(`/progetti/${copy.id}`)
  }

  function renderList(projects: Project[]) {
    return (
      <div className="divide-y divide-foreground/10 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        {projects.map((project) => (
          <ProjectRow
            key={project.id}
            project={project}
            openCount={projectOpenCount(store, project.id)}
            onClone={handleClone}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Progetti
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Cerca, filtra e ordina. Ogni progetto raggruppa le attività aperte e
            il link Drive.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>Nuovo progetto</Button>
      </header>

      {store.projects.length === 0 ? (
        <EmptyState
          icon={FolderKanbanIcon}
          title="Nessun progetto"
          description="Crea il primo per raggruppare le richieste invece di lasciarle in un elenco piatto."
        >
          <Button onClick={() => setCreating(true)}>Crea progetto</Button>
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:grid-cols-3">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca nome, cliente, persona"
            />
            <AppSelect
              value={status}
              onChange={setStatus}
              options={[
                { value: ALL, label: "Tutti gli stati" },
                ...Object.entries(PROJECT_STATUS_LABELS).map(
                  ([value, label]) => ({ value, label }),
                ),
              ]}
            />
            <AppSelect
              value={sort}
              onChange={(value) => setSort(value as SortKey)}
              options={[
                { value: "name-asc", label: "Nome A–Z" },
                { value: "name-desc", label: "Nome Z–A" },
                { value: "open", label: "Più attività aperte" },
                { value: "updated", label: "Aggiornati di recente" },
              ]}
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={SearchXIcon}
              title="Nessun progetto con questi filtri"
              description="Svuota la ricerca o cambia stato."
            />
          ) : status === ALL ? (
            <div className="space-y-6">
              {groups.map((group) => (
                <section key={group.status} className="space-y-2">
                  <h2 className="font-heading text-sm font-medium tracking-wide uppercase">
                    {group.title}
                  </h2>
                  {renderList(group.projects)}
                </section>
              ))}
            </div>
          ) : (
            renderList(flat)
          )}
        </>
      )}
      <ProjectDialog open={creating} onOpenChange={setCreating} />
    </div>
  )
}
