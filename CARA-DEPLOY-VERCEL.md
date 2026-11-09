# Deploy ke Vercel (gratis)

Semua yang dibutuhkan sudah ada di folder ini: React + Vite, `vercel.json`, build yang
menghasilkan `dist/`, dan koneksi Supabase lewat dua environment variable.

## Sebelum mulai

Butuh tiga hal:

1. Akun Vercel gratis — daftar di <https://vercel.com/signup> (bisa pakai akun GitHub/Google).
2. Proyek Supabase gratis + skema database — ikuti [PANDUAN-SETUP.md](PANDUAN-SETUP.md)
   atau bagian **Menyiapkan Supabase** di [README.md](README.md#menyiapkan-supabase-sekali-saja).
   Kamu akan mendapat **Project URL** dan **publishable key** (`sb_publishable_…`; di proyek
   lama namanya **anon public**).
3. Node.js versi 20.19 atau lebih baru kalau kamu ingin menjalankan build di komputer sendiri.

Kalau `npm install` gagal karena Node terlalu lama, pasang Node LTS terbaru dari
<https://nodejs.org>.

## Cara 1 — lewat GitHub (paling mudah, auto-deploy)

1. Buat repository baru di GitHub, misal `dashboard-pkl`.
2. Unggah isi folder ini ke repository tersebut (tanpa `node_modules`, `dist`, dan `.env`):

   ```bash
   cd dashboard-pkl
   git init
   git add .
   git commit -m "Dashboard PKL"
   git branch -M main
   git remote add origin https://github.com/USERNAME/dashboard-pkl.git
   git push -u origin main
   ```

   Atau lewat web GitHub: **Add file → Upload files**, lalu seret semua file dan folder.

   `.env` tidak ikut di-commit (sudah ada di `.gitignore`), jadi nilainya diisi di Vercel
   pada langkah 4.

3. Buka <https://vercel.com/new>, pilih **Import Git Repository**, izinkan akses ke GitHub,
   lalu pilih repository `dashboard-pkl`. Vercel mendeteksi Vite otomatis:

   | Pengaturan | Nilai |
   |---|---|
   | Framework Preset | Vite |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |
   | Install Command | `npm install` |

4. Sebelum menekan **Deploy**, buka **Environment Variables** dan tambahkan dua baris berikut
   untuk Production, Preview, dan Development:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | Project URL dari Supabase |
   | `VITE_SUPABASE_ANON_KEY` | Publishable key (`sb_publishable_…`) atau anon public key |

5. Tekan **Deploy** dan tunggu ± 1 menit. Kamu akan mendapat alamat seperti
   `https://dashboard-pkl-namamu.vercel.app`.

Setiap kali kamu `git push`, Vercel otomatis membangun ulang dan menerbitkan versi barunya.

> Kalau environment variable ditambahkan setelah deploy pertama, buka **Deployments → … →
> Redeploy** supaya nilainya ikut masuk ke build. Nilai `VITE_*` ditanam saat build, bukan saat
> halaman dibuka.

## Cara 2 — lewat terminal (tanpa GitHub)

```bash
npm install -g vercel

cd dashboard-pkl
vercel login      # masuk lewat email atau GitHub
vercel            # deploy preview
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel --prod     # deploy produksi
```

Saat `vercel env add`, tempel nilainya lalu pilih environment Production, Preview, dan
Development. Jawab pertanyaan lain dengan menekan Enter (Vercel sudah membaca `vercel.json`).
Alamat produksi akan ditampilkan di akhir proses.

## Setelah terbit

- **Buka dari HP**: buka alamat `.vercel.app` di Chrome/Safari, masuk dengan akun yang sama,
  lalu **Tambahkan ke layar utama** ("Add to Home Screen"). Ikonnya muncul seperti aplikasi biasa.
- **Ganti domain**: tab **Settings → Domains** di dashboard Vercel. Domain `.vercel.app`
  gratis; domain sendiri (misal `.my.id`) opsional dan berbayar di penyedia domain.
- **Siapa pun yang tahu URL** hanya melihat halaman login. Data tiap akun terpisah oleh row level
  security Supabase, jadi tidak ada dashboard orang lain yang bisa dibaca.
- **Langkah lengkap dari nol** (Supabase → lokal → GitHub → Vercel) ada di
  [PANDUAN-SETUP.md](PANDUAN-SETUP.md).

## Yang perlu diingat soal data

Situs di Vercel hanya berisi kode. Jurnal, absensi, profil, dan tugas tersimpan di database
Supabase milikmu.

- HP dan laptop memakai akun yang sama ⇒ datanya sama, tanpa perlu backup manual.
- anon public key memang terlihat di kode browser. Itu aman selama row level security aktif
  (sudah diatur `supabase/schema.sql`). Jangan menaruh **service_role** key di proyek ini.
- Tetap rutin tekan **Unduh backup (.json)** di Pengaturan sebagai salinan lepas, terutama
  sebelum menghapus data atau mengganti akun.
- Supabase free tier bisa menjeda proyek setelah lama tidak dipakai. Kalau aplikasi menampilkan
  "Data gagal dimuat", buka dashboard Supabase dan aktifkan kembali proyeknya.

## Kalau build gagal di Vercel

- **Node versi lama**: pastikan *Settings → General → Node.js Version* berisi 20.x atau 22.x.
- **`tsc: not found`**: jangan hapus `devDependencies`; Vercel memasang semuanya saat build.
- **Halaman 404 setelah refresh**: aplikasi memakai routing berbasis `#` (misal
  `/#jurnal`), jadi alamatnya selalu berada di `/`. Buka alamat utama, bukan `/jurnal`.
- **Perubahan tidak muncul**: tekan Ctrl+Shift+R sekali. Service worker menyajikan versi
  lama untuk aset, sedangkan dokumen selalu diambil dari jaringan.

## Kalau login atau data bermasalah

- **Halaman login tidak muncul, aplikasi tetap mode lokal**: environment variable
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` belum terpasang di environment yang kamu buka.
  Tambahkan lalu redeploy.
- **"Email belum dikonfirmasi"**: buka tautan konfirmasi di email, atau matikan
  *Authentication → Sign In / Providers → Email → Confirm email* di Supabase.
- **"Data gagal dimuat" setelah login**: skema belum dijalankan. Buka **SQL Editor** di Supabase,
  jalankan ulang isi `supabase/schema.sql`, lalu tekan *Coba lagi*.
- **Lupa kata sandi**: reset lewat Supabase Dashboard → **Authentication → Users**, atau kirim
  email reset dari sana.

## Struktur yang penting

```
index.html            # halaman awal
vercel.json           # pengaturan build + cache
.env.example          # contoh isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
supabase/schema.sql   # tabel + policy RLS (dijalankan sekali di Supabase)
public/               # ikon, manifest PWA, service worker (disalin apa adanya ke dist/)
src/                  # seluruh kode aplikasi
├── App.tsx           # navigasi tab, sesi login, autosave, sinkron ke Supabase
├── supabase.ts       # client Supabase dari environment variable
├── cloud.ts          # muat/simpan data per tabel + fungsi login
├── storage.ts        # cache localStorage, backup, normalisasi impor
├── date.ts           # helper tanggal & format Bahasa Indonesia
└── views/            # Login, Ringkasan, Jurnal, Absensi, Progres, Rekap, Pengaturan
```
