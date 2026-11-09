import { createClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
// Supabase sekarang menyebut kunci ini "publishable key" (sb_publishable_…).
// Nama lama "anon key" tetap diterima supaya proyek lama tidak perlu diubah.
const publicKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  ''
).trim()

/** True kalau URL dan kunci publik Supabase sudah diisi lewat environment variable. */
export const isCloudEnabled = Boolean(url && publicKey)

export const supabase = isCloudEnabled
  ? createClient(url, publicKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null

export function requireSupabase() {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.')
  return supabase
}
