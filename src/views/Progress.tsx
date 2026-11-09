import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Card, Empty, ProgressBar } from '../components/ui'
import { addDays, formatDayMonth, formatDuration, hoursDecimal, minutesBetween, startOfWeek, todayISO } from '../date'
import type { AppData, Update } from '../types'

export default function Progress({ data, update }: { data: AppData; update: Update }) {
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')

  const totalMinutes = data.journal.reduce(
    (sum, entry) => sum + minutesBetween(entry.startTime, entry.endTime),
    0,
  )
  const targetMinutes = Math.max(0, data.profile.targetHours) * 60
  const remainingMinutes = Math.max(0, targetMinutes - totalMinutes)
  const percent = targetMinutes > 0 ? Math.min(100, Math.round((totalMinutes / targetMinutes) * 100)) : 0

  const activeDays = new Set(data.journal.map((entry) => entry.date)).size
  const averageMinutes = activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0

  const weeks = useMemo(() => {
    const base = startOfWeek(todayISO())
    const items: { start: string; minutes: number }[] = []
    for (let index = 7; index >= 0; index -= 1) {
      const start = addDays(base, -7 * index)
      const end = addDays(start, 6)
      const minutes = data.journal
        .filter((entry) => entry.date >= start && entry.date <= end)
        .reduce((sum, entry) => sum + minutesBetween(entry.startTime, entry.endTime), 0)
      items.push({ start, minutes })
    }
    return items
  }, [data.journal])

  const maxWeek = Math.max(1, ...weeks.map((week) => week.minutes))
  const doneTasks = data.tasks.filter((task) => task.done).length

  function addTask(event: FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    update((draft) => {
      draft.tasks.push({
        id: crypto.randomUUID(),
        title: trimmed,
        done: false,
        due: due || undefined,
        createdAt: new Date().toISOString(),
      })
    })
    setTitle('')
    setDue('')
  }

  function toggleTask(id: string) {
    update((draft) => {
      const task = draft.tasks.find((item) => item.id === id)
      if (task) task.done = !task.done
    })
  }

  function removeTask(id: string) {
    update((draft) => {
      draft.tasks = draft.tasks.filter((item) => item.id !== id)
    })
  }

  return (
    <>
      <div className="cols">
        <Card title="Target jam PKL" subtitle="Dihitung dari seluruh jurnal yang kamu simpan.">
          <div className="target">
            <div>
              <span className="muted small">Sudah tercatat</span>
              <strong className="target-value">
                {hoursDecimal(totalMinutes)} <span className="muted">/ {data.profile.targetHours} jam</span>
              </strong>
            </div>
            <div className="target-right">
              <span className="muted small">Sisa</span>
              <strong>{formatDuration(remainingMinutes)}</strong>
            </div>
          </div>
          <ProgressBar value={totalMinutes} max={targetMinutes} tone={percent >= 100 ? 'ok' : undefined} />
          <div className="recap note">
            <div className="recap-item">
              <span>Persentase</span>
              <strong>{percent}%</strong>
            </div>
            <div className="recap-item">
              <span>Hari aktif</span>
              <strong>{activeDays}</strong>
            </div>
            <div className="recap-item">
              <span>Rata-rata / hari</span>
              <strong>{formatDuration(averageMinutes)}</strong>
            </div>
          </div>
          {data.profile.targetHours === 0 && (
            <p className="small muted note">Atur target jam di halaman Pengaturan.</p>
          )}
        </Card>

        <Card title="8 minggu terakhir" subtitle="Total jam per minggu (Senin–Minggu).">
          <div className="bars">
            {weeks.map((week) => (
              <div key={week.start} className="bar-col" title={`${formatDayMonth(week.start)}: ${formatDuration(week.minutes)}`}>
                <span className="bar-amount">{week.minutes > 0 ? `${hoursDecimal(week.minutes)}j` : '—'}</span>
                <div className="bar-track">
                  <div
                    className="bar-column-fill"
                    style={{ height: `${Math.round((week.minutes / maxWeek) * 100)}%` }}
                  />
                </div>
                <span className="bar-label">{formatDayMonth(week.start)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card
        title="Daftar tugas"
        subtitle={`${doneTasks} dari ${data.tasks.length} tugas selesai`}
      >
        <form className="task-form" onSubmit={addTask}>
          <input
            value={title}
            placeholder="Tambah tugas, misal: merekap absensi bulan Oktober"
            aria-label="Judul tugas"
            onChange={(event) => setTitle(event.target.value)}
          />
          <input
            type="date"
            value={due}
            aria-label="Tenggat tugas"
            onChange={(event) => setDue(event.target.value)}
          />
          <button type="submit" className="btn primary">
            Tambah
          </button>
        </form>

        {data.tasks.length === 0 ? (
          <Empty title="Belum ada tugas" hint="Catat pekerjaan dari pembimbing supaya tidak ada yang terlewat." />
        ) : (
          <div className="list">
            {data.tasks.map((task) => {
              const overdue = Boolean(task.due && !task.done && task.due < todayISO())
              return (
                <div key={task.id} className={`task ${task.done ? 'done' : ''} ${overdue ? 'overdue' : ''}`.trim()}>
                  <label className="task-check">
                    <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} />
                    <span className="task-title">{task.title}</span>
                  </label>
                  {task.due && (
                    <span className={`small ${overdue ? 'danger-text' : 'muted'}`}>
                      {overdue ? 'Terlambat ' : 'Tenggat '}
                      {formatDayMonth(task.due)}
                    </span>
                  )}
                  <button
                    type="button"
                    className="btn small ghost"
                    onClick={() => removeTask(task.id)}
                    aria-label={`Hapus tugas ${task.title}`}
                  >
                    Hapus
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </>
  )
}
