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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Activity } from "@/lib/types"

export type CloseOutcome = "fatto" | "fallita"

export function CloseActivityDialog({
  activity,
  open,
  onOpenChange,
  onConfirm,
  outcome = "fatto",
}: {
  activity: Activity | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (closingNote: string, outcome: CloseOutcome) => void
  outcome?: CloseOutcome
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && activity ? (
        <CloseActivityForm
          activity={activity}
          outcome={outcome}
          onOpenChange={onOpenChange}
          onConfirm={onConfirm}
        />
      ) : null}
    </Dialog>
  )
}

function CloseActivityForm({
  activity,
  outcome,
  onOpenChange,
  onConfirm,
}: {
  activity: Activity
  outcome: CloseOutcome
  onOpenChange: (open: boolean) => void
  onConfirm: (closingNote: string, outcome: CloseOutcome) => void
}) {
  const [note, setNote] = useState(activity.closingNote)
  const failed = outcome === "fallita"

  return (
    <DialogContent>
      <DialogHeader className="gap-3 pr-8">
        <DialogTitle>{failed ? "Segna fallita" : "Segna fatto"}</DialogTitle>
        <p className="font-heading text-base leading-snug font-medium">
          {activity.title}
        </p>
        <DialogDescription>
          {failed
            ? "La nota di chiusura è facoltativa: serve a ricordare perché non è andata a buon fine."
            : "La nota di chiusura è facoltativa: serve a te per ricordare come è andata a finire."}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-1.5">
        <Label htmlFor="closing-note">Nota di chiusura</Label>
        <Textarea
          id="closing-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={
            failed
              ? "Cosa è andato storto, cosa resta da fare"
              : "Come si è chiusa, cosa è rimasto in Drive, chi ha sbloccato"
          }
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Annulla
        </Button>
        <Button
          variant={failed ? "destructive" : "default"}
          onClick={() => {
            onConfirm(note.trim(), outcome)
            onOpenChange(false)
          }}
        >
          {failed ? "Segna fallita" : "Segna fatto"}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
