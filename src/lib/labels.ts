import type {
  ActivitySource,
  ActivityStatus,
  ActivityType,
  Priority,
  ProjectStatus,
} from "@/lib/types"

export const STATUS_LABELS: Record<ActivityStatus, string> = {
  inbox: "Inbox",
  in_corso: "In corso",
  in_attesa: "In attesa",
  fatto: "Fatto",
  fallita: "Fallita",
}

export const TYPE_LABELS: Record<ActivityType, string> = {
  eseguo: "Eseguo io",
  coordino: "Coordino",
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
