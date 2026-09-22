export function todayISO(): string {
  return toISODate(new Date())
}

export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function addDaysISO(days: number, from = new Date()): string {
  const next = new Date(from)
  next.setDate(next.getDate() + days)
  return toISODate(next)
}

export const HOME_RANGES = ["oggi", "settimana", "sempre"] as const
export type HomeRange = (typeof HOME_RANGES)[number]

export function isHomeRange(value: string): value is HomeRange {
  return (HOME_RANGES as readonly string[]).includes(value)
}

export function startOfWeekMonday(iso = todayISO()): string {
  const date = parseISODate(iso)
  const weekday = date.getDay()
  const offset = weekday === 0 ? -6 : 1 - weekday
  return addDaysISO(offset, date)
}

export function endOfWeekSunday(iso = todayISO()): string {
  return addDaysISO(6, parseISODate(startOfWeekMonday(iso)))
}

export function homeRangeBounds(
  range: HomeRange,
  today = todayISO(),
): { from: string | null; to: string | null } {
  switch (range) {
    case "oggi":
      return { from: today, to: today }
    case "settimana":
      return { from: startOfWeekMonday(today), to: endOfWeekSunday(today) }
    case "sempre":
      return { from: null, to: null }
  }
}

export function formatRangeIT(
  from: string | null,
  to: string | null,
): string {
  if (!from || !to) return "Sempre"
  if (from === to) return formatLongDateIT(from)
  const start = parseISODate(from)
  const end = parseISODate(to)
  const sameMonth =
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear()
  if (sameMonth) {
    return `${start.getDate()}–${end.toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
    })}`
  }
  return `${start.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  })} – ${end.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  })}`
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function formatDateIT(iso: string | null): string {
  if (!iso) return "Senza scadenza"
  return parseISODate(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  })
}

export function formatLongDateIT(iso: string): string {
  return parseISODate(iso).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

export function greetingForNow(now = new Date()): string {
  const hour = now.getHours()
  if (hour < 12) return "Buongiorno"
  if (hour < 18) return "Buon pomeriggio"
  return "Buonasera"
}

export function isOverdue(dueDate: string | null, today = todayISO()): boolean {
  return Boolean(dueDate && dueDate < today)
}

export function isDueToday(dueDate: string | null, today = todayISO()): boolean {
  return dueDate === today
}

export function nowISO(): string {
  return new Date().toISOString()
}
