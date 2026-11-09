import type { AppData, AttendanceRecord, AttendanceStatus, JournalCategory, JournalEntry, Profile, Task } from './types'

export const STORAGE_KEY = 'dashboard-pkl/v1'

export function defaultProfile(): Profile {
  return {
    name: '',
    school: '',
    className: '',
    company: '',
    department: '',
    supervisor: '',
    supervisorTitle: 'Pembimbing Lapangan',
    startDate: '',
    endDate: '',
    targetHours: 480,
  }
}

export function defaultData(): AppData {
  return {
    version: 1,
    profile: defaultProfile(),
    journal: [],
    attendance: [],
    tasks: [],
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function normalizeJournal(raw: unknown): JournalEntry | null {
  const record = asRecord(raw)
  if (!record) return null
  const date = text(record.date)
  if (!isIsoDate(date)) return null
  const category: JournalCategory =
    record.category === 'belajar' || record.category === 'lainnya' ? record.category : 'pekerjaan'
  return {
    id: text(record.id) || crypto.randomUUID(),
    date,
    startTime: text(record.startTime, '08:00'),
    endTime: text(record.endTime, '16:00'),
    activity: text(record.activity),
    result: text(record.result),
    obstacle: text(record.obstacle),
    category,
    createdAt: text(record.createdAt, new Date().toISOString()),
  }
}

function normalizeAttendance(raw: unknown): AttendanceRecord | null {
  const record = asRecord(raw)
  if (!record) return null
  const date = text(record.date)
  if (!isIsoDate(date)) return null
  const status = record.status
  const allowed: AttendanceStatus[] = ['hadir', 'izin', 'sakit', 'libur']
  if (!allowed.includes(status as AttendanceStatus)) return null
  return {
    date,
    status: status as AttendanceStatus,
    note: text(record.note) || undefined,
  }
}

function normalizeTask(raw: unknown): Task | null {
  const record = asRecord(raw)
  if (!record) return null
  const title = text(record.title).trim()
  if (!title) return null
  const due = text(record.due)
  return {
    id: text(record.id) || crypto.randomUUID(),
    title,
    done: record.done === true,
    due: isIsoDate(due) ? due : undefined,
    createdAt: text(record.createdAt, new Date().toISOString()),
  }
}

function normalizeProfile(raw: unknown): Profile {
  const record = asRecord(raw) ?? {}
  const target = Number(record.targetHours)
  const startDate = text(record.startDate)
  const endDate = text(record.endDate)
  return {
    name: text(record.name),
    school: text(record.school),
    className: text(record.className),
    company: text(record.company),
    department: text(record.department),
    supervisor: text(record.supervisor),
    supervisorTitle: text(record.supervisorTitle, 'Pembimbing Lapangan'),
    startDate: isIsoDate(startDate) ? startDate : '',
    endDate: isIsoDate(endDate) ? endDate : '',
    targetHours: Number.isFinite(target) && target >= 0 ? target : 480,
  }
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultData()
    return parseImport(raw)
  } catch {
    return defaultData()
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Penyimpanan penuh atau diblokir: data tetap hidup selama halaman terbuka.
  }
}

export function parseImport(raw: string): AppData {
  const parsed: unknown = JSON.parse(raw)
  const record = asRecord(parsed)
  if (!record) throw new Error('File tidak berisi data dashboard PKL.')

  const journal = Array.isArray(record.journal)
    ? record.journal.map(normalizeJournal).filter((item): item is JournalEntry => item !== null)
    : []
  const attendance = Array.isArray(record.attendance)
    ? record.attendance.map(normalizeAttendance).filter((item): item is AttendanceRecord => item !== null)
    : []
  const tasks = Array.isArray(record.tasks)
    ? record.tasks.map(normalizeTask).filter((item): item is Task => item !== null)
    : []

  return {
    version: 1,
    profile: normalizeProfile(record.profile),
    journal,
    attendance,
    tasks,
    lastExportAt: text(record.lastExportAt) || undefined,
  }
}

export function downloadBackup(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `dashboard-pkl-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
