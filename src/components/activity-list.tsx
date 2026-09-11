"use client"

import { InboxIcon } from "lucide-react"
import { ActivityCard } from "@/components/activity-card"
import { EmptyState } from "@/components/empty-state"
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
  onStatus: (id: string, status: Activity["status"]) => void
  onDelete: (id: string) => void
  emptyTitle: string
  emptyDescription: string
}) {
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
    <div className="grid gap-3">
      {activities.map((activity) => (
        <ActivityCard
          key={activity.id}
          activity={activity}
          project={projects.find((project) => project.id === activity.projectId)}
          showProjectName={showProjectName}
          onOpen={() => onOpen(activity)}
          onStatus={(status) => onStatus(activity.id, status)}
          onDelete={() => onDelete(activity.id)}
        />
      ))}
    </div>
  )
}
