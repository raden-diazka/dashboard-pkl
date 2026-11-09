import { daysUntil, formatDayMonth, formatLong, isWorkday, nowWIB, todayISO, WIB_LABEL } from '../date'
import type { AppData, TabId } from '../types'

type Alert = {
  key: string
  tone: 'danger' | 'warn' | 'info'
  icon: string
  title: string
  text: string
  action?: { label: string; tab: TabId }
}

// Pengingat baru muncul setelah jam ini supaya tidak mengganggu di pagi hari.
const JOURNAL_REMINDER_HOUR = 15
const ATTENDANCE_REMINDER_HOUR = 8

/**
 * Daftar pengingat singkat di atas statistik dashboard: tugas yang lewat tenggat,
 * jurnal hari ini yang belum ditulis, dan absensi yang belum ditandai.
 */
export default function Reminders({ data, onNavigate }: { data: AppData; onNavigate: (tab: TabId) => void }) {
  const today = todayISO()
  const now = nowWIB()
  const alerts: Alert[] = []

  const pending = data.tasks.filter((task) => !task.done)
  const overdue = pending
    .filter((task) => task.due && task.due < today)
    .sort((a, b) => (a.due ?? '').localeCompare(b.due ?? ''))
  const dueToday = pending.filter((task) => task.due === today)

  if (overdue.length > 0) {
    const first = overdue[0]
    const late = Math.abs(daysUntil(first.due ?? today))
    alerts.push({
      key: 'overdue',
      tone: 'danger',
      icon: '!',
      title:
        overdue.length === 1
          ? 'Ada tugas yang melewati tenggat'
          : `${overdue.length} tugas melewati tenggat`,
      text:
        overdue.length === 1
          ? `"${first.title}" — tenggat ${formatDayMonth(first.due ?? today)}, terlambat ${late} hari.`
          : `Paling lama: "${first.title}" (${formatDayMonth(first.due ?? today)}). Tandai selesai atau ubah tenggatnya.`,
      action: { label: 'Buka Progres', tab: 'progres' },
    })
  }

  if (dueToday.length > 0) {
    alerts.push({
      key: 'due-today',
      tone: 'warn',
      icon: '!',
      title: dueToday.length === 1 ? 'Tugas jatuh tempo hari ini' : `${dueToday.length} tugas jatuh tempo hari ini`,
      text: dueToday.map((task) => task.title).join(' · '),
      action: { label: 'Buka Progres', tab: 'progres' },
    })
  }

  const hasJournalToday = data.journal.some((entry) => entry.date === today)
  if (!hasJournalToday && isWorkday(today) && now.hour >= JOURNAL_REMINDER_HOUR) {
    alerts.push({
      key: 'journal',
      tone: 'warn',
      icon: 'J',
      title: 'Jurnal hari ini belum diisi',
      text: `Sudah pukul ${String(now.hour).padStart(2, '0')}:${String(now.minute).padStart(2, '0')} ${WIB_LABEL} dan belum ada catatan untuk ${formatLong(today)}.`,
      action: { label: 'Tulis jurnal', tab: 'jurnal' },
    })
  }

  const hasAttendanceToday = data.attendance.some((record) => record.date === today)
  if (hasAttendanceToday === false && isWorkday(today) && now.hour >= ATTENDANCE_REMINDER_HOUR) {
    alerts.push({
      key: 'attendance',
      tone: 'info',
      icon: 'A',
      title: 'Absensi hari ini belum ditandai',
      text: 'Tandai kehadiranmu supaya rekap bulan ini tetap akurat.',
      action: { label: 'Isi absensi', tab: 'absensi' },
    })
  }

  if (!data.profile.name || !data.profile.company) {
    alerts.push({
      key: 'profile',
      tone: 'info',
      icon: 'P',
      title: 'Profil PKL belum lengkap',
      text: 'Nama dan tempat PKL dipakai untuk judul rekap dan tanda tangan laporan.',
      action: { label: 'Lengkapi profil', tab: 'pengaturan' },
    })
  }

  if (alerts.length === 0) return null

  return (
    <section className="reminders no-print" aria-label="Pengingat">
      {alerts.map((alert) => (
        <div key={alert.key} className={`reminder reminder-${alert.tone}`}>
          <span className="reminder-icon" aria-hidden="true">
            {alert.icon}
          </span>
          <div className="reminder-body">
            <strong>{alert.title}</strong>
            <p className="small">{alert.text}</p>
          </div>
          {alert.action && (
            <button
              type="button"
              className="btn small reminder-action"
              onClick={() => onNavigate(alert.action?.tab ?? 'ringkasan')}
            >
              {alert.action.label}
            </button>
          )}
        </div>
      ))}
    </section>
  )
}