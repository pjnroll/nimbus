export type MeetCall = {
  id: string
  title: string
  startsAt: string
  endsAt: string | null
  meetUrl: string
}

type EntryPoint = {
  entryPointType?: string
  uri?: string
}

type CalendarEvent = {
  id?: string
  summary?: string
  hangoutLink?: string
  start?: { dateTime?: string }
  end?: { dateTime?: string }
  conferenceData?: { entryPoints?: EntryPoint[] }
}

function meetUrlOf(event: CalendarEvent): string | null {
  const hangout = event.hangoutLink?.trim() ?? ""
  if (hangout.startsWith("https://")) return hangout
  const video = event.conferenceData?.entryPoints?.find(
    (entry) =>
      entry.entryPointType === "video" &&
      typeof entry.uri === "string" &&
      entry.uri.startsWith("https://"),
  )
  return video?.uri ?? null
}

export function meetCallsFromEvents(
  events: unknown[],
  alreadyImported: ReadonlySet<string>,
): MeetCall[] {
  const calls: MeetCall[] = []
  for (const item of events) {
    if (!item || typeof item !== "object") continue
    const event = item as CalendarEvent
    const id = event.id?.trim() ?? ""
    const startsAt = event.start?.dateTime?.trim() ?? ""
    const meetUrl = meetUrlOf(event)
    if (!id || !startsAt || !meetUrl || alreadyImported.has(id)) continue
    const endsAt = event.end?.dateTime?.trim() || null
    calls.push({
      id,
      title: event.summary?.trim() || "Call Meet",
      startsAt,
      endsAt,
      meetUrl,
    })
  }
  return calls
}
