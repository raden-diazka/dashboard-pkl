import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Card } from '../components/ui'
import { formatShort } from '../date'
import { importedRange, importSchoolCSV, isSchoolJournalCSV } from '../importSchool'
import { defaultData, downloadBackup, parseImport } from '../storage'
import type { AppData, CloudAccount, Profile, Update } from '../types'

type Props = {
  data: AppData
  update: Update
  notify: (message: string) => void
  cloud: CloudAccount | null
}

const SYNC_TEXT: Record<CloudAccount['syncState'], string> = {
  local: 'Belum tersambung ke Supabase.',
  saving: 'Menyimpan perubahan ke Supabase…',
  saved: 'Semua perubahan sudah tersimpan di Supabase.',
  error: 'Gagal menyimpan. Perubahan masih ada di perangkat ini, coba lagi setelah koneksi pulih.',
}

export default function Settings({ data, update, notify, cloud }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const schoolInput = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState('')
  const [schoolError, setSchoolError] = useState('')

  function setField<K extends keyof Profile>(key: K, value: Profile[K]) {
    update((draft) => {
      draft.profile[key] = value
    })
  }

  function handleExport() {
    downloadBackup(data)
    update((draft) => {
      draft.lastExportAt = new Date().toISOString()
    })
    notify('Backup berhasil diunduh.')
  }

  function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const imported = parseImport(String(reader.result))
        if (!window.confirm('Ganti semua data di dashboard ini dengan isi file backup?')) return
        update((draft) => {
          Object.assign(draft, imported)
        })
        setImportError('')
        notify('Data berhasil dipulihkan.')
      } catch {
        setImportError('File tidak dikenali. Pastikan file berasal dari tombol Backup di halaman ini.')
      } finally {
        event.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  function handleSchoolImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result)
      if (!isSchoolJournalCSV(text)) {
        setSchoolError('File CSV tidak dikenali. Pastikan ada kolom "Tanggal" dan "Deskripsi Kegiatan".')
        event.target.value = ''
        return
      }

      const result = importSchoolCSV(text, data)
      if (result.journals.length === 0 && result.attendance.length === 0) {
        setSchoolError(
          result.duplicateRows > 0
            ? 'Semua baris di file itu sudah ada di dashboard, tidak ada yang ditambahkan.'
            : 'Tidak ada baris jurnal yang bisa dibaca dari file itu.',
        )
        event.target.value = ''
        return
      }

      update((draft) => {
        draft.journal.push(...result.journals)
        result.attendance.forEach((record) => {
          const existing = draft.attendance.find((item) => item.date === record.date)
          if (existing) existing.status = record.status
          else draft.attendance.push(record)
        })
      })

      const range = importedRange(result.journals)
      const journalText = range ? `${result.journals.length} jurnal (${range})` : '0 jurnal'
      setSchoolError('')
      notify(`${journalText} dan ${result.attendance.length} absensi diimpor.`)
      event.target.value = ''
    }
    reader.readAsText(file)
  }

  function handleReset() {
    if (!window.confirm('Hapus seluruh jurnal, absensi, dan tugas? Tindakan ini tidak bisa dibatalkan.')) {
      return
    }
    update((draft) => {
      Object.assign(draft, defaultData())
    })
    notify('Semua data dihapus.')
  }

  return (
    <>
      <Card
        title="Akun & database"
        subtitle={
          cloud
            ? 'Data jurnal, absensi, dan tugas disimpan di Supabase, bukan hanya di browser ini.'
            : 'Supabase belum aktif, jadi data tersimpan di browser perangkat ini saja.'
        }
      >
        {cloud ? (
          <>
            <p className="small">
              Masuk sebagai <strong>{cloud.email || 'akun Supabase'}</strong>
            </p>
            <p className="small muted note">
              <span className={`sync-dot sync-${cloud.syncState}`} aria-hidden="true" />
              {SYNC_TEXT[cloud.syncState]}
            </p>
            <div className="form-actions">
              <button type="button" className="btn" onClick={cloud.onSignOut}>
                Keluar dari akun
              </button>
            </div>
          </>
        ) : (
          <div className="notice">
            <span>
              Supabase belum dikonfigurasi, jadi data masih tersimpan di browser ini saja. Isi
              {' '}<code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code>, lalu jalankan
              ulang aplikasi. Langkah lengkapnya ada di README.
            </span>
          </div>
        )}
      </Card>

      <Card
        title="Profil PKL"
        subtitle="Data ini dipakai untuk judul rekap dan bagian tanda tangan di laporan."
      >
        <div className="form-grid">
          <div className="field">
            <label htmlFor="profile-name">Nama lengkap</label>
            <input
              id="profile-name"
              value={data.profile.name}
              placeholder="Nama kamu"
              onChange={(event) => setField('name', event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="profile-school">Sekolah / kampus</label>
            <input
              id="profile-school"
              value={data.profile.school}
              placeholder="SMK Negeri 1 …"
              onChange={(event) => setField('school', event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="profile-class">Kelas / jurusan</label>
            <input
              id="profile-class"
              value={data.profile.className}
              placeholder="XII RPL 2"
              onChange={(event) => setField('className', event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="profile-company">Tempat PKL</label>
            <input
              id="profile-company"
              value={data.profile.company}
              placeholder="CV Maju Bersama"
              onChange={(event) => setField('company', event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="profile-department">Bagian / divisi</label>
            <input
              id="profile-department"
              value={data.profile.department}
              placeholder="Administrasi"
              onChange={(event) => setField('department', event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="profile-supervisor">Nama pembimbing lapangan</label>
            <input
              id="profile-supervisor"
              value={data.profile.supervisor}
              placeholder="Budi Santoso"
              onChange={(event) => setField('supervisor', event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="profile-supervisor-title">Jabatan pembimbing</label>
            <input
              id="profile-supervisor-title"
              value={data.profile.supervisorTitle}
              placeholder="Pembimbing Lapangan"
              onChange={(event) => setField('supervisorTitle', event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="profile-target">Target jam PKL</label>
            <input
              id="profile-target"
              type="number"
              min={0}
              step={8}
              value={data.profile.targetHours}
              onChange={(event) => {
                const value = Number(event.target.value)
                setField('targetHours', Number.isFinite(value) && value >= 0 ? value : 0)
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="profile-start">Tanggal mulai</label>
            <input
              id="profile-start"
              type="date"
              value={data.profile.startDate}
              onChange={(event) => setField('startDate', event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="profile-end">Tanggal selesai</label>
            <input
              id="profile-end"
              type="date"
              value={data.profile.endDate}
              onChange={(event) => setField('endDate', event.target.value)}
            />
          </div>
        </div>
        <p className="small muted note">
          {cloud
            ? 'Perubahan tersimpan otomatis ke Supabase.'
            : 'Perubahan tersimpan otomatis di perangkat ini.'}
        </p>
      </Card>

      <Card
        title="Backup & pemulihan"
        subtitle={
          cloud
            ? 'Data sudah tersimpan di Supabase. Backup .json tetap berguna sebagai salinan lepas kalau suatu saat perlu dipindahkan.'
            : 'Data hanya tersimpan di browser ini, jadi rutin unduh backup sebelum mengganti perangkat atau membersihkan browser.'
        }
      >
        <div className="backup-actions">
          <button type="button" className="btn primary" onClick={handleExport}>
            Unduh backup (.json)
          </button>
          <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
            Pulihkan dari file
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden-input"
            onChange={handleImport}
          />
        </div>
        <p className="small muted note">
          {data.lastExportAt
            ? `Backup terakhir diunduh ${formatShort(data.lastExportAt.slice(0, 10))}.`
            : 'Belum pernah membuat backup di perangkat ini.'}
        </p>
        {importError && <p className="error">{importError}</p>}
      </Card>

      <Card
        title="Impor jurnal dari web sekolah"
        subtitle="Unggah file CSV ekspor jurnal PKL. Kolom Tanggal, Status Kehadiran, dan Deskripsi Kegiatan yang dipakai."
      >
        <div className="backup-actions">
          <button type="button" className="btn" onClick={() => schoolInput.current?.click()}>
            Pilih file CSV jurnal
          </button>
          <input
            ref={schoolInput}
            type="file"
            accept=".csv,text/csv"
            className="hidden-input"
            onChange={handleSchoolImport}
          />
        </div>
        <p className="small muted note">
          Jam kerja diisi 08:00–16:00 karena file sekolah tidak memuat jam; durasi tiap entri bisa
          diubah di halaman Jurnal. Baris yang sudah pernah diimpor tidak digandakan.
        </p>
        {schoolError && <p className="error">{schoolError}</p>}
      </Card>

      <Card
        title="Hapus data"
        subtitle={
          cloud
            ? 'Menghapus data di sini juga menghapusnya dari Supabase. Mulai dari nol kalau data percobaan sudah tidak dibutuhkan.'
            : 'Mulai dari nol kalau data percobaan sudah tidak dibutuhkan.'
        }
      >
        <button type="button" className="btn danger" onClick={handleReset}>
          Hapus semua data
        </button>
      </Card>
    </>
  )
}