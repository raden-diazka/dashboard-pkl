import { useMemo, useState } from 'react'
import { Card, Empty } from '../components/ui'
import {
  formatDuration,
  formatLong,
  hoursDecimal,
  minutesBetween,
  monthKey,
  monthLabel,
  todayISO,
} from '../date'
import type { AppData, AttendanceStatus } from '../types'

export default function Report({ data }: { data: AppData }) {
  const months = useMemo(() => {
    const set = new Set<string>()
    data.journal.forEach((entry) => set.add(monthKey(entry.date)))
    data.attendance.forEach((record) => set.add(monthKey(record.date)))
    set.add(monthKey(todayISO()))
    return [...set].sort().reverse()
  }, [data.journal, data.attendance])

  const [month, setMonth] = useState(() => months[0] ?? monthKey(todayISO()))

  const entries = useMemo(
    () =>
      data.journal
        .filter((entry) => monthKey(entry.date) === month)
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)),
    [data.journal, month],
  )

  const attendance = data.attendance.filter((record) => monthKey(record.date) === month)
  const counts: Record<AttendanceStatus, number> = { hadir: 0, izin: 0, sakit: 0, libur: 0 }
  attendance.forEach((record) => {
    counts[record.status] += 1
  })

  const monthMinutes = entries.reduce(
    (sum, entry) => sum + minutesBetween(entry.startTime, entry.endTime),
    0,
  )
  const totalMinutes = data.journal.reduce(
    (sum, entry) => sum + minutesBetween(entry.startTime, entry.endTime),
    0,
  )
  const recordedDays = counts.hadir + counts.izin + counts.sakit
  const rate = recordedDays > 0 ? Math.round((counts.hadir / recordedDays) * 100) : null

  const { profile } = data
  const period =
    profile.startDate && profile.endDate
      ? `${formatLong(profile.startDate)} – ${formatLong(profile.endDate)}`
      : 'Belum diatur'

  return (
    <Card
      title="Rekap & laporan"
      subtitle="Pilih bulan, lalu cetak atau simpan sebagai PDF untuk lampiran laporan PKL."
      actions={
        <div className="filters no-print">
          <select value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Pilih bulan laporan">
            {months.map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
          </select>
          <button type="button" className="btn primary" onClick={() => window.print()}>
            Cetak / simpan PDF
          </button>
        </div>
      }
    >
      {entries.length === 0 && attendance.length === 0 ? (
        <Empty
          title={`Belum ada data untuk ${monthLabel(month)}`}
          hint="Isi jurnal atau absensi dulu, lalu kembali ke halaman ini."
        />
      ) : (
        <div className="print-doc">
          <header className="report-head">
            <h1>Laporan Kegiatan Praktik Kerja Lapangan</h1>
            <p>{monthLabel(month)}</p>
          </header>

          <table className="report-identity">
            <tbody>
              <tr>
                <td>Nama peserta</td>
                <td>:</td>
                <td>{profile.name || '—'}</td>
              </tr>
              <tr>
                <td>Sekolah / kelas</td>
                <td>:</td>
                <td>{[profile.school, profile.className].filter(Boolean).join(' · ') || '—'}</td>
              </tr>
              <tr>
                <td>Tempat PKL</td>
                <td>:</td>
                <td>{[profile.company, profile.department].filter(Boolean).join(' · ') || '—'}</td>
              </tr>
              <tr>
                <td>Pembimbing lapangan</td>
                <td>:</td>
                <td>{profile.supervisor || '—'}</td>
              </tr>
              <tr>
                <td>Periode PKL</td>
                <td>:</td>
                <td>{period}</td>
              </tr>
            </tbody>
          </table>

          <section className="report-section">
            <h2>Jurnal harian</h2>
            {entries.length === 0 ? (
              <p className="small muted">Tidak ada jurnal pada bulan ini.</p>
            ) : (
              <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Tanggal</th>
                      <th>Jam (WIB)</th>
                      <th>Kegiatan</th>
                      <th>Hasil</th>
                      <th>Kendala</th>
                      <th className="num">Durasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, index) => (
                      <tr key={entry.id}>
                        <td>{index + 1}</td>
                        <td>{formatLong(entry.date)}</td>
                        <td>
                          {entry.startTime}–{entry.endTime}
                        </td>
                        <td>{entry.activity}</td>
                        <td>{entry.result || '—'}</td>
                        <td>{entry.obstacle || '—'}</td>
                        <td className="num">
                          {formatDuration(minutesBetween(entry.startTime, entry.endTime))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="small muted note">
                {entries.length} kegiatan · {hoursDecimal(monthMinutes)} jam pada bulan ini.
              </p>
              </>
            )}
          </section>

          <section className="report-section">
            <h2>Rekap kehadiran</h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Hadir</th>
                    <th>Izin</th>
                    <th>Sakit</th>
                    <th>Libur</th>
                    <th className="num">Persentase hadir</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{counts.hadir} hari</td>
                    <td>{counts.izin} hari</td>
                    <td>{counts.sakit} hari</td>
                    <td>{counts.libur} hari</td>
                    <td className="num">{rate === null ? '—' : `${rate}%`}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="report-section">
            <h2>Jam kerja</h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Jam bulan ini</th>
                    <th>Akumulasi sampai bulan ini</th>
                    <th className="num">Target PKL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{hoursDecimal(monthMinutes)} jam</td>
                    <td>{hoursDecimal(totalMinutes)} jam</td>
                    <td className="num">{profile.targetHours} jam</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <div className="sign-grid">
            <div>
              <p>{profile.supervisorTitle || 'Pembimbing Lapangan'}</p>
              <div className="sign-space" />
              <p className="sign-name">{profile.supervisor || '………………………………'}</p>
            </div>
            <div>
              <p>Peserta PKL</p>
              <div className="sign-space" />
              <p className="sign-name">{profile.name || '………………………………'}</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
