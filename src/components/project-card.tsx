"use client"

import Link from "next/link"
import { CopyIcon, ExternalLinkIcon, MoreHorizontalIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { personName, personNames } from "@/lib/people"
import { projectBorderClass } from "@/lib/project-color"
import { useNimbus } from "@/lib/store"
import type { Project } from "@/lib/types"
import { safeHttpUrl } from "@/lib/urls"
import { cn } from "@/lib/utils"

export function ProjectRow({
  project,
  openCount,
  onClone,
}: {
  project: Project
  openCount: number
  onClone: (id: string) => void
}) {
  const { store, readOnly } = useNimbus()
  const driveUrl = safeHttpUrl(project.driveUrl)
  const peopleLabel = personNames(store.people, project.participantIds)
  const managerName = personName(store.people, project.managerId)

  return (
    <article
      className={cn(
        "flex items-center gap-3 border-l-4 px-4 py-3",
        projectBorderClass(project),
      )}
    >
      <Link href={`/progetti/${project.id}`} className="min-w-0 flex-1">
        <h3 className="font-heading truncate text-base font-medium leading-snug">
          {project.name}
        </h3>
        <p className="truncate text-sm text-muted-foreground">
          {project.client || "Ambito non indicato"}
        </p>
      </Link>
      <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
        {openCount === 1 ? "1 aperta" : `${openCount} aperte`}
      </p>
      {managerName || peopleLabel ? (
        <p className="hidden min-w-0 max-w-56 truncate text-sm text-muted-foreground lg:block">
          {managerName
            ? `PM · ${managerName}${peopleLabel ? ` · ${peopleLabel}` : ""}`
            : peopleLabel}
        </p>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" className="shrink-0" />}
        >
          <MoreHorizontalIcon />
          <span className="sr-only">Azioni</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {driveUrl ? (
            <DropdownMenuItem
              onClick={() => window.open(driveUrl, "_blank", "noopener")}
            >
              <ExternalLinkIcon />
              Drive
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            disabled={readOnly}
            onClick={() => onClone(project.id)}
          >
            <CopyIcon />
            Clona
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </article>
  )
}
