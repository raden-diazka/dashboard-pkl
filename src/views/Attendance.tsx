import { useMemo, useState } from 'react'
import { Card } from '../components/ui'
import { formatLong, monthKey, monthLabel, monthMatrix, shiftMonth, todayISO, WEEKDAYS } from '../date'
import type { AppData, AttendanceStatus, Update } from '../types'

const STATUSES: { value: AttendanceStatus; label: string }[] = [
  { value: 'hadir', label: 'Hadir' },
  { value: 'izin', label: 'Izin' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'libur', label: 'Libur' },
]

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  hadir: 'Hadir',
  izin: 'Izin',
  sakit: 'Sakit',
  libur: 'Libur',
}

export default function Attendance({ data, update }: { data: AppData; update: Update }) {
  const today = todayISO()
  const [month, setMonth] = useState(() => monthKey(today))
  const [selected, setSelected] = useState<string | null>(null)

  const statusByDate = useMemo(() => {
    const map = new Map<string, AttendanceStatus>()
    data.attendance.forEach((record) => map.set(record.date, record.status))
    return map
  }, [data.attendance])

  const counts: Record<AttendanceStatus, number> = { hadir: 0, izin: 0, sakit: 0, libur: 0 }
  data.attendance
    .filter((record) => monthKey(record.date) === month)
    .forEach((record) => {
      counts[record.status] += 1
    })

  const recordedDays = counts.hadir + counts.izin + counts.sakit
  const rate = recordedDays > 0 ? Math.round((counts.hadir / recordedDays) * 100) : null
  const weeks = monthMatrix(month)
  const selectedStatus = selected ? (statusByDate.get(selected) ?? null) : null

  function setStatus(date: string, status: AttendanceStatus) {
    update((draft) => {
      const existing = draft.attendance.find((record) => record.date === date)
      if (existing) existing.status = status
      else draft.attendance.push({ date, status })
    })
  }

  function clearStatus(date: string) {
    update((draft) => {
      draft.attendance = draft.attendance.filter((record) => record.date !== date)
    })
  }

  return (
    <>
      <Card
        title="Kalender kehadiran"
        subtitle="Klik tanggal untuk menandai kehadiranmu."
        actions={
          <div className="cal-nav">
            <button type="button" className="btn small" onClick={() => setMonth(shiftMonth(month, -1))}>
              ←
            </button>
            <strong>{monthLabel(month)}</strong>
            <button type="button" className="btn small" onClick={() => setMonth(shiftMonth(month, 1))}>
              →
            </button>
          </div>
        }
      >
        <div className="cal-grid">
          {WEEKDAYS.map((day) => (
            <span key={day} className="cal-weekday">
              {day}
            </span>
          ))}
          {weeks.flat().map((iso, index) => {
            if (!iso) return <span key={`empty-${index}`} className="cal-cell cal-empty" aria-hidden="true" />
            const status = statusByDate.get(iso)
            const classes = [
              'cal-cell',
              status ?? '',
              iso === today ? 'today' : '',
              iso === selected ? 'selected' : '',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <button
                key={iso}
                type="button"
                className={classes}
                onClick={() => setSelected(iso)}
                aria-label={`${formatLong(iso)}${status ? `, ${STATUS_LABEL[status]}` : ', belum ditandai'}`}
              >
                <span className="cal-day">{Number(iso.slice(8, 10))}</span>
                {status && <span className="cal-status">{STATUS_LABEL[status]}</span>}
              </button>
            )
          })}
        </div>

        <div className="panel">
          {selected ? (
            <>
              <div className="panel-head">
                <strong>{formatLong(selected)}</strong>
                <button type="button" className="btn small ghost" onClick={() => setSelected(null)}>
                  Tutup
                </button>
              </div>
              <div className="chips">
                {STATUSES.map((status) => (
                  <button
                    key={status.value}
                    type="button"
                    className={`chip ${selectedStatus === status.value ? 'on' : ''}`}
                    onClick={() =>
                      selectedStatus === status.value
                        ? clearStatus(selected)
                        : setStatus(selected, status.value)
                    }
                  >
                    {status.label}
                  </button>
                ))}
              </div>
              <p className="small muted">Klik sekali lagi status yang sedang aktif untuk menghapus tanda.</p>
            </>
          ) : (
            <div className="panel-head">
              <span className="small muted">Pilih tanggal di kalender untuk menandai hadir, izin, sakit, atau libur.</span>
              <button
                type="button"
                className="btn small primary"
                onClick={() => {
                  setStatus(today, 'hadir')
                  setMonth(monthKey(today))
                  setSelected(today)
                }}
              >
                Tandai hari ini hadir
              </button>
            </div>
          )}
        </div>
      </Card>

      <Card title={`Rekap ${monthLabel(month)}`} subtitle="Libur tidak dihitung dalam persentase kehadiran.">
        <div className="recap">
          <div className="recap-item">
            <span>Hadir</span>
            <strong>{counts.hadir}</strong>
          </div>
          <div className="recap-item">
            <span>Izin</span>
            <strong>{counts.izin}</strong>
          </div>
          <div className="recap-item">
            <span>Sakit</span>
            <strong>{counts.sakit}</strong>
          </div>
          <div className="recap-item">
            <span>Libur</span>
            <strong>{counts.libur}</strong>
          </div>
          <div className="recap-item">
            <span>Persentase hadir</span>
            <strong>{rate === null ? '—' : `${rate}%`}</strong>
          </div>
        </div>
        <p className="small muted note">
          {recordedDays === 0
            ? 'Belum ada hari yang ditandai di bulan ini.'
            : `${counts.hadir} hari hadir dari ${recordedDays} hari tercatat.`}
        </p>
      </Card>
    </>
  )
}
