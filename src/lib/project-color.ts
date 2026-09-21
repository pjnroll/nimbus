const PROJECT_BORDER_CLASSES = [
  "border-l-teal-600",
  "border-l-sky-600",
  "border-l-emerald-600",
  "border-l-amber-600",
  "border-l-rose-600",
  "border-l-cyan-700",
  "border-l-orange-600",
  "border-l-lime-700",
  "border-l-blue-700",
  "border-l-stone-600",
] as const

const NO_PROJECT_BORDER = "border-l-slate-400"

function hashId(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return hash
}

/** Stable left-border accent class for a project id. */
export function projectBorderClass(projectId: string | null | undefined): string {
  if (!projectId) return NO_PROJECT_BORDER
  return PROJECT_BORDER_CLASSES[hashId(projectId) % PROJECT_BORDER_CLASSES.length]
}
