export const PROJECT_COLOR_IDS = [
  "teal",
  "sky",
  "emerald",
  "amber",
  "rose",
  "cyan",
  "orange",
  "lime",
  "blue",
  "stone",
] as const

export type ProjectColorId = (typeof PROJECT_COLOR_IDS)[number]

export const PROJECT_COLOR_OPTIONS: {
  id: ProjectColorId
  label: string
  borderClass: string
  swatchClass: string
}[] = [
  { id: "teal", label: "Teal", borderClass: "border-l-teal-600", swatchClass: "bg-teal-600" },
  { id: "sky", label: "Azzurro", borderClass: "border-l-sky-600", swatchClass: "bg-sky-600" },
  {
    id: "emerald",
    label: "Verde",
    borderClass: "border-l-emerald-600",
    swatchClass: "bg-emerald-600",
  },
  {
    id: "amber",
    label: "Ambra",
    borderClass: "border-l-amber-600",
    swatchClass: "bg-amber-600",
  },
  { id: "rose", label: "Rosa", borderClass: "border-l-rose-600", swatchClass: "bg-rose-600" },
  { id: "cyan", label: "Ciano", borderClass: "border-l-cyan-700", swatchClass: "bg-cyan-700" },
  {
    id: "orange",
    label: "Arancio",
    borderClass: "border-l-orange-600",
    swatchClass: "bg-orange-600",
  },
  { id: "lime", label: "Lime", borderClass: "border-l-lime-700", swatchClass: "bg-lime-700" },
  { id: "blue", label: "Blu", borderClass: "border-l-blue-700", swatchClass: "bg-blue-700" },
  {
    id: "stone",
    label: "Pietra",
    borderClass: "border-l-stone-600",
    swatchClass: "bg-stone-600",
  },
]

const NO_PROJECT_BORDER = "border-l-slate-400"

function hashId(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return hash
}

export function isProjectColorId(value: unknown): value is ProjectColorId {
  return (
    typeof value === "string" &&
    (PROJECT_COLOR_IDS as readonly string[]).includes(value)
  )
}

/** Stable default color when the project has none yet. */
export function defaultProjectColor(projectId: string): ProjectColorId {
  return PROJECT_COLOR_IDS[hashId(projectId) % PROJECT_COLOR_IDS.length]
}

export function coerceProjectColor(
  value: unknown,
  projectId: string,
): ProjectColorId {
  return isProjectColorId(value) ? value : defaultProjectColor(projectId)
}

export function projectBorderClass(
  project: { id: string; color?: ProjectColorId } | null | undefined,
): string {
  if (!project) return NO_PROJECT_BORDER
  const color = coerceProjectColor(project.color, project.id)
  return (
    PROJECT_COLOR_OPTIONS.find((option) => option.id === color)?.borderClass ??
    NO_PROJECT_BORDER
  )
}
