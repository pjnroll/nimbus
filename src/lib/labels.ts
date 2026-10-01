import type {
  ActivitySource,
  ActivityStatus,
  PersonKind,
  Priority,
  ProjectStatus,
} from "@/lib/types"

export const STATUS_LABELS: Record<ActivityStatus, string> = {
  inbox: "Da pianificare",
  in_corso: "In corso",
  in_attesa: "Da pianificare",
  fatto: "Fatto",
  fallita: "Fallita",
}

export const PERSON_KIND_LABELS: Record<PersonKind, string> = {
  persona: "Persona",
  team: "Team",
}

export const SOURCE_LABELS: Record<ActivitySource, string> = {
  email: "Email",
  chat: "Chat",
  altro: "Altro",
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  alta: "Alta",
  media: "Media",
  bassa: "Bassa",
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  attivo: "Attivo",
  in_attesa: "In attesa",
  chiuso: "Chiuso",
}
