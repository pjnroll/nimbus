import { addDaysISO, parseISODate } from "@/lib/dates"
import { isValidEmail, normalizeEmail } from "@/lib/email"

const GOOGLE_CALENDAR_TEMPLATE =
  "https://calendar.google.com/calendar/render?action=TEMPLATE"

function pad2(value: number): string {
  return String(value).padStart(2, "0")
}

/** Local datetime from Nimbus task ISO (YYYY-MM-DDTHH:mm). */
function toGoogleLocalDateTime(isoLocal: string): string {
  const [datePart, timePart = "12:00"] = isoLocal.split("T")
  const [year, month, day] = datePart.split("-").map(Number)
  const [hour, minute] = (timePart.slice(0, 5) || "12:00")
    .split(":")
    .map(Number)
  return `${year}${pad2(month)}${pad2(day)}T${pad2(hour)}${pad2(minute)}00`
}

function addOneHourIsoLocal(isoLocal: string): string {
  const [datePart, timePart = "12:00"] = isoLocal.split("T")
  const [year, month, day] = datePart.split("-").map(Number)
  const [hour, minute] = (timePart.slice(0, 5) || "12:00")
    .split(":")
    .map(Number)
  const date = new Date(year, month - 1, day, hour, minute, 0)
  date.setHours(date.getHours() + 1)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

export function formatGoogleCalendarDates(
  startsAt: string,
  endsAt: string | null,
): string {
  const endIso = endsAt?.trim() ? endsAt : addOneHourIsoLocal(startsAt)
  return `${toGoogleLocalDateTime(startsAt)}/${toGoogleLocalDateTime(endIso)}`
}

export function buildGoogleCalendarEventUrl(input: {
  title: string
  startsAt: string
  endsAt: string | null
  detailsLines: string[]
  guestEmails?: string[]
}): string {
  const params = new URLSearchParams()
  params.set("text", input.title.trim() || "Attività Nimbus")
  params.set(
    "dates",
    formatGoogleCalendarDates(input.startsAt, input.endsAt),
  )
  const details = input.detailsLines
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
  if (details) {
    params.set("details", details)
  }
  const guests = [
    ...new Set(
      (input.guestEmails ?? [])
        .map((email) => normalizeEmail(email))
        .filter((email) => isValidEmail(email)),
    ),
  ]
  if (guests.length > 0) {
    params.set("add", guests.join(","))
  }
  return `${GOOGLE_CALENDAR_TEMPLATE}&${params.toString()}`
}

/** All-day Google Calendar event for a local ISO date (YYYY-MM-DD). */
export function buildGoogleCalendarAllDayUrl(input: {
  title: string
  dateISO: string
  detailsLines: string[]
}): string {
  const params = new URLSearchParams()
  params.set("text", input.title.trim() || "Attività Nimbus")
  const start = input.dateISO.replaceAll("-", "")
  const end = addDaysISO(1, parseISODate(input.dateISO)).replaceAll("-", "")
  params.set("dates", `${start}/${end}`)
  const details = input.detailsLines
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
  if (details) {
    params.set("details", details)
  }
  return `${GOOGLE_CALENDAR_TEMPLATE}&${params.toString()}`
}
