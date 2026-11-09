import { requireSupabase } from './supabase'
import { defaultProfile } from './storage'
import type {
  AppData,
  AttendanceRecord,
  AttendanceStatus,
  JournalCategory,
  JournalEntry,
  Profile,
  Task,
} from './types'

const JOURNAL_CATEGORIES: JournalCategory[] = ['pekerjaan', 'belajar', 'lainnya']
const ATTENDANCE_STATUSES: AttendanceStatus[] = ['hadir', 'izin', 'sakit', 'libur']

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function isoDate(value: unknown): string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''
}

function profileFromRow(row: Record<string, unknown> | null): Profile {
  if (!row) return defaultProfile()
  const target = Number(row.target_hours)
  return {
    name: text(row.name),
    school: text(row.school),
    className: text(row.class_name),
    company: text(row.company),
    department: text(row.department),
    supervisor: text(row.supervisor),
    supervisorTitle: text(row.supervisor_title, 'Pembimbing Lapangan'),
    startDate: isoDate(row.start_date),
    endDate: isoDate(row.end_date),
    targetHours: Number.isFinite(target) && target >= 0 ? target : 480,
  }
}

function journalFromRow(row: Record<string, unknown>): JournalEntry | null {
  const date = isoDate(row.date)
  if (!date) return null
  const category = row.category as JournalCategory
  return {
    id: text(row.id) || crypto.randomUUID(),
    date,
    startTime: text(row.start_time, '08:00'),
    endTime: text(row.end_time, '16:00'),
    activity: text(row.activity),
    result: text(row.result),
    obstacle: text(row.obstacle),
    category: JOURNAL_CATEGORIES.includes(category) ? category : 'pekerjaan',
    createdAt: text(row.created_at, new Date().toISOString()),
  }
}

function attendanceFromRow(row: Record<string, unknown>): AttendanceRecord | null {
  const date = isoDate(row.date)
  const status = row.status as AttendanceStatus
  if (!date || !ATTENDANCE_STATUSES.includes(status)) return null
  return { date, status, note: text(row.note) || undefined }
}

function taskFromRow(row: Record<string, unknown>): Task | null {
  const title = text(row.title).trim()
  if (!title) return null
  return {
    id: text(row.id) || crypto.randomUUID(),
    title,
    done: row.done === true,
    due: isoDate(row.due) || undefined,
    createdAt: text(row.created_at, new Date().toISOString()),
  }
}

/** Ambil seluruh data milik satu pengguna dari Supabase. */
export async function loadRemote(userId: string): Promise<AppData> {
  const client = requireSupabase()
  const [profileResult, journalResult, attendanceResult, taskResult] = await Promise.all([
    client.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    client.from('journal_entries').select('*').eq('user_id', userId).order('date', { ascending: false }),
    client.from('attendance').select('*').eq('user_id', userId).order('date', { ascending: false }),
    client.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
  ])

  for (const result of [profileResult, journalResult, attendanceResult, taskResult]) {
    if (result.error) throw result.error
  }

  const journalRows = (journalResult.data ?? []) as Record<string, unknown>[]
  const attendanceRows = (attendanceResult.data ?? []) as Record<string, unknown>[]
  const taskRows = (taskResult.data ?? []) as Record<string, unknown>[]

  return {
    version: 1,
    profile: profileFromRow(profileResult.data as Record<string, unknown> | null),
    journal: journalRows.map(journalFromRow).filter((item): item is JournalEntry => item !== null),
    attendance: attendanceRows
      .map(attendanceFromRow)
      .filter((item): item is AttendanceRecord => item !== null),
    tasks: taskRows.map(taskFromRow).filter((item): item is Task => item !== null),
    lastExportAt: text((profileResult.data as Record<string, unknown> | null)?.last_export_at) || undefined,
  }
}

export function isEmptyData(data: AppData): boolean {
  return (
    data.journal.length === 0 &&
    data.attendance.length === 0 &&
    data.tasks.length === 0 &&
    !data.profile.name &&
    !data.profile.company &&
    !data.profile.school
  )
}

function profileRow(userId: string, data: AppData) {
  const profile = data.profile
  return {
    user_id: userId,
    name: profile.name,
    school: profile.school,
    class_name: profile.className,
    company: profile.company,
    department: profile.department,
    supervisor: profile.supervisor,
    supervisor_title: profile.supervisorTitle,
    start_date: profile.startDate || null,
    end_date: profile.endDate || null,
    target_hours: Math.max(0, Math.round(profile.targetHours)),
    last_export_at: data.lastExportAt ?? null,
    updated_at: new Date().toISOString(),
  }
}

function journalRow(userId: string, entry: JournalEntry) {
  return {
    id: entry.id,
    user_id: userId,
    date: entry.date,
    start_time: entry.startTime,
    end_time: entry.endTime,
    activity: entry.activity,
    result: entry.result,
    obstacle: entry.obstacle,
    category: entry.category,
    created_at: entry.createdAt,
  }
}

