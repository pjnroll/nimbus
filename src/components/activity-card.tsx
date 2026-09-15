"use client"

import Link from "next/link"
import { ExternalLinkIcon, MoreHorizontalIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CategoryBadge, PriorityBadge, StatusBadge, TypeBadge } from "@/components/status-badges"
import { formatDateIT, isOverdue, todayISO } from "@/lib/dates"
import { SOURCE_LABELS } from "@/lib/labels"
import { categoryName } from "@/lib/categories"
import { personName, personNames } from "@/lib/people"
import { useNimbus } from "@/lib/store"
import type { Activity, Project } from "@/lib/types"
import { cn } from "@/lib/utils"

export function ActivityCard({
  activity,
  project,
  showProjectName = true,
  onOpen,
  onStatus,
  onDelete,
}: {
  activity: Activity
  project?: Project
  showProjectName?: boolean
  onOpen: () => void
  onStatus: (status: Activity["status"]) => void
  onDelete: () => void
}) {
  const { store } = useNimbus()
  const requesterName = personName(store.people, activity.requesterId)
  const waitingOnName = personName(store.people, activity.waitingOnPersonId)
  const assigneeLabel = personNames(store.people, activity.assigneeIds)
  const categoryLabel = categoryName(project, activity.categoryId)
  const overdue =
    activity.status !== "fatto" &&
    activity.status !== "inbox" &&
    isOverdue(activity.dueDate, todayISO())

  return (
    <article
      className={cn(
        "group relative rounded-xl bg-card p-4 shadow-sm ring-1 ring-foreground/10 transition-shadow hover:shadow-md",
        activity.type === "coordino" ? "border-l-4 border-l-amber-400" : "border-l-4 border-l-blue-600",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
        >
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={activity.status} />
            <TypeBadge type={activity.type} />
            <PriorityBadge priority={activity.priority} />
            {categoryLabel ? <CategoryBadge name={categoryLabel} /> : null}
          </div>
          {showProjectName && project ? (
            <p className="text-sm font-medium text-foreground">{project.name}</p>
          ) : null}
          <h3
            className={cn(
              "font-heading text-base leading-snug font-medium text-foreground",
              showProjectName && project && "mt-0.5",
            )}
          >
            {activity.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {activity.description || "Nessuna nota. Apri per smistare o completare."}
          </p>
          {activity.closingNote ? (
            <p className="mt-2 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              Chiusura: {activity.closingNote}
            </p>
          ) : null}
          <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div>
              <dt className="sr-only">Origine</dt>
              <dd>
                {SOURCE_LABELS[activity.source]}
                {requesterName ? ` · ${requesterName}` : ""}
              </dd>
            </div>
            {!project ? (
              <div>
                <dt className="sr-only">Progetto</dt>
                <dd>Senza progetto</dd>
              </div>
            ) : null}
            {assigneeLabel ? (
              <div>
                <dt className="sr-only">Svolta da</dt>
                <dd>{assigneeLabel}</dd>
              </div>
            ) : null}
            <div>
              <dt className="sr-only">Scadenza</dt>
              <dd className={cn(overdue && "font-medium text-red-700")}>
                {overdue ? "In ritardo · " : ""}
                {formatDateIT(activity.dueDate)}
              </dd>
            </div>
          </dl>
          {activity.status === "in_attesa" && waitingOnName ? (
            <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-950">
              In attesa di <span className="font-medium">{waitingOnName}</span>
              {activity.waitingReason ? ` — ${activity.waitingReason}` : ""}
            </p>
          ) : null}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" className="shrink-0" />}
          >
            <MoreHorizontalIcon />
            <span className="sr-only">Azioni</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpen}>Apri e modifica</DropdownMenuItem>
            {activity.status === "inbox" ? (
              <DropdownMenuItem onClick={() => onStatus("in_corso")}>
                Prendi in carico
              </DropdownMenuItem>
            ) : null}
            {activity.status !== "fatto" && activity.status !== "in_corso" ? (
              <DropdownMenuItem onClick={() => onStatus("in_corso")}>
                Segna in corso
              </DropdownMenuItem>
            ) : null}
            {activity.status !== "fatto" && activity.status !== "in_attesa" ? (
              <DropdownMenuItem onClick={() => onStatus("in_attesa")}>
                Metti in attesa
              </DropdownMenuItem>
            ) : null}
            {activity.status !== "fatto" ? (
              <DropdownMenuItem onClick={() => onStatus("fatto")}>
                Segna fatto
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onStatus("in_corso")}>
                Riapri
              </DropdownMenuItem>
            )}
            {activity.driveUrl ? (
              <DropdownMenuItem
                onClick={() => window.open(activity.driveUrl, "_blank", "noopener")}
              >
                Apri Drive
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              Elimina
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {activity.driveUrl ? (
        <Link
          href={activity.driveUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Cartella o file Drive
          <ExternalLinkIcon className="size-3" />
        </Link>
      ) : null}
    </article>
  )
}
