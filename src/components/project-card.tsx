"use client"

import Link from "next/link"
import { ExternalLinkIcon, FolderOpenIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PROJECT_STATUS_LABELS } from "@/lib/labels"
import type { Project } from "@/lib/types"
import { cn } from "@/lib/utils"

export function ProjectCard({
  project,
  openCount,
}: {
  project: Project
  openCount: number
}) {
  const statusStyle: Record<Project["status"], string> = {
    attivo: "border-emerald-200 bg-emerald-50 text-emerald-800",
    in_attesa: "border-amber-200 bg-amber-50 text-amber-900",
    chiuso: "border-zinc-200 bg-zinc-100 text-zinc-600",
  }

  return (
    <article className="flex flex-col rounded-xl bg-card p-4 shadow-sm ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Badge variant="outline" className={cn("mb-2", statusStyle[project.status])}>
            {PROJECT_STATUS_LABELS[project.status]}
          </Badge>
          <h3 className="font-heading text-lg leading-snug font-medium">
            {project.name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.client || "Ambito non indicato"}
          </p>
        </div>
        <div className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-center">
          <p className="text-lg font-semibold text-sky-900">{openCount}</p>
          <p className="text-[10px] tracking-wide text-sky-800 uppercase">aperte</p>
        </div>
      </div>
      {project.notes ? (
        <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
          {project.notes}
        </p>
      ) : null}
      {project.people ? (
        <p className="mt-2 text-xs text-muted-foreground">{project.people}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          nativeButton={false}
          render={<Link href={`/progetti/${project.id}`} />}
          size="sm"
        >
          <FolderOpenIcon data-icon="inline-start" />
          Apri scheda
        </Button>
        {project.driveUrl ? (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link href={project.driveUrl} target="_blank" rel="noreferrer" />
            }
          >
            Drive
            <ExternalLinkIcon data-icon="inline-end" />
          </Button>
        ) : null}
      </div>
    </article>
  )
}