function attendanceRow(userId: string, record: AttendanceRecord) {
  return {
    user_id: userId,
    date: record.date,
    status: record.status,
    note: record.note ?? null,
  }
}

function taskRow(userId: string, task: Task) {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    done: task.done,
    due: task.due ?? null,
    created_at: task.createdAt,
  }
}

/**
 * Kirim hanya baris yang berubah sejak snapshot `previous`, lalu hapus baris
 * yang sudah tidak ada. Dengan begitu satu ketikan tidak mengunggah seluruh data.
 */
export async function pushChanges(userId: string, previous: AppData, next: AppData): Promise<void> {
  const client = requireSupabase()
  const writes: PromiseLike<{ error: unknown }>[] = []

  if (
    JSON.stringify(previous.profile) !== JSON.stringify(next.profile) ||
    previous.lastExportAt !== next.lastExportAt
  ) {
    writes.push(client.from('profiles').upsert(profileRow(userId, next), { onConflict: 'user_id' }))
  }

  const previousJournal = new Map(previous.journal.map((entry) => [entry.id, JSON.stringify(entry)]))
  const nextJournalIds = new Set(next.journal.map((entry) => entry.id))
  const changedJournal = next.journal
    .filter((entry) => previousJournal.get(entry.id) !== JSON.stringify(entry))
    .map((entry) => journalRow(userId, entry))
  const removedJournal = previous.journal
    .filter((entry) => !nextJournalIds.has(entry.id))
    .map((entry) => entry.id)

  if (changedJournal.length > 0) {
    writes.push(client.from('journal_entries').upsert(changedJournal, { onConflict: 'id' }))
  }
  if (removedJournal.length > 0) {
    writes.push(
      client.from('journal_entries').delete().eq('user_id', userId).in('id', removedJournal),
    )
  }

  const previousAttendance = new Map(
    previous.attendance.map((record) => [record.date, JSON.stringify(record)]),
  )
  const nextAttendanceDates = new Set(next.attendance.map((record) => record.date))
  const changedAttendance = next.attendance
    .filter((record) => previousAttendance.get(record.date) !== JSON.stringify(record))
    .map((record) => attendanceRow(userId, record))
  const removedAttendance = previous.attendance
    .filter((record) => !nextAttendanceDates.has(record.date))
    .map((record) => record.date)

  if (changedAttendance.length > 0) {
    writes.push(
      client.from('attendance').upsert(changedAttendance, { onConflict: 'user_id,date' }),
    )
  }
  if (removedAttendance.length > 0) {
    writes.push(
      client.from('attendance').delete().eq('user_id', userId).in('date', removedAttendance),
    )
  }

  const previousTasks = new Map(previous.tasks.map((task) => [task.id, JSON.stringify(task)]))
  const nextTaskIds = new Set(next.tasks.map((task) => task.id))
  const changedTasks = next.tasks
    .filter((task) => previousTasks.get(task.id) !== JSON.stringify(task))
    .map((task) => taskRow(userId, task))
  const removedTasks = previous.tasks.filter((task) => !nextTaskIds.has(task.id)).map((task) => task.id)

  if (changedTasks.length > 0) {
    writes.push(client.from('tasks').upsert(changedTasks, { onConflict: 'id' }))
  }
  if (removedTasks.length > 0) {
    writes.push(client.from('tasks').delete().eq('user_id', userId).in('id', removedTasks))
  }

  const results = await Promise.all(writes)
  const failed = results.find((result) => result.error)
  if (failed?.error) {
    const error = failed.error as { message?: string }
    throw new Error(error.message ?? 'Gagal menyimpan ke Supabase.')
  }
}

function authMessage(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials')) return 'Email atau kata sandi salah.'
  if (lower.includes('email not confirmed')) {
    return 'Email belum dikonfirmasi. Buka tautan konfirmasi di kotak masukmu dulu.'
  }
  if (lower.includes('user already registered')) {
    return 'Email ini sudah terdaftar. Coba masuk saja.'
  }
  if (lower.includes('password should be at least')) {
    return 'Kata sandi minimal 6 karakter.'
  }
  if (lower.includes('invalid email')) return 'Format email tidak valid.'
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Tidak bisa menghubungi Supabase. Periksa koneksi internetmu.'
  }
  return message
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(authMessage(error.message))
}

/** Mengembalikan true kalau akun baru masih perlu konfirmasi lewat email. */
export async function signUpWithPassword(email: string, password: string): Promise<boolean> {
  const client = requireSupabase()
  const { data, error } = await client.auth.signUp({ email, password })
  if (error) throw new Error(authMessage(error.message))
  return !data.session
}

export async function signOutCloud(): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.auth.signOut()
  if (error) throw new Error(authMessage(error.message))
}
