import { useState } from 'react'
import type { FormEvent } from 'react'
import { signInWithPassword, signUpWithPassword } from '../cloud'

type Mode = 'masuk' | 'daftar'

export default function Login() {
  const [mode, setMode] = useState<Mode>('masuk')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    setInfo('')
    // Email iPhone kadang menyisipkan spasi atau huruf kapital; kata sandi kadang
    // terbawa spasi dari isian otomatis. Keduanya dibersihkan sebelum dikirim.
    const cleanEmail = email.trim().toLowerCase()
    const cleanPassword = password.trim()
    try {
      if (mode === 'masuk') {
        await signInWithPassword(cleanEmail, cleanPassword)
      } else {
        const needsConfirmation = await signUpWithPassword(cleanEmail, cleanPassword)
        if (needsConfirmation) {
          setInfo(
            'Akun dibuat. Buka tautan konfirmasi di emailmu, lalu masuk di sini. Kalau email tidak datang, cek folder spam.',
          )
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

  const credentialError = error.startsWith('Email atau kata sandi salah')

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
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              required
              value={email}
              placeholder="nama@email.com"
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="auth-password">Kata sandi</label>
            <div className="password-wrap">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'masuk' ? 'current-password' : 'new-password'}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                required
                minLength={mode === 'daftar' ? 6 : undefined}
                value={password}
                placeholder={mode === 'daftar' ? 'Minimal 6 karakter' : 'Kata sandi akunmu'}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
              >
                {showPassword ? 'Sembunyikan' : 'Lihat'}
              </button>
            </div>
          </div>

          {error && <p className="error">{error}</p>}
          {credentialError && (
            <div className="small muted auth-hint">
              <p>Kalau kamu yakin email dan kata sandinya benar, biasanya ini penyebabnya:</p>
              <ul>
                <li>Isian otomatis iPhone memasukkan kata sandi situs lain — ketuk <strong>Lihat</strong> di atas untuk memeriksa isinya.</li>
                <li>Email terdaftar memakai huruf besar/kecil berbeda, atau ada spasi di belakangnya.</li>
                <li>Akun ini belum dibuat di proyek Supabase yang sama — coba tombol <strong>Daftar</strong>.</li>
              </ul>
            </div>
          )}
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