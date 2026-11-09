# Dashboard PKL

Dashboard personal untuk mencatat Praktik Kerja Lapangan: jurnal harian, absensi, progres jam,
dan rekap siap cetak.

Data disimpan di database **Supabase** (Postgres), jadi jurnalmu bisa dibuka dari HP maupun
laptop dengan akun yang sama. Kalau Supabase belum dikonfigurasi, aplikasi tetap berjalan
seperti sebelumnya: semua data disimpan di `localStorage` browser.

## Menjalankan

```bash
npm install
cp .env.example .env   # lalu isi dua nilai dari Supabase (lihat bawah)
npm run dev
```

Buka alamat yang ditampilkan Vite (biasanya `http://localhost:5173`).

Build produksi:

```bash
npm run build
npm run preview
```

Hasil build ada di `dist/`. Untuk menerbitkannya ke Vercel, ikuti
[CARA-DEPLOY-VERCEL.md](CARA-DEPLOY-VERCEL.md).

Tidak ingin memasang Node.js? Semua langkahnya bisa dikerjakan dari browser:
[PANDUAN-SETUP.md](PANDUAN-SETUP.md) menjelaskan cara mengedit lewat GitHub/github.dev,
pratinjau dengan Codespaces, dan membiarkan Vercel yang menjalankan build.

## Menyiapkan Supabase (sekali saja)

1. Buat akun gratis di <https://supabase.com>, lalu **New project**. Pilih region terdekat
   (misal Singapore) dan simpan kata sandi database-mu.
2. Buka **SQL Editor → New query**, tempel seluruh isi [`supabase/schema.sql`](supabase/schema.sql),
   lalu tekan **Run**. Skrip ini membuat tabel `profiles`, `journal_entries`, `attendance`,
   `tasks`, dan mengaktifkan row level security sehingga setiap akun hanya bisa melihat datanya
   sendiri.
3. Klik **Connect** di dashboard proyek (atau **Settings → API Keys**), salin **Project URL**
   dan **publishable key** (`sb_publishable_…`). Di proyek lama kunci ini bernama
   **anon public**.
4. Salin `.env.example` menjadi `.env`, lalu isi:

   ```bash
   VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=publishable-key-kamu
   ```

   Nama variabelnya tetap `VITE_SUPABASE_ANON_KEY`; isinya boleh publishable key maupun anon
   key. Nama `VITE_SUPABASE_PUBLISHABLE_KEY` juga diterima.

5. Jalankan ulang `npm run dev`, lalu buat akun lewat halaman **Daftar** di aplikasi.
   Secara default Supabase mengirim email konfirmasi. Untuk mencoba cepat tanpa menunggu email,
   matikan **Authentication → Sign In / Providers → Email → Confirm email**, atau klik tautan
   konfirmasi di kotak masukmu sebelum masuk.
6. Selesai. Setiap perubahan langsung tersimpan ke tabel di Supabase.

> **Catatan keamanan.** Kunci publishable (dulu: `anon public`) memang boleh ada di kode
> frontend. Yang menjaga data adalah row level security: tanpa login, tabel tidak bisa dibaca
> atau ditulis. Jangan pernah memakai **secret key** / `service_role` di aplikasi ini.

### Sudah punya data di browser?

Kalau cloud masih kosong dan perangkat ini punya data lama, data itu otomatis diunggah saat
kamu pertama kali masuk — tidak perlu menyalin manual. Data dari perangkat lain bisa dipindahkan
lewat **Pengaturan → Unduh backup** lalu **Pulihkan dari file** setelah login.

## Cara kerja penyimpanan

- **Mode Supabase** (env terisi): aplikasi meminta login email + kata sandi, memuat data akun
  dari database, lalu menyimpan perubahan otomatis (dijeda ±0,6 detik supaya tidak menulis tiap
  ketikan). Hanya baris yang berubah yang dikirim.
- **Mode lokal** (env kosong): data disimpan di `localStorage` seperti versi awal, dan halaman
  Pengaturan menampilkan pengingat bahwa Supabase belum dikonfigurasi.
