"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { FolderKanbanIcon } from "lucide-react"
import { toast } from "sonner"
import { EmptyState } from "@/components/empty-state"
import { ProjectRow } from "@/components/project-card"
import { ProjectDialog } from "@/components/project-dialog"
import { Button } from "@/components/ui/button"
import { PROJECT_STATUS_LABELS } from "@/lib/labels"
import { projectOpenCount } from "@/lib/selectors"
import { useNimbus } from "@/lib/store"
import type { ProjectStatus } from "@/lib/types"

const GROUPS: { status: ProjectStatus; title: string }[] = [
  { status: "attivo", title: "Attivi" },
  { status: "in_attesa", title: PROJECT_STATUS_LABELS.in_attesa },
  { status: "chiuso", title: "Chiusi" },
]

export default function ProgettiPage() {
  const { store, cloneProject } = useNimbus()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const groups = useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        projects: store.projects
          .filter((project) => project.status === group.status)
          .sort((a, b) => a.name.localeCompare(b.name, "it")),
      })).filter((group) => group.projects.length > 0),
    [store.projects],
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

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Progetti
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Elenco per stato. Ogni progetto raggruppa le attività aperte e il
            link Drive.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>Nuovo progetto</Button>
      </header>
      {store.projects.length === 0 ? (
        <EmptyState
          icon={FolderKanbanIcon}
          title="Nessun progetto"
          description="Crea il primo per raggruppare le richieste invece di lasciarle in un elenco piatto."
        >
          <Button onClick={() => setOpen(true)}>Crea progetto</Button>
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.status} className="space-y-2">
              <h2 className="font-heading text-sm font-medium tracking-wide uppercase">
                {group.title}
              </h2>
              <div className="divide-y divide-foreground/10 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
                {group.projects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    openCount={projectOpenCount(store, project.id)}
                    onClone={handleClone}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <ProjectDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
