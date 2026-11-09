import { useState } from 'react'
import type { FormEvent } from 'react'
import { signInWithPassword, signUpWithPassword } from '../cloud'

type Mode = 'masuk' | 'daftar'

export default function Login() {
  const [mode, setMode] = useState<Mode>('masuk')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    setInfo('')
    try {
      if (mode === 'masuk') {
        await signInWithPassword(email.trim(), password)
      } else {
        const needsConfirmation = await signUpWithPassword(email.trim(), password)
        if (needsConfirmation) {
          setInfo('Akun dibuat. Buka tautan konfirmasi di emailmu, lalu masuk di sini.')
          setMode('masuk')
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal masuk. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setInfo('')
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-mark">PKL</span>
          <div>
            <strong>Dashboard PKL</strong>
            <span className="brand-sub">Jurnal · absensi · progres</span>
          </div>
        </div>

        <h1>{mode === 'masuk' ? 'Masuk ke dashboard' : 'Buat akun baru'}</h1>
        <p className="muted small">
          Jurnal, absensi, dan progresmu disimpan di database Supabase, jadi bisa dibuka dari
          perangkat mana pun.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              placeholder="nama@email.com"
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="auth-password">Kata sandi</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === 'masuk' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              placeholder="Minimal 6 karakter"
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error && <p className="error">{error}</p>}
          {info && <p className="small muted">{info}</p>}

          <button type="submit" className="btn primary auth-submit" disabled={busy}>
            {busy ? 'Memproses…' : mode === 'masuk' ? 'Masuk' : 'Daftar'}
          </button>
        </form>

        <p className="small muted auth-switch">
          {mode === 'masuk' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
          <button
            type="button"
            className="link-button"
            onClick={() => switchMode(mode === 'masuk' ? 'daftar' : 'masuk')}
          >
            {mode === 'masuk' ? 'Daftar' : 'Masuk'}
          </button>
        </p>
      </div>

      <p className="small muted auth-foot">
        Data hanya bisa dilihat oleh akunmu sendiri (row level security Supabase).
      </p>
    </div>
  )
}
