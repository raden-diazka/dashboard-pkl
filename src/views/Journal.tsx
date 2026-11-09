import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Card, Empty } from '../components/ui'
import { formatDuration, formatLong, minutesBetween, monthKey, monthLabel, todayISO } from '../date'
import type { AppData, JournalCategory, JournalEntry, Update } from '../types'

type Props = {
  data: AppData
  update: Update
  notify: (message: string) => void
}

const CATEGORIES: { value: JournalCategory; label: string }[] = [
  { value: 'pekerjaan', label: 'Pekerjaan' },
  { value: 'belajar', label: 'Belajar' },
  { value: 'lainnya', label: 'Lainnya' },
]

type FormState = {
  date: string
  startTime: string
  endTime: string
  category: JournalCategory
  activity: string
  result: string
  obstacle: string
}

function emptyForm(): FormState {
  return {
    date: todayISO(),
    startTime: '08:00',
    endTime: '16:00',
    category: 'pekerjaan',
    activity: '',
    result: '',
    obstacle: '',
  }
}

export default function Journal({ data, update, notify }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const months = useMemo(() => {
    const set = new Set<string>()
    data.journal.forEach((entry) => set.add(monthKey(entry.date)))
    set.add(monthKey(todayISO()))
    return [...set].sort().reverse()
  }, [data.journal])

  const groups = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    const filtered = data.journal.filter((entry) => {
      if (filter !== 'all' && monthKey(entry.date) !== filter) return false
      if (!keyword) return true
      return `${entry.activity} ${entry.result} ${entry.obstacle}`.toLowerCase().includes(keyword)
    })

    const grouped = new Map<string, JournalEntry[]>()
    filtered.forEach((entry) => {
      const list = grouped.get(entry.date) ?? []
      list.push(entry)
      grouped.set(entry.date, list)
    })

    return [...grouped.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, entries]) => ({
        date,
        entries: entries.sort((a, b) => a.startTime.localeCompare(b.startTime)),
      }))
  }, [data.journal, filter, search])

  const totalShown = groups.reduce((sum, group) => sum + group.entries.length, 0)

  function change<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.date) {
      setError('Pilih tanggal jurnal dulu.')
      return
    }
    if (!form.activity.trim()) {
      setError('Tulis dulu kegiatan yang kamu kerjakan.')
      return
    }
    if (minutesBetween(form.startTime, form.endTime) <= 0) {
      setError('Jam selesai harus lebih lambat dari jam mulai.')
      return
    }
    setError('')

    if (editingId) {
      update((draft) => {
        const target = draft.journal.find((entry) => entry.id === editingId)
        if (!target) return
        target.date = form.date
        target.startTime = form.startTime
        target.endTime = form.endTime
        target.category = form.category
        target.activity = form.activity.trim()
        target.result = form.result.trim()
        target.obstacle = form.obstacle.trim()
      })
      notify('Jurnal diperbarui.')
      setEditingId(null)
    } else {
      update((draft) => {
        draft.journal.push({
          id: crypto.randomUUID(),
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          category: form.category,
          activity: form.activity.trim(),
          result: form.result.trim(),
          obstacle: form.obstacle.trim(),
          createdAt: new Date().toISOString(),
        })
      })
      notify('Jurnal tersimpan.')
    }

    setForm(emptyForm())
  }

  function startEdit(entry: JournalEntry) {
    setEditingId(entry.id)
    setError('')
    setForm({
      date: entry.date,
      startTime: entry.startTime,
      endTime: entry.endTime,
      category: entry.category,
      activity: entry.activity,
      result: entry.result,
      obstacle: entry.obstacle,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function remove(entry: JournalEntry) {
    if (!window.confirm(`Hapus jurnal ${formatLong(entry.date)}?`)) return
    update((draft) => {
      draft.journal = draft.journal.filter((item) => item.id !== entry.id)
    })
    if (editingId === entry.id) {
      setEditingId(null)
      setForm(emptyForm())
    }
    notify('Jurnal dihapus.')
  }

  return (
    <>
      <Card
        title={editingId ? 'Ubah jurnal' : 'Tulis jurnal baru'}
        subtitle="Catat apa yang kamu kerjakan, hasilnya, dan kendala yang muncul."
      >
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="journal-date">Tanggal</label>
              <input
                id="journal-date"
                type="date"
                value={form.date}
                onChange={(event) => change('date', event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="journal-start">Jam mulai (WIB)</label>
              <input
                id="journal-start"
                type="time"
                value={form.startTime}
                onChange={(event) => change('startTime', event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="journal-end">Jam selesai (WIB)</label>
              <input
                id="journal-end"
                type="time"
                value={form.endTime}
                onChange={(event) => change('endTime', event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="journal-category">Jenis kegiatan</label>
              <select
                id="journal-category"
                value={form.category}
                onChange={(event) => change('category', event.target.value as JournalCategory)}
              >
                {CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field field-full">
              <label htmlFor="journal-activity">Kegiatan</label>
              <textarea
                id="journal-activity"
                value={form.activity}
                placeholder="Contoh: Membantu input data pelanggan ke spreadsheet bagian administrasi."
                onChange={(event) => change('activity', event.target.value)}
              />
            </div>
            <div className="field field-full">
              <label htmlFor="journal-result">Hasil pekerjaan (opsional)</label>
              <input
                id="journal-result"
                value={form.result}
                placeholder="Contoh: 40 data selesai diinput dan sudah dicek ulang."
                onChange={(event) => change('result', event.target.value)}
              />
            </div>
            <div className="field field-full">
              <label htmlFor="journal-obstacle">Kendala (opsional)</label>
              <input
                id="journal-obstacle"
                value={form.obstacle}
                placeholder="Contoh: Format kolom berbeda dari contoh, perlu konfirmasi pembimbing."
                onChange={(event) => change('obstacle', event.target.value)}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn primary">
              {editingId ? 'Simpan perubahan' : 'Simpan jurnal'}
            </button>
            <span className="small muted">
              Durasi: {formatDuration(minutesBetween(form.startTime, form.endTime))}
            </span>
            {editingId && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setEditingId(null)
                  setForm(emptyForm())
                  setError('')
                }}
              >
                Batal
              </button>
            )}
            {error && <span className="error">{error}</span>}
          </div>
        </form>
      </Card>

      <Card
        title="Riwayat jurnal"
        subtitle={`${totalShown} catatan ditampilkan`}
        actions={
          <div className="filters">
            <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter bulan">
              <option value="all">Semua bulan</option>
              {months.map((month) => (
                <option key={month} value={month}>
                  {monthLabel(month)}
                </option>
              ))}
            </select>
            <input
              type="search"
              value={search}
              placeholder="Cari kegiatan…"
              aria-label="Cari jurnal"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        }
      >
        {groups.length === 0 ? (
          <Empty
            title="Belum ada catatan yang cocok"
            hint="Coba ganti filter bulan atau hapus kata kunci pencarian."
          />
        ) : (
          <div className="day-list">
            {groups.map((group) => (
              <div key={group.date} className="day-group">
                <div className="day-head">
                  <strong>{formatLong(group.date)}</strong>
                  <span className="small muted">
                    {formatDuration(
                      group.entries.reduce(
                        (sum, entry) => sum + minutesBetween(entry.startTime, entry.endTime),
                        0,
                      ),
                    )}
                  </span>
                </div>
                {group.entries.map((entry) => (
                  <article key={entry.id} className="item">
                    <div className="item-main">
                      <div className="item-meta">
                        <span>
                          {entry.startTime}–{entry.endTime}
                        </span>
                        <span>{formatDuration(minutesBetween(entry.startTime, entry.endTime))}</span>
                        <span className={`badge badge-${entry.category}`}>{entry.category}</span>
                      </div>
                      <p className="item-title">{entry.activity}</p>
                      {entry.result && <p className="item-sub">Hasil: {entry.result}</p>}
                      {entry.obstacle && <p className="item-sub">Kendala: {entry.obstacle}</p>}
                    </div>
                    <div className="item-actions">
                      <button type="button" className="btn small" onClick={() => startEdit(entry)}>
                        Ubah
                      </button>
                      <button type="button" className="btn small danger" onClick={() => remove(entry)}>
                        Hapus
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}
