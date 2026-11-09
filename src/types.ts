export type JournalCategory = 'pekerjaan' | 'belajar' | 'lainnya'

export type AttendanceStatus = 'hadir' | 'izin' | 'sakit' | 'libur'

export interface Profile {
  name: string
  school: string
  className: string
  company: string
  department: string
  supervisor: string
  supervisorTitle: string
  startDate: string
  endDate: string
  targetHours: number
}

export interface JournalEntry {
  id: string
  date: string
  startTime: string
  endTime: string
  activity: string
  result: string
  obstacle: string
  category: JournalCategory
  createdAt: string
}

export interface AttendanceRecord {
  date: string
  status: AttendanceStatus
  note?: string
}

export interface Task {
  id: string
  title: string
  done: boolean
  due?: string
  createdAt: string
}

export interface AppData {
  version: number
  profile: Profile
  journal: JournalEntry[]
  attendance: AttendanceRecord[]
  tasks: Task[]
  lastExportAt?: string
}

export type Update = (mutate: (draft: AppData) => void) => void

export type SyncState = 'local' | 'saving' | 'saved' | 'error'

export interface CloudAccount {
  email: string
  syncState: SyncState
  onSignOut: () => void
}

export type TabId = 'ringkasan' | 'jurnal' | 'absensi' | 'progres' | 'rekap' | 'pengaturan'
