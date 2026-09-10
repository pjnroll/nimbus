"use client"

import { useState } from "react"
import { toast } from "sonner"
import { AppSelect } from "@/components/app-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SOURCE_LABELS } from "@/lib/labels"
import { useNimbus } from "@/lib/store"
import type { ActivitySource } from "@/lib/types"

export function CaptureBar() {
  const { addActivity } = useNimbus()
  const [title, setTitle] = useState("")
  const [source, setSource] = useState<ActivitySource>("email")
  const [requester, setRequester] = useState("")

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
      requester: requester.trim(),
      type: "eseguo",
      status: "inbox",
      priority: "media",
      dueDate: null,
      waitingOn: "",
      waitingReason: "",
      driveUrl: "",
    })
    setTitle("")
    setRequester("")
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
        <Input
          id="capture-who"
          value={requester}
          onChange={(event) => setRequester(event.target.value)}
          placeholder="Richiedente"
        />
      </div>
      <Button type="submit" className="sm:mb-px">
        Cattura
      </Button>
    </form>
  )
}