- Salinan terakhir juga ditulis ke `localStorage` sebagai cache, supaya aplikasi tetap terbuka
  cepat dan bisa dibaca saat offline.

## Menjaga Supabase tetap aktif

Proyek Supabase Free dijeda kalau aktivitas database-nya terlalu sedikit selama ±7 hari.
Workflow [`.github/workflows/supabase-keepalive.yml`](.github/workflows/supabase-keepalive.yml)
mengirim satu query ringan ke tabel `profiles` dua kali sehari lewat GitHub Actions.

Sekali saja, isi dua repository secret di **Settings → Secrets and variables → Actions**:
`SUPABASE_URL` dan `SUPABASE_ANON_KEY` (publishable/anon key). Lalu jalankan sekali dari tab
**Actions → Supabase keep-alive → Run workflow**. Detail dan catatannya ada di
[PANDUAN-SETUP.md](PANDUAN-SETUP.md#9-jaga-supabase-tetap-aktif-github-actions).

## Halaman

- **Masuk / Daftar** — login email + kata sandi ke akun Supabase (hanya muncul kalau Supabase
  aktif).
- **Ringkasan** — progres jam, kehadiran bulan ini, sisa hari PKL, jurnal hari ini, tugas tertunda.
- **Jurnal** — catat tanggal, jam mulai/selesai, kegiatan, hasil, kendala. Bisa difilter per bulan
  dan dicari.
- **Absensi** — kalender bulanan; klik tanggal untuk menandai hadir/izin/sakit/libur. Klik status
  yang sama sekali lagi untuk membatalkan, lengkap dengan rekap persentase.
- **Progres** — target jam, sisa jam, grafik 8 minggu terakhir, dan daftar tugas (tenggat yang
  terlewat ditandai merah).
- **Rekap** — laporan bulanan siap dicetak atau disimpan sebagai PDF (tombol *Cetak / simpan PDF*).
- **Pengaturan** — akun & status sinkron, profil PKL, backup `.json`, pemulihan, dan hapus data.

## Catatan penting

- Data terikat ke akun Supabase-mu. Masuk dari perangkat lain dan datanya sama.
- Status sinkron ada di bagian bawah halaman: *Menyimpan…*, *Tersimpan di Supabase*, atau
  *Gagal menyimpan*. Kalau gagal, perubahan tetap ada di perangkat ini dan dicoba lagi saat
  kamu mengubah data berikutnya.
- **Hapus semua data** di Pengaturan juga menghapus baris di Supabase, bukan hanya di browser.
- Backup `.json` tetap disarankan sebelum menghapus data atau pindah akun.
- Untuk cetak PDF: pilih bulan di halaman Rekap, tekan *Cetak / simpan PDF*, lalu pilih
  "Save as PDF" pada dialog cetak.
- Build produksi mendaftarkan service worker (`public/sw.js`), jadi setelah situs dibuka sekali,
  tampilannya tetap bisa dibuka saat koneksi mati (data baru butuh koneksi).

## Teknologi

React 19, TypeScript, Vite, dan `@supabase/supabase-js` (Postgres + Auth + row level security).

## Struktur yang penting

```
index.html            # halaman awal
vercel.json           # pengaturan build + cache
.env.example          # contoh isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
supabase/schema.sql   # tabel + policy RLS, dijalankan sekali di SQL Editor
public/               # ikon, manifest PWA, service worker (disalin apa adanya ke dist/)
src/                  # seluruh kode aplikasi
├── App.tsx           # navigasi tab, sesi login, autosave, sinkron ke Supabase
├── supabase.ts       # client Supabase dari environment variable
├── cloud.ts          # muat/simpan data per tabel + fungsi login
├── storage.ts        # cache localStorage, backup, normalisasi impor
├── date.ts           # helper tanggal & format Bahasa Indonesia
└── views/            # Login, Ringkasan, Jurnal, Absensi, Progres, Rekap, Pengaturan
```
