"use client"

import { useState } from "react"
import { toast } from "sonner"
import { AppSelect } from "@/components/app-select"
import { PersonField } from "@/components/person-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SOURCE_LABELS } from "@/lib/labels"
import { useNimbus } from "@/lib/store"
import type { ActivitySource } from "@/lib/types"

export function CaptureBar() {
  const { store, addActivity, upsertPerson } = useNimbus()
  const [title, setTitle] = useState("")
  const [source, setSource] = useState<ActivitySource>("email")
  const [requesterId, setRequesterId] = useState<string | null>(null)

  function capture() {
    if (!title.trim()) {
      toast.error("Scrivi almeno il titolo della richiesta")
      return
    }
    addActivity({
      title: title.trim(),
      description: "",
      projectId: null,
      source,
      requesterId,
      type: "eseguo",
      status: "inbox",
      priority: "media",
      dueDate: null,
      assigneeIds: [],
      waitingOnPersonId: null,
      waitingReason: "",
      driveUrl: "",
    })
    setTitle("")
    setRequesterId(null)
    toast.success("Richiesta in inbox. Smistala quando hai un minuto.")
  }

  return (
    <form
      className="flex flex-col gap-2 rounded-xl bg-card p-3 shadow-sm ring-1 ring-foreground/10 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault()
        capture()
      }}
    >
      <div className="grid min-w-0 flex-1 gap-1.5">
        <label htmlFor="capture-title" className="text-xs font-medium">
          Nuova richiesta
        </label>
        <Input
          id="capture-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Incolla l’oggetto della mail o il messaggio chat"
        />
      </div>
      <div className="grid w-full gap-1.5 sm:w-36">
        <span className="text-xs font-medium">Origine</span>
        <AppSelect
          value={source}
          onChange={(value) => setSource(value as ActivitySource)}
          options={Object.entries(SOURCE_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </div>
      <div className="grid w-full gap-1.5 sm:w-48">
        <label htmlFor="capture-who" className="text-xs font-medium">
          Da chi
        </label>
        <PersonField
          id="capture-who"
          people={store.people}
          value={requesterId ? [requesterId] : []}
          onChange={(ids) => setRequesterId(ids[0] ?? null)}
          onCreate={upsertPerson}
          multiple={false}
          placeholder="Richiedente"
        />
      </div>
      <Button type="submit" className="sm:mb-px">
        Cattura
      </Button>
    </form>
  )
}
