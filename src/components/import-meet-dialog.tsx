"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { MeetCall } from "@/lib/meet-events"

function formatSlot(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ImportMeetDialog({
  open,
  events,
  onOpenChange,
  onImport,
}: {
  open: boolean
  events: MeetCall[]
  onOpenChange: (open: boolean) => void
  onImport: (calls: MeetCall[]) => void
}) {
  if (!open) return null
  return (
    <ImportMeetForm
      key={events.map((event) => event.id).join("|")}
      events={events}
      onOpenChange={onOpenChange}
      onImport={onImport}
    />
  )
}

function ImportMeetForm({
  events,
  onOpenChange,
  onImport,
}: {
  events: MeetCall[]
  onOpenChange: (open: boolean) => void
  onImport: (calls: MeetCall[]) => void
}) {
  const [selected, setSelected] = useState(() => events.map((event) => event.id))
  const chosen = events.filter((event) => selected.includes(event.id))

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    )
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importa call</DialogTitle>
          <DialogDescription>
            Call Meet da oggi ai prossimi 14 giorni. Quelle già importate non
            compaiono.
          </DialogDescription>
        </DialogHeader>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessuna call Meet da importare.
          </p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {events.map((event) => (
              <li key={event.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg px-1 py-1.5 hover:bg-muted/60">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.includes(event.id)}
                    onChange={() => toggle(event.id)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {event.title}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {formatSlot(event.startsAt)}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button
            disabled={chosen.length === 0}
            onClick={() => onImport(chosen)}
          >
            {chosen.length === 1
              ? "Importa 1 call"
              : chosen.length > 1
                ? `Importa ${chosen.length} call`
                : "Importa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
