import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, Empty, ProgressBar, Stat } from '../components/ui'
import Reminders from '../components/Reminders'
import {
  addDays,
  daysUntil,
  formatDayMonth,
  formatDuration,
  formatLong,
  formatShort,
  formatTimeRange,
  greeting,
  hoursDecimal,
  minutesBetween,
  monthKey,
  nowClockLabel,
  startOfWeek,
  todayISO,
  WIB_LABEL,
} from '../date'
import type { AppData, AttendanceStatus, TabId } from '../types'
import '../dashboard-extra.css'

type Props = {
  data: AppData
  onNavigate: (tab: TabId) => void
  cloud?: boolean
}

export default function Dashboard({ data, onNavigate, cloud = false }: Props) {
  const today = todayISO()
  const currentMonth = monthKey(today)
  const { profile } = data

  const [clock, setClock] = useState(nowClockLabel)
  const [slide, setSlide] = useState(0)
  const sliderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setClock(nowClockLabel()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const totalMinutes = data.journal.reduce(
    (sum, entry) => sum + minutesBetween(entry.startTime, entry.endTime),
    0,
  )
  const targetMinutes = Math.max(0, profile.targetHours) * 60
  const percent = targetMinutes > 0 ? Math.min(100, Math.round((totalMinutes / targetMinutes) * 100)) : 0

  const weekStart = startOfWeek(today)
  const weekEnd = addDays(weekStart, 6)
  const weekMinutes = data.journal
    .filter((entry) => entry.date >= weekStart && entry.date <= weekEnd)
    .reduce((sum, entry) => sum + minutesBetween(entry.startTime, entry.endTime), 0)

  const monthAttendance = data.attendance.filter((record) => monthKey(record.date) === currentMonth)
  const countStatus = (status: AttendanceStatus) =>
    monthAttendance.filter((record) => record.status === status).length
  const recordedDays = countStatus('hadir') + countStatus('izin') + countStatus('sakit')
  const attendanceRate = recordedDays > 0 ? Math.round((countStatus('hadir') / recordedDays) * 100) : null

  const remainingDays = profile.endDate ? daysUntil(profile.endDate) : null
  const doneTasks = data.tasks.filter((task) => task.done).length
  const todayEntries = data.journal.filter((entry) => entry.date === today)
  const recent = [...data.journal]
    .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime))
    .slice(0, 4)

  // Tugas aktif diurutkan: yang paling dekat tenggat lebih dulu, tanpa tenggat paling akhir.
  const pendingTasks = useMemo(
    () =>
      data.tasks
        .filter((task) => !task.done)
        .sort((a, b) => {
          if (a.due && b.due) return a.due.localeCompare(b.due)
          if (a.due) return -1
          if (b.due) return 1
          return a.createdAt.localeCompare(b.createdAt)
        }),
    [data.tasks],
  )

  useEffect(() => {
    if (slide > pendingTasks.length - 1) setSlide(0)
  }, [pendingTasks.length, slide])

  function goToSlide(index: number) {
    const element = sliderRef.current
    if (!element) return
    const next = Math.max(0, Math.min(pendingTasks.length - 1, index))
    element.scrollTo({ left: next * element.clientWidth, behavior: 'smooth' })
    setSlide(next)
  }

  function handleSliderScroll() {
    const element = sliderRef.current
    if (!element) return
    const next = Math.round(element.scrollLeft / element.clientWidth)
    setSlide((previous) => (previous === next ? previous : next))
  }

  const profileComplete = Boolean(profile.name && profile.company)
  const lastExport = data.lastExportAt ? data.lastExportAt.slice(0, 10) : null
  const backupStale =
    !cloud && data.journal.length > 0 && (!lastExport || daysUntil(lastExport) < -7)

  const period =
    profile.startDate && profile.endDate
      ? `${formatDayMonth(profile.startDate)} – ${formatDayMonth(profile.endDate)} ${profile.endDate.slice(0, 4)}`
      : null

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">{greeting()}</p>
          <h1>{profile.name || 'Dashboard PKL'}</h1>
          <p className="muted">
            {[profile.company, profile.department].filter(Boolean).join(' · ') ||
              'Lengkapi profil PKL-mu supaya laporan bisa dibuat otomatis.'}
          </p>
          <p className="hero-clock">
            {formatLong(today)} · {clock} {WIB_LABEL}
          </p>
          <div className="hero-meta">
            {profile.school && <span>{profile.school}</span>}
            {profile.className && <span>{profile.className}</span>}
            {period && <span>{period}</span>}
            {profile.supervisor && <span>Pembimbing: {profile.supervisor}</span>}
          </div>
          {!profileComplete && (
            <button type="button" className="btn hero-btn" onClick={() => onNavigate('pengaturan')}>
              Lengkapi profil PKL
            </button>
          )}
        </div>

        <div className="hero-progress">
          <span className="small hero-soft">Progres jam PKL</span>
          <strong>
            {hoursDecimal(totalMinutes)} j{' '}
            <span className="hero-soft">/ {profile.targetHours} jam</span>
          </strong>
          <ProgressBar value={totalMinutes} max={targetMinutes} />
          <span className="small hero-soft">
            {percent}% tercapai · sisa {formatDuration(Math.max(0, targetMinutes - totalMinutes))}
          </span>
        </div>
      </section>

      <Reminders data={data} onNavigate={onNavigate} />

      {backupStale && (
        <div className="notice no-print">
          <span>
            {lastExport
              ? `Backup terakhir ${formatShort(lastExport)}. Data hanya ada di browser ini dan bisa hilang kalau cache dibersihkan.`
              : 'Kamu belum pernah membuat backup. Data hanya ada di browser ini dan bisa hilang kalau cache dibersihkan.'}
          </span>
          <button type="button" className="btn small" onClick={() => onNavigate('pengaturan')}>
            Unduh backup
          </button>
        </div>
      )}

      <div className="stats">
        <Stat label="Total jam" value={`${hoursDecimal(totalMinutes)} j`} hint="Seluruh jurnal tercatat" tone="accent" />
        <Stat label="Minggu ini" value={formatDuration(weekMinutes)} hint={`${formatDayMonth(weekStart)} – ${formatDayMonth(weekEnd)}`} />
        <Stat
          label="Kehadiran"
          value={attendanceRate === null ? '—' : `${attendanceRate}%`}
          hint={`${countStatus('hadir')} hadir dari ${recordedDays} hari tercatat`}
          tone={attendanceRate !== null && attendanceRate >= 90 ? 'ok' : 'warn'}
        />
        <Stat
          label={remainingDays === null ? 'Hari PKL' : 'Sisa hari'}
          value={remainingDays === null ? '—' : `${Math.max(0, remainingDays)}`}
          hint={remainingDays === null ? 'Atur periode di Pengaturan' : `Berakhir ${formatDayMonth(profile.endDate)}`}
        />
        <Stat label="Tugas" value={`${doneTasks}/${data.tasks.length}`} hint="Tugas selesai" />
      </div>

      <div className="cols cols-even">
        <Card
          title="Catatan hari ini"
          subtitle={formatLong(today)}
          actions={
            <button type="button" className="btn small" onClick={() => onNavigate('jurnal')}>
              {todayEntries.length ? 'Tambah lagi' : 'Tulis jurnal'}
            </button>
          }
        >
          {todayEntries.length === 0 ? (
            <Empty
              title="Belum ada jurnal untuk hari ini"
              hint="Catat kegiatan, jam kerja, dan hasilnya sekarang supaya tidak lupa."
            />
          ) : (
            <div className="list">
              {todayEntries.map((entry) => (
                <article key={entry.id} className="item">
                  <div className="item-main">
                    <p className="item-title">{entry.activity}</p>
                    <div className="item-meta">
                      <span>{formatTimeRange(entry.startTime, entry.endTime)}</span>
                      <span>{formatDuration(minutesBetween(entry.startTime, entry.endTime))}</span>
                      <span className={`badge badge-${entry.category}`}>{entry.category}</span>
                    </div>
                    {entry.result && <p className="item-sub">Hasil: {entry.result}</p>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Tugas berikutnya"
          subtitle={pendingTasks.length > 0 ? `${pendingTasks.length} tugas aktif` : undefined}
          className="task-card"
          actions={
            <button type="button" className="btn small" onClick={() => onNavigate('progres')}>
              Kelola
            </button>
          }
        >
          {pendingTasks.length === 0 ? (
            <Empty title="Tidak ada tugas tertunda" hint="Tambahkan target kerja dari pembimbing di halaman Progres." />
          ) : (
            <div className="task-slider-wrap">
              <div
                className="task-slider"
                ref={sliderRef}
                onScroll={handleSliderScroll}
                role="group"
                aria-label="Daftar tugas berikutnya"
                tabIndex={0}
              >
                {pendingTasks.map((task, index) => {
                  const due = task.due ? daysUntil(task.due) : null
                  const late = due !== null && due < 0
                  return (
                    <article
                      key={task.id}
                      className={`task-slide ${late ? 'task-slide-late' : ''}`.trim()}
                      aria-label={`Tugas ${index + 1} dari ${pendingTasks.length}`}
                    >
                      <div className="task-slide-top">
                        <span className="task-slide-index">
                          {index + 1}/{pendingTasks.length}
                        </span>
                        {task.due && (
                          <span className={`task-due ${late ? 'task-due-late' : due === 0 ? 'task-due-today' : ''}`.trim()}>
                            {late
                              ? `Terlambat ${Math.abs(due ?? 0)} hari`
                              : due === 0
                                ? 'Jatuh tempo hari ini'
                                : `${due} hari lagi`}
                          </span>
                        )}
                      </div>
                      <p className="task-slide-title">{task.title}</p>
                      <p className="small muted task-slide-meta">
                        {task.due ? `Tenggat ${formatLong(task.due)}` : 'Tanpa tenggat'}
                      </p>
                    </article>
                  )
                })}
              </div>

              {pendingTasks.length > 1 && (
                <div className="task-slider-nav">
                  <button
                    type="button"
                    className="btn small ghost"
                    onClick={() => goToSlide(slide - 1)}
                    disabled={slide === 0}
                    aria-label="Tugas sebelumnya"
                  >
                    ←
                  </button>
                  <div className="task-dots">
                    {pendingTasks.map((task, index) => (
                      <button
                        key={task.id}
                        type="button"
                        className={`task-dot ${index === slide ? 'on' : ''}`.trim()}
                        onClick={() => goToSlide(index)}
                        aria-label={`Ke tugas ${index + 1}`}
                        aria-current={index === slide}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn small ghost"
                    onClick={() => goToSlide(slide + 1)}
                    disabled={slide === pendingTasks.length - 1}
                    aria-label="Tugas berikutnya"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <Card
        title="Jurnal terakhir"
        subtitle="Empat catatan paling baru"
        actions={
          <button type="button" className="btn small" onClick={() => onNavigate('jurnal')}>
            Semua jurnal
          </button>
        }
      >
        {recent.length === 0 ? (
          <Empty title="Jurnalmu masih kosong" hint="Mulai dari kegiatan pertama hari ini." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Jam</th>
                  <th>Kegiatan</th>
                  <th className="num">Durasi</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatShortDate(entry.date)}</td>
                    <td>{formatTimeRange(entry.startTime, entry.endTime)}</td>
                    <td>{entry.activity}</td>
                    <td className="num">{formatDuration(minutesBetween(entry.startTime, entry.endTime))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}

function formatShortDate(iso: string): string {
  return `${formatDayMonth(iso)} ${iso.slice(0, 4)}`
}