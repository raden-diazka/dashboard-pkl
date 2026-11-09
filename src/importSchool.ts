import { formatShort, toISODate } from './date'
import type { AppData, AttendanceRecord, AttendanceStatus, JournalEntry } from './types'

const STATUS_MAP: Record<string, AttendanceStatus> = {
  hadir: 'hadir',
  masuk: 'hadir',
  izin: 'izin',
  cuti: 'izin',
  sakit: 'sakit',
  libur: 'libur',
}

export type SchoolImportResult = {
  journals: JournalEntry[]
  attendance: AttendanceRecord[]
  skippedRows: number
  duplicateRows: number
}

/** Parser CSV sederhana yang mendukung tanda kutip dan koma di dalam sel. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const source = text.replace(/^\uFEFF/, '')
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]

    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
      continue
    }
    if (char === ',') {
      row.push(field)
      field = ''
      continue
    }
    if (char === '\r') continue
    if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      continue
    }
    field += char
  }

  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''))
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function findColumn(header: string[], name: string): number {
  const target = normalizeHeader(name)
  return header.findIndex((cell) => normalizeHeader(cell) === target)
}

/** Benar kalau teks CSV punya kolom Tanggal dan Deskripsi Kegiatan. */
export function isSchoolJournalCSV(text: string): boolean {
  const rows = parseCSV(text)
  if (rows.length === 0) return false
  const header = rows[0]
  return findColumn(header, 'Tanggal') >= 0 && findColumn(header, 'Deskripsi Kegiatan') >= 0
}

function parseDateCell(value: string): string {
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const dotted = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(trimmed)
  if (dotted) {
    const day = Number(dotted[1])
    const month = Number(dotted[2])
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return toISODate(new Date(Number(dotted[3]), month - 1, day))
    }
  }
  return ''
}

/**
 * Ubah ekspor jurnal dari web PKL sekolah menjadi entri jurnal + absensi.
 * Kolom yang dipakai: Tanggal, Status Kehadiran, Deskripsi Kegiatan.
 * Jam tidak ada di file sekolah, jadi dipakai 08:00–16:00 dan bisa diubah per entri.
 */
export function importSchoolCSV(text: string, existing: AppData): SchoolImportResult {
  const rows = parseCSV(text)
  const result: SchoolImportResult = {
    journals: [],
    attendance: [],
    skippedRows: 0,
    duplicateRows: 0,
  }
  if (rows.length < 2) return result

  const header = rows[0]
  const dateColumn = findColumn(header, 'Tanggal')
  const activityColumn = findColumn(header, 'Deskripsi Kegiatan')
  const statusColumn = findColumn(header, 'Status Kehadiran')

  const existingIds = new Set(existing.journal.map((entry) => entry.id))
  const existingKeys = new Set(
    existing.journal.map((entry) => `${entry.date}|${entry.activity.trim().toLowerCase()}`),
  )
  const perDate = new Map<string, number>()
  const attendanceByDate = new Map<string, AttendanceStatus>()

  rows.slice(1).forEach((cells) => {
    const date = parseDateCell(cells[dateColumn] ?? '')
    if (!date) {
      result.skippedRows += 1
      return
    }

    const rawStatus = statusColumn >= 0 ? (cells[statusColumn] ?? '').trim().toLowerCase() : ''
    const status = STATUS_MAP[rawStatus]
    if (status) {
      attendanceByDate.set(date, status)
    }

    const activity = (cells[activityColumn] ?? '').trim()
    if (!activity || activity === '-' || activity === '—') return

    const index = (perDate.get(date) ?? 0) + 1
    perDate.set(date, index)
    const id = `school-${date}-${index}`
    const key = `${date}|${activity.toLowerCase()}`

    if (existingIds.has(id) || existingKeys.has(key)) {
      result.duplicateRows += 1
      return
    }
    existingIds.add(id)
    existingKeys.add(key)

    result.journals.push({
      id,
      date,
      startTime: '08:00',
      endTime: '16:00',
      activity,
      result: '',
      obstacle: '',
      category: 'pekerjaan',
      createdAt: `${date}T08:00:00+07:00`,
    })
  })

  result.attendance = [...attendanceByDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, status]) => ({ date, status }))
  result.journals.sort((a, b) => a.date.localeCompare(b.date))
  return result
}

/** Dipakai untuk pesan ke pengguna: rentang tanggal data yang baru diimpor. */
export function importedRange(journals: JournalEntry[]): string | null {
  if (journals.length === 0) return null
  const dates = journals.map((entry) => entry.date).sort()
  const first = dates[0]
  const last = dates[dates.length - 1]
  if (first === last) return formatShort(first)
  return `${formatShort(first)} – ${formatShort(last)}`
}