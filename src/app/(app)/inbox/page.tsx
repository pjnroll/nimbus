"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { ActivityDialog } from "@/components/activity-dialog"
import { ActivityList } from "@/components/activity-list"
import { CaptureBar } from "@/components/capture-bar"
import { inboxActivities } from "@/lib/selectors"
import { useNimbus } from "@/lib/store"
import type { Activity } from "@/lib/types"

export default function InboxPage() {
  const { store, updateActivity, deleteActivity } = useNimbus()
  const [selected, setSelected] = useState<Activity | null>(null)
  const items = useMemo(
    () => inboxActivities(store.activities),
    [store.activities],
  )

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Inbox
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Cattura la richiesta in dieci secondi. Non decidere tutto adesso:
          smista dopo, quando hai progetto, tipo e scadenza.
        </p>
      </header>
      <CaptureBar />
      <p className="text-sm text-muted-foreground">
        {items.length === 1
          ? "1 richiesta da smistare"
          : `${items.length} richieste da smistare`}
      </p>
      <ActivityList
        activities={items}
        projects={store.projects}
        onOpen={setSelected}
        onStatus={(id, status) => {
          updateActivity(id, { status })
          toast.success("Stato aggiornato")
        }}
        onDelete={(id) => {
          deleteActivity(id)
          toast.success("Attività eliminata")
        }}
        emptyTitle="Nessuna richiesta in attesa"
        emptyDescription="Quando arriva una mail o una chat, incollala sopra. Non aprire un altro foglio."
      />
      <ActivityDialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        activity={selected}
        heading="Smista la richiesta"
      />
    </div>
  )
}
