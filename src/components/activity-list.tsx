"use client"

import { useState } from "react"
import { InboxIcon } from "lucide-react"
import { ActivityCard } from "@/components/activity-card"
import {
  CloseActivityDialog,
  type CloseOutcome,
} from "@/components/close-activity-dialog"
import { EmptyState } from "@/components/empty-state"
import { closedActivity } from "@/lib/tasks"
import type { Activity, Project } from "@/lib/types"

export function ActivityList({
  activities,
  projects,
  showProjectName = true,
  onOpen,
  onStatus,
  onDelete,
  emptyTitle,
  emptyDescription,
}: {
  activities: Activity[]
  projects: Project[]
  showProjectName?: boolean
  onOpen: (activity: Activity) => void
  onStatus: (
    id: string,
    status: Activity["status"],
    extra?: Partial<Activity>,
  ) => void
  onDelete: (id: string) => void
  emptyTitle: string
  emptyDescription: string
}) {
  const [closing, setClosing] = useState<{
    activity: Activity
    outcome: CloseOutcome
  } | null>(null)

  function handleStatus(activity: Activity, status: Activity["status"]) {
    if (
      (status === "fatto" || status === "fallita") &&
      !closedActivity(activity.status)
    ) {
      setClosing({ activity, outcome: status })
      return
    }
    onStatus(activity.id, status)
  }

  if (activities.length === 0) {
    return (
      <EmptyState
        icon={InboxIcon}
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  return (
    <>
      <div className="grid gap-3">
        {activities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            project={projects.find((project) => project.id === activity.projectId)}
            showProjectName={showProjectName}
            onOpen={() => onOpen(activity)}
            onStatus={(status) => handleStatus(activity, status)}
            onDelete={() => onDelete(activity.id)}
          />
        ))}
      </div>
      <CloseActivityDialog
        activity={closing?.activity ?? null}
        outcome={closing?.outcome ?? "fatto"}
        open={Boolean(closing)}
        onOpenChange={(open) => {
          if (!open) setClosing(null)
        }}
        onConfirm={(closingNote, outcome) => {
          if (!closing) return
          onStatus(closing.activity.id, outcome, { closingNote })
        }}
      />
    </>
  )
}
