import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isEmptyData, loadRemote, pushChanges, signOutCloud } from './cloud'
import { loadData, saveData, STORAGE_KEY } from './storage'
import { isCloudEnabled, supabase } from './supabase'
import type { AppData, SyncState, TabId } from './types'
import Attendance from './views/Attendance'
import Dashboard from './views/Dashboard'
import Journal from './views/Journal'
import Login from './views/Login'
import Progress from './views/Progress'
import Report from './views/Report'
import Settings from './views/Settings'

const TABS: { id: TabId; label: string }[] = [
  { id: 'ringkasan', label: 'Ringkasan' },
  { id: 'jurnal', label: 'Jurnal' },
  { id: 'absensi', label: 'Absensi' },
  { id: 'progres', label: 'Progres' },
  { id: 'rekap', label: 'Rekap' },
  { id: 'pengaturan', label: 'Pengaturan' },
]

const SYNC_LABEL: Record<SyncState, string> = {
  local: 'Data tersimpan di browser perangkat ini.',
  saving: 'Menyimpan ke Supabase…',
  saved: 'Tersimpan di Supabase',
  error: 'Gagal menyimpan ke Supabase — perubahan masih aman di perangkat ini.',
}

function readTab(): TabId {
  const hash = window.location.hash.replace('#', '')
  const found = TABS.find((tab) => tab.id === hash)
  return found ? found.id : 'ringkasan'
}

function isOfflineError(message: string): boolean {
  return /fetch|network|offline|koneksi/i.test(message)
}

