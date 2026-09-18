# Tutorial: Ganti Akun Gmail Apps Script (SIAP ALSINTAN)

Panduan ini untuk pemilik/admin SIAP ALSINTAN yang ingin memindahkan "mesin" web app
(Apps Script) dari satu akun Google ke akun Google lain — misalnya pindah dari akun
pribadi ke akun kantor, atau serah terima ke pegawai baru.

> **Intinya:** ganti akun = deploy ulang dari akun baru + ganti URL di `.env.local`.
> Data tidak berpindah dan tidak hilang — hanya "mesin eksekusinya" yang berganti.

---

## 1. Kapan tutorial ini dipakai

- Pindah dari akun pribadi ke akun kantor/organisasi
- Serah terima pengelolaan sistem ke pegawai baru
- Akun lama akan tidak dipakai lagi

**Yang TIDAK perlu diubah saat ganti akun:**

| Komponen | Kenapa tidak berubah |
|---|---|
| Semua data di spreadsheet | Ikut file spreadsheet, bukan akun |
| Sheet USERS (login karyawan) | Sama — cukup di-share |
| OAuth Client ID (login Google) | Terikat ke domain website, bukan akun Apps Script |
| Kode frontend (`src/`) | Tidak menyentuh akun Google |
| Service account (`alsintan@prime-odyssey...`) | Tetap valid selama masih diberi akses ke folder Drive |

---

## 2. Persiapan (5 menit)

1. Pastikan kamu bisa login ke **akun Google baru**.
2. Buka **spreadsheet baseline** "SIAP ALSINTAN - Baseline LBS Padi Sawah Purworejo 2025"
   dengan akun LAMA → tombol **Bagikan (Share)** → tambahkan email akun BARU
   sebagai **Editor**.
3. (Opsional tapi disarankan) Bagikan juga folder **ALSINTAN** di Drive ke akun baru
   sebagai Editor — supaya akun baru bisa mengelola 6 spreadsheet sumber lain.

---

## 3. Deploy dari Akun Baru (10 menit)

Lakukan semua langkah ini **sambil login dengan akun Google BARU**:

1. Buka spreadsheet baseline → menu **Ekstensi (Extensions) → Apps Script**.
   - Kalau terbuka project lama milik akun lama → tutup, lalu buka
     [script.google.com](https://script.google.com) dengan akun baru →
     **New project** saja. (Cara ini selalu berhasil dan tetap terikat ke spreadsheet
     lewat ID di dalam kode — tidak harus "bound".)
2. Hapus semua isi `Code.gs` default.
3. Copy seluruh isi file `apps-script/Code.gs` dari komputer (buka dengan Notepad/VS Code
   → Ctrl+A → Ctrl+C) → paste di editor → **Ctrl+S**.
4. Cek cepat: Ctrl+F cari kata **`authCheck`** — harus ketemu (tanda kode terbaru).
5. **Deploy → New deployment → (ikon gear) Web app**:
   - Description: `SIAP ALSINTAN API`
   - Execute as: **Me** (akun baru)
   - Who has access: **Anyone** ← harus persis ini
6. Klik **Deploy** → **Authorize access** → pilih akun baru →
   **Advanced → Go to SIAP ALSINTAN API (unsafe) → Allow**.
   (Popup izin akan meminta akses Spreadsheet + Drive — ini wajar, dipakai untuk
   baca data dan simpan foto survey.)
7. Copy **Web app URL** yang berakhiran `/exec`.

---

## 4. Update Konfigurasi (5 menit)

### Di komputer lokal

Edit file `.env.local`, ganti baris:

```env
VITE_GAS_API_URL=https://script.google.com/macros/s/URL_BARU/exec
```

Lalu restart `npm run dev`.

### Di server (aaPanel)

1. Edit `.env.local` di folder proyek → ganti `VITE_GAS_API_URL` dengan URL baru.
2. Jalankan:
   ```bash
   cd /www/wwwroot/ALSINTAN        # sesuaikan path
   npm run build
   ```
3. Selesai — web online otomatis memakai akun baru.

---

## 5. Verifikasi (5 menit)

Tes berikut pakai browser biasa (atau incognito):

| Tes | Cara | Hasil yang benar |
|---|---|---|
| Ping | `URL_BARU?action=ping` | `{"success":true,...}` |
| Data wilayah | Buka halaman **Dashboard** di web | Angka 16 kecamatan, 3.242 gapoktan muncul |
| Login Google | Halaman **Login** → tombol Google | Bisa masuk dengan email yang terdaftar di sheet USERS |
| Tulis data | Tambah 1 prospek di web → cek sheet `DATA_PROSPEK` | Baris baru muncul |
| Foto survey (opsional) | Isi survey dengan foto → cek Drive akun BARU | Folder "SIAP ALSINTAN - Foto Survey" berisi foto |

> Kalau verifikasi gagal dengan tulisan `Unknown action: ...` → kode belum ter-deploy
> dengan benar; ulangi langkah 3 bagian 4–7 (jangan lupa pilih **New version** saat
> mengedit deployment yang sudah ada).

---

## 6. Serah Terima Total (Opsional)

Kalau akun lama benar-benar mau ditinggalkan:

1. **Spreadsheet:** akun lama → Share → klik dropdown role akun baru →
   **Transfer ownership** (transfer kepemilikan).
2. **Folder ALSINTAN** di Drive: sama, transfer ownership foldernya
   (isi di dalamnya ikut pindah).
3. **Folder foto survey:** sama, transfer ownership folder
   "SIAP ALSINTAN - Foto Survey" ke akun baru.
4. **Service account:** tidak perlu diubah — cukup pastikan akun/folder baru tetap
   di-share ke `alsintan@prime-odyssey-508315-r6.iam.gserviceaccount.com` (Editor),
   karena script sinkronisasi Excel (`npm run sync:*`) masih memakainya.
5. Hapus deployment di akun lama: buka editor Apps Script akun lama →
   Deploy → Manage deployments → pilih deployment → **Archive** (jangan dihapus dulu
   selama URL baru belum terbukti jalan).

---

## 7. Masalah Umum

| Gejala | Penyebab | Solusi |
|---|---|---|
| `Unknown action: ...` | Kode belum ter-deploy / versi tidak di-bump | Deploy ulang, pastikan pilih **New version** |
| Halaman "Akses Ditolak" / minta login | "Who has access" bukan **Anyone** | Manage deployments → pensil → ubah jadi **Anyone** → Deploy |
| Semua request balik 404 sesaat | Google kadang mengunci sementara | Tunggu 1–2 menit, ulangi |
| Login Google gagal "email tidak terdaftar" | Email karyawan belum ada di sheet USERS | Tambah baris di sheet USERS (email, nama, role, ID_AO, AKTIF) |
| Popup Google: "origin_mismatch" / error redirect | Origin website belum terdaftar | OAuth Client ID → Authorized JavaScript origins harus memuat domain website persis (tanpa `/login`) |
| Foto survey tidak muncul | Izin Drive belum diberikan saat authorize | Ulangi authorize, centang semua izin yang diminta |

---

*Terakhir diperbarui: September 2026 — SIAP ALSINTAN Fase 1*
