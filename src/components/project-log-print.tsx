"use client"

import { createPortal } from "react-dom"
import { useEffect, useState } from "react"
import { categoryName } from "@/lib/categories"
import { formatLongDateIT, todayISO } from "@/lib/dates"
import {
  PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  STATUS_LABELS,
} from "@/lib/labels"
import { personName, personNames } from "@/lib/people"
import { formatLogSlot, type ProjectLogEntry } from "@/lib/project-log"
import type { Person, Project } from "@/lib/types"
import { safeHttpUrl } from "@/lib/urls"

export function exportProjectLogPdf(projectName: string) {
  const previousTitle = document.title
  document.title = `Log ${projectName}`
  document.body.dataset.print = "project-log"
  const cleanup = () => {
    document.title = previousTitle
    delete document.body.dataset.print
    window.removeEventListener("afterprint", cleanup)
  }
  window.addEventListener("afterprint", cleanup)
  window.print()
}

export function ProjectLogPrint({
  project,
  people,
  entries,
  categoryLabel,
}: {
  project: Project
  people: Person[]
  entries: ProjectLogEntry[]
  categoryLabel?: string
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  if (!mounted) return null

  const managerName = personName(people, project.managerId)
  const exportedOn = formatLongDateIT(todayISO())

  return createPortal(
    <article id="project-log-print" className="hidden">
      <header>
        <p>Log del progetto</p>
        <h1>{project.name}</h1>
        <p>{project.client.trim() || "Ambito non indicato"}</p>
        <p>Stato: {PROJECT_STATUS_LABELS[project.status]}</p>
        {managerName ? <p>Project Manager: {managerName}</p> : null}
        {project.notes.trim() ? <p>{project.notes.trim()}</p> : null}
        {categoryLabel ? <p>Categoria: {categoryLabel}</p> : null}
        <p>Esportato il {exportedOn}</p>
      </header>
      {entries.map((entry) => (
        <LogEntryPrint
          key={entry.activity.id}
          project={project}
          people={people}
          entry={entry}
        />
      ))}
    </article>,
    document.body,
  )
}

function LogEntryPrint({
  project,
  people,
  entry,
}: {
  project: Project
  people: Person[]
  entry: ProjectLogEntry
}) {
  const { activity, task } = entry
  const category = categoryName(project, activity.categoryId)
  const responsible = personName(people, activity.responsibleId)
  const requester = personName(people, activity.requesterId)
  const participants = personNames(people, activity.participantIds)
  const executors = task ? personNames(people, task.executorIds) : ""
  const driveUrl = safeHttpUrl(activity.driveUrl)
  const attachmentNames = activity.attachments
    .map((attachment) => attachment.name.trim())
    .filter(Boolean)
    .join(", ")
  const meta = [
    formatLogSlot(entry),
    STATUS_LABELS[activity.status],
    PRIORITY_LABELS[activity.priority],
    category,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <section className="project-log-entry">
      <p>{meta}</p>
      <h2>{activity.title}</h2>
      <Field label="Descrizione" value={activity.description} />
      <Field label="Nota di chiusura" value={activity.closingNote} />
      <Field label="Nota dello slot" value={task?.notes ?? ""} />
      <Field label="Responsabile" value={responsible} />
      <Field label="Richiesto da" value={requester} />
      <Field label="Coinvolti" value={participants} />
      <Field label="Esecutori" value={executors} />
      {driveUrl ? <Field label="Drive" value={driveUrl} /> : null}
      <Field label="Allegati" value={attachmentNames} />
    </section>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  const text = value.trim()
  if (!text) return null
  return (
    <p>
      <span>{label}: </span>
      {text}
    </p>
  )
}