export default function App() {
  const [data, setData] = useState<AppData>(loadData)
  const [tab, setTab] = useState<TabId>(readTab)
  const [flash, setFlash] = useState<string | null>(null)

  const [session, setSession] = useState<Session | null>(null)
  const [authChecked, setAuthChecked] = useState(!isCloudEnabled)
  const [ready, setReady] = useState(!isCloudEnabled)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [syncState, setSyncState] = useState<SyncState>(isCloudEnabled ? 'saving' : 'local')

  // Snapshot terakhir yang sudah ada di Supabase, dipakai untuk menghitung perubahan.
  const syncedRef = useRef<AppData | null>(null)
  const latestRef = useRef(data)
  latestRef.current = data
  const chainRef = useRef<Promise<unknown>>(Promise.resolve())
  const userId = session?.user.id ?? null
  const userIdRef = useRef<string | null>(userId)
  userIdRef.current = userId
  const userEmail = session?.user.email ?? ''

  const flushChanges = useCallback(() => {
    const previous = syncedRef.current
    const next = latestRef.current
    const userId = userIdRef.current
    if (!previous || !userId || previous === next) return

    syncedRef.current = next
    setSyncState('saving')
    chainRef.current = chainRef.current
      .then(() => pushChanges(userId, previous, next))
      .then(() => setSyncState('saved'))
      .catch((error: unknown) => {
        console.error(error)
        // Kembalikan penanda supaya perubahan yang sama dicoba lagi nanti.
        syncedRef.current = previous
        setSyncState('error')
        setFlash('Gagal menyimpan ke Supabase. Perubahan masih ada di perangkat ini.')
      })
  }, [])

  // 1. Pantau sesi login Supabase (termasuk perpanjangan token otomatis).
  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth
      .getSession()
      .then(({ data: auth }) => {
        if (!active) return
        setSession(auth.session)
        setAuthChecked(true)
      })
      .catch(() => {
        if (active) setAuthChecked(true)
      })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthChecked(true)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  // 2. Muat data pengguna dari Supabase setelah login.
  useEffect(() => {
    if (!userId) return
    let active = true
    setReady(false)
    setLoadError(null)
    setSyncState('saving')

    loadRemote(userId)
      .then(async (remote) => {
        if (!active) return
        const local = loadData()
        // Login pertama di perangkat yang sudah punya data: unggah sekali kalau cloud masih kosong.
        const uploadLocal = isEmptyData(remote) && !isEmptyData(local)
        if (uploadLocal) await pushChanges(userId, remote, local)
        if (!active) return

        const next = uploadLocal ? local : remote
        syncedRef.current = next
        setData(next)
        saveData(next)
        setReady(true)
        setSyncState('saved')
        if (uploadLocal) setFlash('Data di perangkat ini diunggah ke Supabase.')
      })
      .catch((error: unknown) => {
        if (!active) return
        console.error(error)
        const message =
          error instanceof Error ? error.message : 'Gagal memuat data dari Supabase.'
        const cached = loadData()

        // Sedang offline: tampilkan salinan terakhir supaya dashboard tetap bisa dibaca.
        if (isOfflineError(message) && !isEmptyData(cached)) {
          syncedRef.current = cached
          setData(cached)
          setReady(true)
          setSyncState('error')
          setFlash('Tidak ada koneksi. Menampilkan data terakhir di perangkat ini.')
          return
        }

        setSyncState('error')
        setLoadError(message)
      })

    return () => {
      active = false
    }
  }, [userId, reloadKey])

  // 3. Kirim perubahan ke Supabase (dijeda sebentar supaya tidak menulis tiap ketikan).
  useEffect(() => {
    if (!ready) return
    saveData(data)
    if (!isCloudEnabled) return
    const timer = window.setTimeout(flushChanges, 600)
    return () => window.clearTimeout(timer)
  }, [data, ready, flushChanges])

  // 4. Kembali online: kirim perubahan yang tertunda.
  useEffect(() => {
    if (!isCloudEnabled) return
    const onOnline = () => flushChanges()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [flushChanges])

  useEffect(() => {
    if (!flash) return
    const timer = window.setTimeout(() => setFlash(null), 2800)
    return () => window.clearTimeout(timer)
  }, [flash])

  // Tab lain di browser yang sama menulis data: muat ulang supaya tidak saling menimpa.
  // Saat memakai Supabase, cloud adalah sumber data, jadi tab lain mengambilnya saat dibuka.
  useEffect(() => {
    if (isCloudEnabled) return
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      setData(loadData())
      setFlash('Data diperbarui dari tab lain.')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    const onHashChange = () => setTab(readTab())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const update = useCallback((mutate: (draft: AppData) => void) => {
    setData((previous) => {
      const draft = structuredClone(previous)
      mutate(draft)
      return draft
    })
  }, [])

  const notify = useCallback((message: string) => setFlash(message), [])

  const handleSignOut = useCallback(async () => {
    if (!window.confirm('Keluar dari akun ini? Data tetap tersimpan di Supabase.')) return
    try {
      await signOutCloud()
      // Cache perangkat dikosongkan supaya akun lain tidak mewarisi data akun ini.
      localStorage.removeItem(STORAGE_KEY)
      syncedRef.current = null
      setReady(false)
      setSyncState('local')
    } catch (error: unknown) {
      setFlash(error instanceof Error ? error.message : 'Gagal keluar. Coba lagi.')
    }
  }, [])

  function navigate(next: TabId) {
    setTab(next)
    window.location.hash = next
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (isCloudEnabled && !authChecked) {
    return (
      <div className="auth">
        <p className="small muted">Memeriksa sesi…</p>
      </div>
    )
  }

  if (isCloudEnabled && !session) return <Login />

  if (isCloudEnabled && loadError) {
    return (
      <div className="auth">
        <div className="auth-card">
          <div className="brand">
            <span className="brand-mark">PKL</span>
            <div>
              <strong>Dashboard PKL</strong>
              <span className="brand-sub">{userEmail}</span>
            </div>
          </div>
          <h1>Data gagal dimuat</h1>
          <p className="small muted">
            Pastikan isi <code>supabase/schema.sql</code> sudah dijalankan di SQL Editor project
            Supabase-mu, lalu coba lagi.
          </p>
          <p className="error">{loadError}</p>
          <div className="auth-actions">
            <button
              type="button"
              className="btn primary"
              onClick={() => setReloadKey((value) => value + 1)}
            >
              Coba lagi
            </button>
            <button type="button" className="btn ghost" onClick={handleSignOut}>
              Keluar
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="auth">
        <p className="small muted">Memuat data dari Supabase…</p>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark">PKL</span>
            <div>
              <strong>Dashboard PKL</strong>
              <span className="brand-sub">
                {data.profile.name ||
                  (isCloudEnabled ? 'Tersinkron dengan Supabase' : 'Personal · data di perangkatmu')}
              </span>
            </div>
          </div>
          <nav className="tabs" aria-label="Navigasi utama">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`tab ${tab === item.id ? 'active' : ''}`}
                aria-current={tab === item.id ? 'page' : undefined}
                onClick={() => navigate(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main>
        {tab === 'ringkasan' && (
          <Dashboard data={data} onNavigate={navigate} cloud={isCloudEnabled} />
        )}
        {tab === 'jurnal' && <Journal data={data} update={update} notify={notify} />}
        {tab === 'absensi' && <Attendance data={data} update={update} />}
        {tab === 'progres' && <Progress data={data} update={update} />}
        {tab === 'rekap' && <Report data={data} />}
        {tab === 'pengaturan' && (
          <Settings
            data={data}
            update={update}
            notify={notify}
            cloud={
              isCloudEnabled ? { email: userEmail, syncState, onSignOut: handleSignOut } : null
            }
          />
        )}
      </main>

      <footer className="footer no-print">
        {isCloudEnabled ? (
          <>
            <span className={`sync-dot sync-${syncState}`} aria-hidden="true" />
            {SYNC_LABEL[syncState]}
            {userEmail && ` · ${userEmail}`}
          </>
        ) : (
          'Data tersimpan di browser perangkat ini. Unduh backup rutin dari halaman Pengaturan.'
        )}
      </footer>

      {flash && (
        <div className="flash" role="status">
          {flash}
        </div>
      )}
    </div>
  )
}
