const STORAGE_KEY = 'spanish-selected-weeks'

export function getWeekKey(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + diff)
  const y = monday.getFullYear()
  const m = String(monday.getMonth() + 1).padStart(2, '0')
  const d = String(monday.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getCurrentWeekKey(): string {
  return getWeekKey(new Date().toISOString())
}

export function formatWeekLabel(weekKey: string): string {
  const [year, month, day] = weekKey.split('-').map(Number)
  const monday = new Date(year, month - 1, day)
  return `Week of ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export function getSelectedWeeks(): string[] {
  if (typeof window === 'undefined') return [getCurrentWeekKey()]
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const parsed: string[] = stored ? JSON.parse(stored) : []
    const current = getCurrentWeekKey()
    return parsed.includes(current) ? parsed : [current, ...parsed]
  } catch {
    return [getCurrentWeekKey()]
  }
}

export function saveSelectedWeeks(weeks: string[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(weeks))
}
