"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  MoreHorizontalIcon,
  PaperclipIcon,
} from "lucide-react"
import { ActivityAttachmentLinks } from "@/components/activity-attachments"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CategoryBadge, PriorityBadge, StatusBadge } from "@/components/status-badges"
import { formatDateIT, todayISO } from "@/lib/dates"
import { categoryName } from "@/lib/categories"
import { personName, personNames } from "@/lib/people"
import { projectBorderClass } from "@/lib/project-color"
import { useNimbus } from "@/lib/store"
import {
  copyTextToClipboard,
  formatTaskExportLine,
} from "@/lib/task-export"
import {
  closedActivity,
  formatTaskSlotIT,
  isTaskOverdue,
  taskByActivityId,
} from "@/lib/tasks"
import type { Activity, Project } from "@/lib/types"
import { safeHttpUrl } from "@/lib/urls"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export type ActivityCardDensity = "comfortable" | "dense"

export function ActivityCard({
  activity,
  project,
  showProjectName = true,
  density = "comfortable",
  showTaskSlot = false,
  defaultExpanded = false,
  onOpen,
  onStatus,
  onDelete,
}: {
  activity: Activity
  project?: Project
  showProjectName?: boolean
  density?: ActivityCardDensity
  showTaskSlot?: boolean
  defaultExpanded?: boolean
  onOpen: () => void
  onStatus: (status: Activity["status"]) => void
  onDelete: () => void
}) {
  const { store, readOnly } = useNimbus()
  const [expanded, setExpanded] = useState(defaultExpanded)
  const task = taskByActivityId(store.tasks, activity.id)
  const requesterName = personName(store.people, activity.requesterId)
  const responsibleName = personName(store.people, activity.responsibleId)
  const participantNames = personNames(store.people, activity.participantIds)
  const waitingName = personName(store.people, activity.waitingOnPersonId)
  const taskPeople = task ? personNames(store.people, task.executorIds) : ""
  const categoryLabel = categoryName(project, activity.categoryId)
  const overdue =
    !closedActivity(activity.status) &&
    Boolean(task && isTaskOverdue(task, todayISO()))
  const dense = density === "dense"
  const showDetails = !dense || expanded
  const borderClass = projectBorderClass(project)
  const driveUrl = safeHttpUrl(activity.driveUrl)

  async function copyExportLine() {
    if (!task) return
    const line = formatTaskExportLine(
      project?.name ?? "Senza progetto",
      activity.title,
      task,
    )
    const ok = await copyTextToClipboard(line)
    if (ok) toast.success("Riga copiata negli appunti")
    else toast.error("Impossibile copiare negli appunti")
  }

  return (
    <article
      className={cn(
        "group relative min-w-0 overflow-hidden rounded-2xl border-l-4 bg-card/90 shadow-sm ring-1 ring-foreground/8 backdrop-blur-sm transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md hover:shadow-[color:var(--surface-glow)]",
        borderClass,
        dense ? "px-3 py-2" : "p-4",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
        >
          {showProjectName ? (
            <p
              className={cn(
                "truncate text-muted-foreground",
                dense ? "text-xs" : "text-sm font-medium text-foreground",
              )}
            >
              {project?.name ?? "Senza progetto"}
            </p>
          ) : null}
          <h3
            className={cn(
              "font-heading leading-snug font-medium text-foreground",
              dense ? "mt-0.5 line-clamp-2 text-sm" : "mt-0.5 text-base",
            )}
          >
            {activity.title}
          </h3>
          {(showTaskSlot || (!dense && task)) && task ? (
            <p
              className={cn(
                "font-medium",
                dense ? "mt-0.5 text-xs" : "mt-1 text-sm",
                overdue ? "text-red-700" : "text-foreground",
              )}
            >
              {overdue ? "In ritardo · " : ""}
              {formatTaskSlotIT(task)}
              {!dense && taskPeople ? ` · Esecutori · ${taskPeople}` : ""}
            </p>
          ) : null}
          {!dense && !task && activity.reminderOn ? (
            <p className="mt-1 text-sm font-medium text-foreground">
              Scadenza · {formatDateIT(activity.reminderOn)}
            </p>
          ) : null}
          {!dense && waitingName ? (
            <p className="mt-1 text-sm text-muted-foreground">
              In attesa di · {waitingName}
              {activity.waitingReason ? ` · ${activity.waitingReason}` : ""}
            </p>
          ) : null}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="shrink-0" />
            }
          >
            <MoreHorizontalIcon />
            <span className="sr-only">Azioni</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpen}>
              {readOnly ? "Apri" : "Apri e modifica"}
            </DropdownMenuItem>
            {readOnly ? null : (
              <>
                {!closedActivity(activity.status) &&
                activity.status !== "in_corso" ? (
                  <DropdownMenuItem onClick={() => onStatus("in_corso")}>
                    Segna in corso
                  </DropdownMenuItem>
                ) : null}
                {!closedActivity(activity.status) &&
                activity.status !== "in_attesa" ? (
                  <DropdownMenuItem onClick={() => onStatus("in_attesa")}>
                    Da pianificare
                  </DropdownMenuItem>
                ) : null}
                {!closedActivity(activity.status) ? (
                  <>
                    <DropdownMenuItem onClick={() => onStatus("fatto")}>
                      Segna fatto
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onStatus("fallita")}>
                      Segna fallita
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={() => onStatus("in_corso")}>
                    Riapri
                  </DropdownMenuItem>
                )}
              </>
            )}
            {driveUrl ? (
              <DropdownMenuItem
                onClick={() => window.open(driveUrl, "_blank", "noopener")}
              >
                Apri Drive
              </DropdownMenuItem>
            ) : null}
            {task ? (
              <DropdownMenuItem onClick={() => void copyExportLine()}>
                Copia riga export
              </DropdownMenuItem>
            ) : null}
            {readOnly ? null : (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  Elimina
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showDetails ? (
        <div className={cn(dense ? "mt-2 border-t border-foreground/10 pt-2" : "mt-0")}>
          <button
            type="button"
            onClick={onOpen}
            className="w-full min-w-0 text-left"
          >
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={activity.status} />
              <PriorityBadge priority={activity.priority} />
              {categoryLabel ? <CategoryBadge name={categoryLabel} /> : null}
            </div>
            {dense && task ? (
              <p
                className={cn(
                  "mb-1 text-xs font-medium",
                  overdue ? "text-red-700" : "text-foreground",
                )}
              >
                {overdue ? "In ritardo · " : ""}
                {formatTaskSlotIT(task)}
                {taskPeople ? ` · Esecutori · ${taskPeople}` : ""}
              </p>
            ) : null}
            {!task && activity.reminderOn ? (
              <p className="mb-1 text-xs font-medium text-foreground">
                Scadenza · {formatDateIT(activity.reminderOn)}
              </p>
            ) : null}
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {activity.description ||
                "Nessuna nota. Apri per completare o pianificare."}
            </p>
            {activity.closingNote ? (
              <p className="mt-2 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                Chiusura: {activity.closingNote}
              </p>
            ) : null}
            {requesterName ||
            responsibleName ||
            participantNames ||
            waitingName ||
            waitingName ||
            !project ? (
              <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {responsibleName ? (
                  <div>
                    <dt className="inline">Responsabile</dt>
                    <dd className="inline"> · {responsibleName}</dd>
                  </div>
                ) : null}
                {requesterName ? (
                  <div>
                    <dt className="inline">Richiesto da</dt>
                    <dd className="inline"> · {requesterName}</dd>
                  </div>
                ) : null}
                {participantNames ? (
                  <div>
                    <dt className="inline">Coinvolti</dt>
                    <dd className="inline"> · {participantNames}</dd>
                  </div>
                ) : null}
                {waitingName ? (
                  <div>
                    <dt className="inline">In attesa di</dt>
                    <dd className="inline">
                      {" "}
                      · {waitingName}
                      {activity.waitingReason
                        ? ` · ${activity.waitingReason}`
                        : ""}
                    </dd>
                  </div>
                ) : null}
                {waitingName ? (
                  <div>
                    <dt className="inline">In attesa di</dt>
                    <dd className="inline">
                      {" "}
                      · {waitingName}
                      {activity.waitingReason
                        ? ` · ${activity.waitingReason}`
                        : ""}
                    </dd>
                  </div>
                ) : null}
                {!project ? (
                  <div>
                    <dt className="sr-only">Progetto</dt>
                    <dd>Senza progetto</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </button>
          {activity.attachments.length > 0 ? (
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <PaperclipIcon className="size-3" />
              {activity.attachments.length === 1
                ? "1 allegato"
                : `${activity.attachments.length} allegati`}
            </p>
          ) : null}
          <ActivityAttachmentLinks
            activityId={activity.id}
            attachments={activity.attachments}
          />
          {driveUrl ? (
            <Link
              href={driveUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Cartella o file Drive
              <ExternalLinkIcon className="size-3" />
            </Link>
          ) : null}
        </div>
      ) : null}

      {dense ? (
        <div className="mt-1 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-expanded={expanded}
            aria-label={expanded ? "Comprimi scheda" : "Espandi scheda"}
            onClick={(event) => {
              event.stopPropagation()
              setExpanded((current) => !current)
            }}
          >
            {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </Button>
        </div>
      ) : null}
    </article>
  )
}
