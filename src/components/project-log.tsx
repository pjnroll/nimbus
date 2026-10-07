"use client"

import { FileDownIcon, HistoryIcon } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { exportProjectLogPdf } from "@/components/project-log-print"
import { StatusBadge } from "@/components/status-badges"
import { Button } from "@/components/ui/button"
import { formatLogSlot, type ProjectLogEntry } from "@/lib/project-log"
import type { Activity } from "@/lib/types"

export function ProjectLog({
  entries,
  projectName,
  onOpen,
}: {
  entries: ProjectLogEntry[]
  projectName: string
  onOpen: (activity: Activity) => void
}) {
  const done = entries.filter((entry) => entry.activity.status === "fatto").length
  const failed = entries.length - done

  return (
    <section className="min-w-0 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-medium">Log del progetto</h2>
          <p className="text-sm text-muted-foreground">
            {entries.length === 1 ? "1 esecuzione" : `${entries.length} esecuzioni`}
            {" · "}
            {done === 1 ? "1 fatta" : `${done} fatte`}
            {" · "}
            {failed === 1 ? "1 fallita" : `${failed} fallite`}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={entries.length === 0}
          onClick={() => exportProjectLogPdf(projectName)}
        >
          <FileDownIcon data-icon="inline-start" />
          Esporta PDF
        </Button>
      </div>
      {entries.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="Nessuna esecuzione registrata"
          description="Chiudi un’attività come Fatta o Fallita per vederla qui."
        />
      ) : (
        <ol className="surface divide-y divide-border overflow-hidden">
          {entries.map((entry) => {
            const note = entry.activity.closingNote.trim()
            return (
              <li key={entry.activity.id}>
                <button
                  type="button"
                  onClick={() => onOpen(entry.activity)}
                  className="grid w-full gap-1 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none sm:grid-cols-[11rem_auto_minmax(0,1fr)] sm:items-baseline sm:gap-3"
                >
                  <span className="text-muted-foreground tabular-nums">
                    {formatLogSlot(entry)}
                  </span>
                  <span className="justify-self-start">
                    <StatusBadge status={entry.activity.status} />
                  </span>
                  <span className="min-w-0">
                    <span className="font-medium">{entry.activity.title}</span>
                    {note ? (
                      <>
                        <span className="hidden text-muted-foreground sm:inline">
                          {" — "}
                        </span>
                        <span className="block text-muted-foreground sm:inline">
                          {note}
                        </span>
                      </>
                    ) : null}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
