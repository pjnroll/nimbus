"use client"

import { Badge } from "@/components/ui/badge"
import { PRIORITY_LABELS, STATUS_LABELS, TYPE_LABELS } from "@/lib/labels"
import type { ActivityStatus, ActivityType, Priority } from "@/lib/types"
import { cn } from "@/lib/utils"

export function StatusBadge({ status }: { status: ActivityStatus }) {
  const styles: Record<ActivityStatus, string> = {
    inbox:
      "border-badge-info/40 bg-badge-info text-badge-info-fg",
    in_corso:
      "border-badge-neutral/40 bg-badge-neutral text-badge-neutral-fg",
    in_attesa:
      "border-badge-info/40 bg-badge-info text-badge-info-fg",
    fatto:
      "border-badge-success/40 bg-badge-success text-badge-success-fg",
    fallita:
      "border-badge-danger/40 bg-badge-danger text-badge-danger-fg",
  }
  return (
    <Badge variant="outline" className={cn("font-medium", styles[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}

export function TypeBadge({ type }: { type: ActivityType }) {
  const styles: Record<ActivityType, string> = {
    eseguo: "border-badge-info/40 bg-badge-info text-badge-info-fg",
    coordino: "border-badge-warn/40 bg-badge-warn text-badge-warn-fg",
  }
  return (
    <Badge variant="outline" className={cn("font-medium", styles[type])}>
      {TYPE_LABELS[type]}
    </Badge>
  )
}

export function CategoryBadge({ name }: { name: string }) {
  return (
    <Badge
      variant="outline"
      className="border-badge-accent/40 bg-badge-accent font-medium text-badge-accent-fg"
    >
      {name}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const styles: Record<Priority, string> = {
    alta: "border-badge-danger/40 bg-badge-danger text-badge-danger-fg",
    media: "border-badge-neutral/40 bg-badge-neutral text-badge-neutral-fg",
    bassa: "border-badge-neutral/30 bg-muted text-muted-foreground",
  }
  return (
    <Badge variant="outline" className={cn("font-medium", styles[priority])}>
      {PRIORITY_LABELS[priority]}
    </Badge>
  )
}
