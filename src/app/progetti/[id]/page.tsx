"use client"

import Link from "next/link"
import { use, useMemo, useState } from "react"
import { ExternalLinkIcon } from "lucide-react"
import { toast } from "sonner"
import { ActivityDialog } from "@/components/activity-dialog"
import { ActivityList } from "@/components/activity-list"
import { ProjectDialog } from "@/components/project-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PROJECT_STATUS_LABELS } from "@/lib/labels"
import { openActivities, sortByDueThenPriority } from "@/lib/selectors"
import { useNimbus } from "@/lib/store"
import type { Activity } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { store, updateActivity, deleteActivity } = useNimbus()
  const project = store.projects.find((item) => item.id === id)
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<Activity | null>(null)

  const activities = useMemo(() => {
    const mine = store.activities.filter((activity) => activity.projectId === id)
    return sortByDueThenPriority(mine)
  }, [store.activities, id])

  const open = openActivities(activities)

  if (!project) {
    return (
      <div className="space-y-3">
        <h1 className="font-heading text-2xl font-semibold">Progetto non trovato</h1>
        <p className="text-sm text-muted-foreground">
          Potrebbe essere stato eliminato su questo browser.
        </p>
        <Button nativeButton={false} render={<Link href="/progetti" />} variant="outline">
          Torna ai progetti
        </Button>
      </div>
    )
  }

  const statusStyle: Record<typeof project.status, string> = {
    attivo: "border-emerald-200 bg-emerald-50 text-emerald-800",
    in_attesa: "border-amber-200 bg-amber-50 text-amber-900",
    chiuso: "border-zinc-200 bg-zinc-100 text-zinc-600",
  }

  return (
    <div className="space-y-6">
      <p className="text-sm">
        <Link href="/progetti" className="text-muted-foreground hover:underline">
          Progetti
        </Link>
        <span className="text-muted-foreground"> / </span>
        <span>{project.name}</span>
      </p>
      <header className="flex flex-col gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Badge variant="outline" className={cn("mb-2", statusStyle[project.status])}>
            {PROJECT_STATUS_LABELS[project.status]}
          </Badge>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {project.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.client || "Ambito non indicato"}
          </p>
          {project.notes ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed">{project.notes}</p>
          ) : null}
          {project.people ? (
            <p className="mt-2 text-sm text-muted-foreground">{project.people}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {project.driveUrl ? (
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link href={project.driveUrl} target="_blank" rel="noreferrer" />
              }
            >
              Apri Drive
              <ExternalLinkIcon data-icon="inline-end" />
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => setEditing(true)}>
            Modifica
          </Button>
          <Button onClick={() => setCreating(true)}>Nuova attività</Button>
        </div>
      </header>

      <section className="space-y-3">
        <div>
          <h2 className="font-heading text-xl font-medium">Attività aperte</h2>
          <p className="text-sm text-muted-foreground">
            {open.length === 1 ? "1 aperta" : `${open.length} aperte`} su{" "}
            {activities.length} totali.
          </p>
        </div>
        <ActivityList
          activities={open}
          projects={store.projects}
          onOpen={setSelected}
          onStatus={(activityId, status) => {
            updateActivity(activityId, { status })
            toast.success("Stato aggiornato")
          }}
          onDelete={(activityId) => {
            deleteActivity(activityId)
            toast.success("Attività eliminata")
          }}
          emptyTitle="Nessuna attività aperta"
          emptyDescription="Crea un’attività o smista qualcosa dall’inbox su questo progetto."
        />
      </section>

      <ActivityDialog
        open={Boolean(selected)}
        onOpenChange={(next) => {
          if (!next) setSelected(null)
        }}
        activity={selected}
      />
      <ActivityDialog
        open={creating}
        onOpenChange={setCreating}
        heading="Attività sul progetto"
        defaults={{ status: "in_corso", projectId: project.id }}
      />
      <ProjectDialog
        open={editing}
        onOpenChange={setEditing}
        project={project}
      />
    </div>
  )
}
