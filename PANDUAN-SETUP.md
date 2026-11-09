# Panduan setup: Supabase + Vercel (tanpa install Node.js)

Semua langkah di sini bisa dikerjakan dari browser. Kamu **tidak perlu** memasang Node.js:
kode diedit di GitHub (atau VS Code for the Web), dan yang menjalankan `npm install` +
`npm run build` adalah Vercel.

Kalau nanti ingin mencoba aplikasinya sebelum terbit, ada GitHub Codespaces — komputer Linux
sementara di cloud yang sudah punya Node, tanpa memasang apa pun di laptopmu.

| Tahap | Yang dilakukan | Perkiraan waktu |
|---|---|---|
| 0 | Siapkan akun | 5 menit |
| 1 | Buat proyek Supabase | 3 menit |
| 2 | Buat tabel database | 3 menit |
| 3 | Ambil URL & kunci | 1 menit |
| 4 | Aktifkan login email | 2 menit |
| 5 | Unggah kode ke GitHub | 10 menit |
| 6 | (Opsional) pratinjau tanpa install Node | 5 menit |
| 7 | Deploy ke Vercel | 5 menit |
| 8 | Uji hasil terbit | 5 menit |
| 9 | Pasang keep-alive Supabase | 5 menit |

---

## 0. Siapkan akun

- **Supabase** (gratis) — <https://supabase.com>
- **Vercel** (gratis) — <https://vercel.com/signup>
- **GitHub** (gratis) — <https://github.com/signup>

Tidak ada yang perlu dipasang di komputer.

---

## 1. Buat proyek Supabase

1. Buka <https://supabase.com> → **Start your project** → masuk dengan GitHub/Google.
2. Klik **New project**, lalu isi:
   - **Organization**: biarkan default.
   - **Name**: `dashboard-pkl`.
   - **Database Password**: klik *Generate a password*, lalu simpan di tempat aman.
     Ini kata sandi database, bukan kata sandi login aplikasi.
   - **Region**: **Southeast Asia (Singapore)**.
   - **Plan**: Free.
3. Klik **Create new project**, tunggu 1–2 menit sampai status **Active**.

**Cek:** dashboard proyek terbuka dan tidak ada tulisan "Setting up project" lagi.

---

## 2. Buat tabel database

1. Sidebar kiri → **SQL Editor** → **New query**.
2. Buka file [`supabase/schema.sql`](supabase/schema.sql), salin **seluruh isinya**, tempel ke
   kotak query.
3. Klik **Run**.

**Cek:** muncul `Success. No rows returned`. Buka **Table Editor** — ada 4 tabel:
`attendance`, `journal_entries`, `profiles`, `tasks`.

Skrip ini mengaktifkan **row level security**, jadi tiap akun hanya bisa membaca dan mengubah
barisnya sendiri. Aman dijalankan ulang.

---

## 3. Ambil URL dan kunci proyek

1. Klik **Connect** di bagian atas dashboard proyek.
2. Catat dua nilai:
   - **Project URL** — `https://abcdefghijkl.supabase.co`
   - **Publishable key** — `sb_publishable_...`
     (proyek lama menyebutnya **anon public**, bentuknya JWT panjang)

Kalau tombol Connect tidak ada: **Settings → API Keys**. Menu "Settings → API" yang lama sudah
dihapus Supabase.

> Ambil kunci **publishable / anon public**, bukan **secret** atau `service_role`. Kunci
> publishable memang boleh ada di kode browser; yang melindungi data adalah RLS.

**Cek:** dua nilai tersimpan, tanpa spasi di ujung.

---

## 4. Aktifkan login email

1. **Authentication → Sign In / Providers** → **Email**.
2. Pastikan **Enable Email provider** aktif.
3. **Confirm email**: matikan kalau ingin langsung bisa masuk setelah daftar (praktis saat
   uji coba). Kalau dibiarkan aktif, buka tautan konfirmasi di email sebelum masuk.
4. **Save**.

**Cek:** provider Email berstatus *Enabled*.

---

## 5. Unggah kode ke GitHub

Kalau proyek ini sudah ada di sebuah repository GitHub, lewati ke tahap 6.

1. Unduh salinan proyek dari panel **Files** di chat ini (atau minta versi zip-nya), lalu
   ekstrak di komputer. Yang ikut diunggah hanya kode:
   - **Ya:** `index.html`, `package.json`, `package-lock.json`, `tsconfig.json`,
     `vite.config.ts`, `vercel.json`, `sites.manifest.json`, `.env.example`, `.gitignore`,
     `README.md`, `CARA-DEPLOY-VERCEL.md`, `PANDUAN-SETUP.md`, folder `src/`, `public/`,
     `worker/`, `supabase/`, dan `.github/`.
   - **Tidak:** `node_modules/`, `dist/`, `artifacts/`, `freebuff-sites-build/`, dan `.env`.
2. Buat repository kosong di <https://github.com/new>: nama `dashboard-pkl`, **jangan** centang
   "Add a README file", lalu **Create repository**.
