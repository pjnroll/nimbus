import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { CALENDAR_ACCESS_COOKIE } from "@/lib/auth/calendar"
import { getSession } from "@/lib/auth/session"
import { meetCallsFromEvents } from "@/lib/meet-events"
import { readStore } from "@/lib/persist-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_WINDOW_MS = 21 * 24 * 60 * 60 * 1000
const MAX_PAGES = 3

function needsAuth() {
  const response = NextResponse.json({ needsAuth: true }, { status: 401 })
  response.cookies.set(CALENDAR_ACCESS_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
  return response
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
  }

  const url = new URL(request.url)
  const timeMin = url.searchParams.get("timeMin") ?? ""
  const timeMax = url.searchParams.get("timeMax") ?? ""
  const min = Date.parse(timeMin)
  const max = Date.parse(timeMax)
  if (
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    max <= min ||
    max - min > MAX_WINDOW_MS
  ) {
    return NextResponse.json({ error: "Intervallo non valido" }, { status: 400 })
  }

  const token = (await cookies()).get(CALENDAR_ACCESS_COOKIE)?.value
  if (!token) return NextResponse.json({ needsAuth: true }, { status: 401 })

  try {
    const events: unknown[] = []
    let pageToken = ""
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const endpoint = new URL(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      )
      endpoint.searchParams.set("singleEvents", "true")
      endpoint.searchParams.set("orderBy", "startTime")
      endpoint.searchParams.set("timeMin", new Date(min).toISOString())
      endpoint.searchParams.set("timeMax", new Date(max).toISOString())
      endpoint.searchParams.set("maxResults", "250")
      if (pageToken) endpoint.searchParams.set("pageToken", pageToken)
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      if (response.status === 401) return needsAuth()
      if (response.status === 403) {
        const denied = NextResponse.json(
          { error: "Non riesco a leggere il Calendario" },
          { status: 403 },
        )
        denied.cookies.set(CALENDAR_ACCESS_COOKIE, "", {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 0,
        })
        return denied
      }
      if (!response.ok) {
        return NextResponse.json(
          { error: "Non riesco a leggere il Calendario" },
          { status: 502 },
        )
      }
      const body = (await response.json()) as {
        items?: unknown[]
        nextPageToken?: string
      }
      if (Array.isArray(body.items)) events.push(...body.items)
      pageToken = body.nextPageToken ?? ""
      if (!pageToken) break
    }

    const stored = await readStore(session.id)
    const imported = new Set(
      stored.store.activities.flatMap((activity) =>
        activity.calendarEventId ? [activity.calendarEventId] : [],
      ),
    )
    return NextResponse.json({
      events: meetCallsFromEvents(events, imported),
    })
  } catch {
    return NextResponse.json(
      { error: "Non riesco a leggere il Calendario" },
      { status: 502 },
    )
  }
}
