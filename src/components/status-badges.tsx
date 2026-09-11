"use client"

import { Badge } from "@/components/ui/badge"
import { PRIORITY_LABELS, STATUS_LABELS, TYPE_LABELS } from "@/lib/labels"
import type { ActivityStatus, ActivityType, Priority } from "@/lib/types"
import { cn } from "@/lib/utils"

export function StatusBadge({ status }: { status: ActivityStatus }) {
  const styles: Record<ActivityStatus, string> = {
    inbox: "border-blue-200 bg-blue-50 text-blue-800",
    in_corso: "border-slate-200 bg-slate-50 text-slate-700",
    in_attesa: "border-amber-200 bg-amber-50 text-amber-900",
    fatto: "border-green-200 bg-green-50 text-green-800",
  }
  return (
    <Badge variant="outline" className={cn("font-medium", styles[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}

export function TypeBadge({ type }: { type: ActivityType }) {
  const styles: Record<ActivityType, string> = {
    eseguo: "border-blue-200 bg-blue-50 text-blue-800",
    coordino: "border-amber-200 bg-amber-50 text-amber-900",
  }
  return (
    <Badge variant="outline" className={cn("font-medium", styles[type])}>
      {TYPE_LABELS[type]}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const styles: Record<Priority, string> = {
    alta: "border-red-200 bg-red-50 text-red-800",
    media: "border-stone-200 bg-stone-50 text-stone-700",
    bassa: "border-zinc-200 bg-zinc-50 text-zinc-600",
  }
  return (
    <Badge variant="outline" className={cn("font-medium", styles[priority])}>
      {PRIORITY_LABELS[priority]}
    </Badge>
  )
}