3. Di halaman repo, klik **Add file → Upload files**, seret semua file dan folder tadi, lalu
   **Commit changes**.

**Cek:** halaman repo menampilkan folder `src`, `supabase`, `.github`, dan **tidak ada**
`node_modules` maupun `.env`.

> File `.github/workflows/supabase-keepalive.yml` dipakai di tahap 9. Kalau foldernya tidak
> ikut terunggah, buat manual: **Add file → Create new file**, isi nama
> `.github/workflows/supabase-keepalive.yml`, tempel isinya, commit.

---

## 6. (Opsional) Pratinjau tanpa install Node

Ada tiga cara, pilih sesuai kebutuhan:

**a. Edit langsung di browser — github.dev**
Buka repo di GitHub, tekan tombol **`.`** (titik) pada keyboard. VS Code for the Web terbuka
dengan seluruh isi repo. Edit file, lalu tab **Source Control** → commit ke `main`.
Tidak ada terminal dan tidak ada `npm` — cocok untuk mengubah teks, gaya, atau isi halaman.

**b. Menjalankan dev server di cloud — GitHub Codespaces**
Di halaman repo: **Code → Codespaces → Create codespace on main**. Tunggu ±1 menit, lalu di
terminal yang muncul:

```bash
npm install
npm run dev -- --host
```

Buka tab **Ports**, arahkan port 5173 ke *Open in Browser*. Ini menjalankan Vite lengkap dengan
hot reload, tanpa memasang Node di laptop. Kuota gratis Codespaces sekitar 60 jam/bulan dan
otomatis berhenti saat idle. Untuk dev server, buat `.env` dari `.env.example` dan isi URL +
publishable key (langkah 3). File `.env` ini tidak ikut ter-commit.

**c. Cukup andalkan Vercel**
Setiap push ke `main` (atau pull request) otomatis dibangun Vercel dan diberi URL pratinjau.
Build Vercel sudah menjalankan `tsc` + `vite build`, jadi error TypeScript langsung terlihat
di sana. Ini cara paling ringan kalau kamu hanya ingin melihat hasilnya.

**Cek:** salah satu dari ketiganya berhasil menampilkan halaman login aplikasi.

---

## 7. Deploy ke Vercel

1. Buka <https://vercel.com/new> → **Import Git Repository** → izinkan akses GitHub →
   pilih `dashboard-pkl`.
2. Vercel mendeteksi Vite otomatis. Pastikan:

   | Pengaturan | Nilai |
   |---|---|
   | Framework Preset | Vite |
   | Root Directory | `./` (biarkan) |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |
   | Install Command | `npm install` |

3. Buka **Environment Variables**, tambahkan **dua** baris dan centang **Production**,
   **Preview**, serta **Development**:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | Project URL dari tahap 3 |
   | `VITE_SUPABASE_ANON_KEY` | Publishable key dari tahap 3 |

4. Klik **Deploy**, tunggu ±1 menit sampai **Congratulations**.

**Cek:** buka `https://dashboard-pkl-xxxx.vercel.app` → yang muncul pertama adalah halaman
**login**, bukan dashboard kosong.

Kalau terlanjur deploy sebelum env diisi: **Settings → Environment Variables** → tambahkan
keduanya → tab **Deployments** → **⋯** pada deploy terakhir → **Redeploy**. Nilai `VITE_*`
ditanam saat build, jadi setiap mengubahnya wajib redeploy.

---

## 8. Uji setelah terbit

| Langkah | Hasil yang diharapkan |
|---|---|
| Buka URL Vercel | Halaman login tampil |
| Klik **Daftar**, buat akun | Masuk ke dashboard (atau email konfirmasi, sesuai tahap 4) |
| Tulis jurnal, tunggu 2 detik | Footer: *Tersimpan di Supabase* |
| Refresh halaman | Jurnal baru masih ada |
| Buka URL yang sama di HP | Login → data sama |
| Supabase → Table Editor → `journal_entries` | Baris baru muncul |

Satu akun = satu dashboard. Ingin dashboard terpisah untuk orang lain? Buat akun dengan email
lain — datanya otomatis terpisah oleh RLS.

---

## 9. Jaga Supabase tetap aktif (GitHub Actions)

Proyek Supabase **Free** dijeda kalau aktivitas database-nya terlalu sedikit selama ±7 hari.
Repo ini sudah menyertakan workflow [`.github/workflows/supabase-keepalive.yml`](.github/workflows/supabase-keepalive.yml)
yang mengirim satu query ringan ke tabel `profiles` **dua kali sehari**, sehingga proyek
dianggap aktif.

> Kenapa dua kali sehari, bukan dua kali seminggu? Dokumentasi Supabase menyebut ambangnya
> "beberapa request ke database **per hari**" selama seminggu terakhir. Dua kali seminggu
> berada di bawah ambang itu. Jadwalnya bisa diubah di bagian `cron:` kalau kamu mau.

### 9.1 Isi dua repository secret

