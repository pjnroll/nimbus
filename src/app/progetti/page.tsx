"use client"

import { useState } from "react"
import { FolderKanbanIcon } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { ProjectCard } from "@/components/project-card"
import { ProjectDialog } from "@/components/project-dialog"
import { Button } from "@/components/ui/button"
import { projectOpenCount } from "@/lib/selectors"
import { useNimbus } from "@/lib/store"

export default function ProgettiPage() {
  const { store } = useNimbus()
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Progetti
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Schede, non colonne. Ogni progetto ha le attività aperte e il link
            alla cartella Drive che già usi.
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
        <div className="grid gap-4 md:grid-cols-2">
          {store.projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              openCount={projectOpenCount(store, project.id)}
            />
          ))}
        </div>
      )}
      <ProjectDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
