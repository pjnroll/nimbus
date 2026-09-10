"use client"

import { Badge } from "@/components/ui/badge"
import { PRIORITY_LABELS, STATUS_LABELS, TYPE_LABELS } from "@/lib/labels"
import type { ActivityStatus, ActivityType, Priority } from "@/lib/types"
import { cn } from "@/lib/utils"

export function StatusBadge({ status }: { status: ActivityStatus }) {
  const styles: Record<ActivityStatus, string> = {
    inbox: "border-sky-200 bg-sky-50 text-sky-800",
    in_corso: "border-indigo-200 bg-indigo-50 text-indigo-800",
    in_attesa: "border-amber-200 bg-amber-50 text-amber-900",
    fatto: "border-emerald-200 bg-emerald-50 text-emerald-800",
  }
  return (
    <Badge variant="outline" className={cn("font-medium", styles[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}

export function TypeBadge({ type }: { type: ActivityType }) {
  const styles: Record<ActivityType, string> = {
    eseguo: "border-slate-200 bg-slate-50 text-slate-700",
    coordino: "border-orange-200 bg-orange-50 text-orange-900",
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
