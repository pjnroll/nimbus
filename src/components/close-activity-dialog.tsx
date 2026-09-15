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

export function CloseActivityDialog({
  activity,
  open,
  onOpenChange,
  onConfirm,
}: {
  activity: Activity | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (closingNote: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && activity ? (
        <CloseActivityForm
          activity={activity}
          onOpenChange={onOpenChange}
          onConfirm={onConfirm}
        />
      ) : null}
    </Dialog>
  )
}

function CloseActivityForm({
  activity,
  onOpenChange,
  onConfirm,
}: {
  activity: Activity
  onOpenChange: (open: boolean) => void
  onConfirm: (closingNote: string) => void
}) {
  const [note, setNote] = useState(activity.closingNote)

  return (
    <DialogContent>
      <DialogHeader className="gap-3 pr-8">
        <DialogTitle>Segna fatto</DialogTitle>
        <p className="font-heading text-base leading-snug font-medium">
          {activity.title}
        </p>
        <DialogDescription>
          La nota di chiusura è facoltativa: serve a te per ricordare come è
          andata a finire.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-1.5">
        <Label htmlFor="closing-note">Nota di chiusura</Label>
        <Textarea
          id="closing-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Come si è chiusa, cosa è rimasto in Drive, chi ha sbloccato"
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Annulla
        </Button>
        <Button
          onClick={() => {
            onConfirm(note.trim())
            onOpenChange(false)
          }}
        >
          Segna fatto
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
