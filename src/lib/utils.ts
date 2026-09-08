/** Small shared helpers. Deliberately dependency-free to keep the bundle light. */

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

let idCounter = 0

/** Stable-ish unique id. Not cryptographic - this is a demo data layer. */
export function newId(prefix: string): string {
  idCounter += 1
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** yyyy-mm-dd for a Date, in local time (dates here are calendar days). */
export function toDateKey(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function addDays(days: number, from: Date = new Date()): Date {
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return d
}

export function dayKeyOffset(days: number): string {
  return toDateKey(addDays(days))
}

/** "12 Mar 2026" - short, unambiguous for mixed-language users. */
export function formatDate(value?: string): string {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(value?: string): string {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return `${formatDate(value)}, ${d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

/** "2:00 PM" from "14:00". */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h)) return hhmm
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${`${m || 0}`.padStart(2, '0')} ${period}`
}

export function minutesUntil(hhmm: string, from: Date = new Date()): number {
  const [h, m] = hhmm.split(':').map(Number)
  const target = new Date(from)
  target.setHours(h, m || 0, 0, 0)
  return Math.round((target.getTime() - from.getTime()) / 60_000)
}

export function daysBetween(a: string, b: string): number {
  const ms = new Date(a).getTime() - new Date(b).getTime()
  return Math.round(ms / 86_400_000)
}

/** Relative label like "in 3 days" / "2 days overdue". */
export function relativeDays(dateKey: string): { days: number; label: string } {
  const days = daysBetween(dateKey, todayKey())
  if (days === 0) return { days, label: 'Today' }
  if (days === 1) return { days, label: 'Tomorrow' }
  if (days === -1) return { days, label: '1 day overdue' }
  if (days > 1) return { days, label: `In ${days} days` }
  return { days, label: `${Math.abs(days)} days overdue` }
}

export function pct(part: number, whole: number): number {
  if (!whole) return 0
  return Math.round((part / whole) * 100)
}

/** Normalises free text for matching: lowercase, collapse space, strip punctuation. */
export function normaliseText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[.,!?;:()"'`/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