1. Buka repo di GitHub → **Settings → Secrets and variables → Actions**.
2. Klik **New repository secret**, buat dua secret:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | Project URL (`https://xxxx.supabase.co`) |
   | `SUPABASE_ANON_KEY` | Publishable key / anon key dari tahap 3 |

   Secret dipakai agar nilainya tidak ditulis langsung di file workflow.

### 9.2 Jalankan sekali untuk memastikan berhasil

1. Buka tab **Actions** → pilih **Supabase keep-alive** di kiri.
2. Klik **Run workflow** → **Run workflow** (dari branch `main`).
3. Tunggu ±30 detik, buka run-nya, dan lihat langkah **Baca satu baris dari tabel profiles**.

**Cek:** langkah itu hijau dengan tulisan `Sukses: database Supabase menerima query.`
Kalau merah, buka pesannya — biasanya secret belum diisi atau URL salah.

### 9.3 Yang perlu diketahui

- **Query harus menyentuh tabel.** Request yang hanya memanggil fungsi kosong tidak dihitung
  sebagai aktivitas database; karena itu workflow ini membaca tabel `profiles`.
- **Cron GitHub bisa terlambat** beberapa menit sampai ~1 jam saat jam sibuk. Tidak masalah
  untuk tujuan ini.
- **GitHub menonaktifkan workflow terjadwal** pada repo publik yang tidak punya commit selama
  60 hari. Kalau lama tidak menyentuh repo, buka tab Actions dan aktifkan kembali.
- **Kalau proyek sudah telanjur dijeda**, ping akan gagal (workflow merah) — itu alarmnya.
  Buka dashboard Supabase → pilih proyek → **Restore/Resume project**. Data tetap utuh.
- Ping terjadwal adalah cara yang didokumentasikan, bukan jaminan. Kalau proyek ini benar-benar
  dipakai banyak orang, opsi pasti adalah upgrade ke plan berbayar (proyek berbayar tidak
  pernah dijeda).

---

## 10. Keamanan & perawatan

- **Jangan matikan RLS.** Semua policy dibuat oleh `schema.sql`.
- **Jangan pakai secret key** (`sb_secret_...`) atau `service_role` di frontend. Hanya kunci
  publishable.
- **`.env` dan secret jangan masuk repo.** Env Vercel dan repository secret adalah tempatnya.
- **Backup sesekali:** Pengaturan → **Unduh backup (.json)**.
- **Ganti kunci kalau bocor:** Supabase → Settings → API Keys → buat publishable key baru →
  perbarui di Vercel dan di repository secret → redeploy.
- **Free plan** dibatasi 2 proyek aktif; proyek yang dijeda tidak dihitung.

---

## 11. Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| Halaman login tidak muncul, langsung dashboard lama | Env belum terbaca. Di Vercel: pastikan dua env var ada untuk environment yang dibuka, lalu **Redeploy**. |
| "Email atau kata sandi salah" padahal benar | Akun belum dibuat (klik **Daftar**) atau salah ketik. Cek *Authentication → Users* di Supabase. |
| "Email belum dikonfirmasi" | Buka tautan di email, atau matikan *Confirm email* di Supabase lalu masuk lagi. |
| "Data gagal dimuat" setelah login | `supabase/schema.sql` belum dijalankan. Jalankan di SQL Editor, lalu klik **Coba lagi**. |
| Footer terus "Gagal menyimpan ke Supabase" | Koneksi putus atau kunci salah. Data tetap aman di perangkat dan dicoba lagi saat online. |
| Build Vercel gagal | Buka log deploy: error TypeScript ditampilkan lengkap. Perbaiki di github.dev, commit, Vercel build ulang otomatis. |
| Build gagal: versi Node | Vercel → Settings → General → **Node.js Version** → 20.x/22.x → redeploy. |
| Refresh halaman jadi 404 | Aplikasi memakai alamat ber-hash (`/#jurnal`). Buka alamat utama, bukan `/jurnal`. |
| Workflow keep-alive merah | Secret belum diisi / URL salah, atau proyek Supabase sedang dijeda. Lihat langkah 9.3. |
| Workflow tidak muncul di tab Actions | File workflow belum ada di branch `main`, atau repo belum punya commit setelah file ditambahkan. |
| Proyek Supabase "Paused" | Restore dari dashboard, lalu jalankan workflow sekali secara manual. |

---

## 12. Ringkasan

Sekali jalan:

**Supabase** (proyek → SQL Editor → `schema.sql` → API keys → Auth email) → **GitHub**
(upload kode) → **Vercel** (dua env var → Deploy) → **uji** → **Actions** (dua secret →
Run workflow).

Setelah itu alur kerja harianmu cukup:

1. Edit file lewat github.dev (tekan `.` di repo) atau Codespaces.
2. Commit ke `main`.
3. Vercel membangun ulang dan menerbitkan versi baru ±1 menit kemudian.
4. Workflow keep-alive menjaga database tetap bangun tanpa kamu sentuh.

Detail teknis ada di [README.md](README.md) dan [CARA-DEPLOY-VERCEL.md](CARA-DEPLOY-VERCEL.md).
