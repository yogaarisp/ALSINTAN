# ALUR DATA — SIAP ALSINTAN

Rekap detail: **setiap halaman website ambil data dari file spreadsheet mana,
sheet/tab mana, kolom mana** — lalu **menyimpan ke sheet mana**.

> Tidak ada halaman yang membaca atau menulis Excel/Google Sheets secara
> langsung. Semua lewat **Google Apps Script Web App** (`apps-script/Code.gs`).

---

## Daftar Isi

1. [Ringkasan 10 halaman](#ringkasan-10-halaman)
2. [File Spreadsheet yang Dipakai](#file-spreadsheet-yang-dipakai)
3. [Struktur Semua Sheet](#struktur-semua-sheet)
4. [Detail Per Halaman](#detail-per-halaman)
5. [Cache Browser](#cache-browser)
6. [Temuan yang Perlu Diketahui](#temuan-yang-perlu-diketahui)

---

## Ringkasan 10 Halaman

| # | Halaman | File Spreadsheet | Sheet | Tulis? |
|---|---|---|---|---|
| 1 | `/login` | SIAP ALSINTAN - Baseline (MASTER) | `USERS` | ❌ |
| 2 | `/dashboard` | SIAP ALSINTAN - Baseline (MASTER) | `MASTER_WILAYAH`, `DATA_PROSPEK` | ❌ |
| 3 | `/peta` | SIAP ALSINTAN - Baseline (MASTER) | `MASTER_WILAYAH`, `DATA_PROSPEK` | ❌ |
| 4 | `/prioritas` | SIAP ALSINTAN - Baseline (MASTER) | `MASTER_WILAYAH`, `DATA_PROSPEK` | ❌ |
| 5 | `/prospek` | SIAP ALSINTAN - Baseline (MASTER) | `DATA_PROSPEK`, `MASTER_WILAYAH`, `MASTER_ANALIS` | ✅ `DATA_PROSPEK` |
| 6 | `/analis` | SIAP ALSINTAN - Baseline (MASTER) | `MASTER_ANALIS`, `MASTER_WILAYAH`, `DATA_PROSPEK` | ✅ `MASTER_ANALIS` |
| 7 | `/survey` | SIAP ALSINTAN - Baseline (MASTER) **+** Poktan 2026 | `MASTER_WILAYAH`, `DATA_PROSPEK`, `DATA_SURVEY`, `MASTER_ANALIS` **+** 16 tab poktan | ✅ `DATA_SURVEY` + `DATA_PROSPEK` |
| 8 | `/monitoring` | SIAP ALSINTAN - Baseline (MASTER) | `MASTER_WILAYAH`, `DATA_PROSPEK`, `MASTER_ANALIS` | ❌ |
| 9 | `/sumber-data` | 6 file sumber | tab yang dipilih user | ❌ |
| 10 | `/pengaturan` | — (tidak ada) | — | ❌ |

**Total: aplikasi hanya menulis ke 3 sheet** — `DATA_SURVEY`, `DATA_PROSPEK`,
`MASTER_ANALIS` — semuanya di **satu file**: *SIAP ALSINTAN - Baseline (MASTER)*.

---

## File Spreadsheet yang Dipakai

### File A — satu-satunya yang bisa ditulis

| | |
|---|---|
| **Nama file** | `SIAP ALSINTAN - Baseline (MASTER).xlsx` |
| **Spreadsheet ID** | `1EZ3XYXRaCkJmHhLbhVkrzKqcFrtcN7DX3k7BNZc20F4` |
| **Link** | https://docs.google.com/spreadsheets/d/1EZ3XYXRaCkJmHhLbhVkrzKqcFrtcN7DX3k7BNZc20F4/edit |
| **Hak akses aplikasi** | Read + Write |
| **Backup lokal** | `excel/backup-2026-09-27/SIAP ALSINTAN - Baseline (MASTER).xlsx` |

### File B–G — sumber, read-only

| Key | Nama file | ID | Link |
|---|---|---|---|
| `poktan` | `Poktan 2026.xlsx` | `1xd4G2iCUBvyqUwuTni3anBOJhoQwmb-TNW1qOE4YBzg` | https://docs.google.com/spreadsheets/d/1xd4G2iCUBvyqUwuTni3anBOJhoQwmb-TNW1qOE4YBzg/edit |
| `padi_sawah` | `Produksi Padi Sawah 2025.xlsx` | `1NEEZarMvHL11z2rXx0dS31KuiI0tAMJCIH_b11eYFQo` | https://docs.google.com/spreadsheets/d/1NEEZarMvHL11z2rXx0dS31KuiI0tAMJCIH_b11eYFQo/edit |
| `padi_ladang` | `Produksi Padi Ladang 2025.xlsx` | `1G3x0B9Oxi4rfMoWTBJ3Ie-rIL2-dCrPV9vlh0BahvqQ` | https://docs.google.com/spreadsheets/d/1G3x0B9Oxi4rfMoWTBJ3Ie-rIL2-dCrPV9vlh0BahvqQ/edit |
| `beras` | `Produksi Beras 2025.xlsx` | `1s41NFQjZBdlQWW_6d-NBNMnEkYLufyf-Z-bCgaxOiC4` | https://docs.google.com/spreadsheets/d/1s41NFQjZBdlQWW_6d-NBNMnEkYLufyf-Z-bCgaxOiC4/edit |
| `rekap_alsintan` | `Rekap Alsintan seKabupaten Purworejo sampai dengan April2026.xlsx` | `1z5zDzvksX5xT6C_OvM_Kv_cFYPuGdOPvAKxsxp7LBoY` | https://docs.google.com/spreadsheets/d/1z5zDzvksX5xT6C_OvM_Kv_cFYPuGdOPvAKxsxp7LBoY/edit |
| `rekap_bulanan` | `Rekap Bulanan SP TP.xlsx` | `1DzlqupA0M-6Ehs6QSwTo_o7oU_g7uVYROCSr8aiuzt8` | https://docs.google.com/spreadsheets/d/1DzlqupA0M-6Ehs6QSwTo_o7oU_g7uVYROCSr8aiuzt8/edit |

Semua file ini juga ada salinan lokalnya di `excel/` dan `excel/import/`.

> Sumber read-only didefinisikan di `Code.gs` → `var SOURCES`. Menambah file
> sumber cukup di situ, tidak perlu ubah frontend.

---

## Struktur Semua Sheet

### 📄 File A — SIAP ALSINTAN - Baseline (MASTER)

#### `USERS` — 4 baris
```
EMAIL | NAMA | ROLE | ID_ANALIS | STATUS
```
> Kolom `ID_ANALIS` dulunya bernama `ID_AO`. Backend otomatis membaca keduanya.

#### `MASTER_WILAYAH` — 16 baris (1 per kecamatan)
```
ID_KECAMATAN | KECAMATAN | KABUPATEN | LUAS_LAHAN_HA | DATA_PANEN_TON |
JUMLAH_GAPOKTAN | KOMODITAS | LATITUDE | LONGITUDE | CATATAN
```

#### `DATA_PROSPEK` — 11 kolom ⭐ (ditulis aplikasi)
```
ID_PROSPEK | ID_KECAMATAN | KECAMATAN | NAMA_GAPOKTAN | KOMODITAS |
ID_ANALIS | NAMA_ANALIS | STATUS | TANGGAL | ESTIMASI_ALSINTAN | CATATAN
```

#### `DATA_SURVEY` — 17 kolom ⭐ (ditulis aplikasi)
```
A  ID_SURVEY        B  ID_PROSPEK        C  NAMA_GAPOKTAN
D  JUMLAH_ANGGOTA   E  LUAS_SAWAH_AKTUAL  F  JENIS_ALSINTAN
G  ESTIMASI_HARGA   H  LATITUDE           I  LONGITUDE
J  ACCURACY_M       K  CATATAN            L  ID_ANALIS
M  NAMA_ANALIS      N  TIMESTAMP          O  STATUS
P  FOTO_URL         Q  NAMA_KETUA
```
> `Q NAMA_KETUA` ditambahkan 2026-09-29 sebagai kolom **terakhir** supaya A–P
> tidak bergeser. `C NAMA_GAPOKTAN` isinya **nama poktan**, bukan gapoktan.

#### `MASTER_ANALIS` — 2 baris ⭐ (ditulis aplikasi)
```
ID_ANALIS | NAMA_ANALIS | WILAYAH | STATUS | EMAIL
```
> Tab ini dulu bernama `MASTER_AO` dengan kolom `ID_AO`/`NAMA_AO`. Sudah
> dimigrasi, tapi backend masih menerima nama lama.

#### Sheet yang ada tapi tidak dipakai halaman mana pun
| Sheet | Isi | Baris | Kenapa belum dipakai |
|---|---|---|---|
| `MASTER_DESA` | daftar desa + baku sawah per desa | 495 | berisi data yang relevan untuk form `/survey` |
| `REKAP_KECAMATAN` | rekap luas baku per kecamatan | 17 | datanya sudah ada di `MASTER_WILAYAH` |
| `IMPORT_BAKU_SAWAH_DESA` | bahan baku sawah per desa | — | import mentah, sudah diolah ke `MASTER_DESA` |

---

### 📄 File B — Poktan 2026 — 16 tab, 3.242 baris

Satu tab per kecamatan, nama **Title Case**:

| # | Tab | # | Tab |
|---|---|---|---|
| 1 | `Bagelen` | 9 | `Kaligesing` |
| 2 | `Banyuurip` | 10 | `Kemiri` |
| 3 | `Bayan` | 11 | `Kutoarjo` |
| 4 | `Bener` | 12 | `Loano` |
| 5 | `Bruno` | 13 | `Ngombol` |
| 6 | `Butuh` | 14 | `Pituruh` |
| 7 | `Gebang` | 15 | `Purwodadi` |
| 8 | `Grabag` | 16 | `Purworejo` |

Struktur tiap tab — posisi baris header **berbeda-beda** (`Pituruh` header di
baris 3, sebagian besar di baris 1), jumlah baris data juga beda tiap kecamatan:

```
No | Nama Poktan | ID Poktan | Jumlah Anggota | Nama Desa | Nama Ketua | Alamat Sekretariat
```

> `MASTER_WILAYAH` menyimpan nama kecamatan **HURUF KAPITAL** (`PITURUH`),
> sedangkan nama tab Title Case (`Pituruh`). Pencocokan dilakukan
> case-insensitive di backend dan di frontend.

---

### 📄 File C–G — Sumber Produksi & Alsintan

Dipakai hanya oleh `/sumber-data`, tidak ada kolom baku yang dipatok — nilainya
sesuai format asli masing-masing instansi. Yang penting: **read-only**.

---

## Detail Per Halaman

### 1. `/login`

**Fungsi**: autentikasi pengguna sebelum masuk aplikasi.

#### Jalur A — Google Sign-In (sudah terhubung ke spreadsheet)

📄 **File**: SIAP ALSINTAN - Baseline (MASTER)
📋 **Sheet**: `USERS`

| Kolom sheet | Dipakai untuk |
|---|---|
| `EMAIL` | pencocokan email dari Google |
| `NAMA` | nama yang ditampilkan di app |
| `ROLE` | `ADMIN` / `ANALIS` / `MANAJEMEN` |
| `ID_ANALIS` | diturunkan ke sesi, dipakai saat create prospek & survey |
| `STATUS` | harus `AKTIF`, selain itu ditolak |

- **Action**: `authCheck` (POST)
- **Tidak ada yang ditulis** ke spreadsheet
- Sesi disimpan di `localStorage` (bukan spreadsheet)

Contoh respons nyata (dicek 2026-09-30):

```json
{"email":"budi@siap-alsintan.id","nama":"Budi Santoso",
 "role":"ANALIS","idAnalis":"AN001"}
```

#### Jalur B — Email + Password (**belum** terhubung)

📄 **File**: **tidak ada** — masih daftar mock hardcoded di
`src/lib/auth/auth-context.tsx:27`:

| Email | Password | Role |
|---|---|---|
| `admin@siap-alsintan.id` | `admin123` | ADMIN |
| `budi@siap-alsintan.id` | `analis123` | ANALIS |
| `manager@siap-alsintan.id` | `mgr123` | MANAJEMEN |

---

### 2. `/dashboard`

**Fungsi**: ringkasan KPI program + 5 prospek terbaru + daftar kecamatan.

📄 **File**: SIAP ALSINTAN - Baseline (MASTER)

| 📋 Sheet | Action | Kolom yang dibaca | Tampil di layar |
|---|---|---|---|
| `MASTER_WILAYAH` + `DATA_PROSPEK` | `getDashboardKPI` | semua kolom `MASTER_WILAYAH` (`LUAS_LAHAN_HA`, `JUMLAH_GAPOKTAN`), `STATUS` + `STATUS` di `DATA_PROSPEK` | 5 kartu KPI: Total Kecamatan, Total Gapoktan, Total Luas Lahan, Prospek Baru, Analis Aktif |
| `MASTER_WILAYAH` | `getWilayah` | `KECAMATAN`, `LUAS_LAHAN_HA`, `JUMLAH_GAPOKTAN` | Baris "Wilayah Prioritas" |
| `DATA_PROSPEK` | `getProspek` (limit **5**) | `ID_PROSPEK`, `NAMA_GAPOKTAN`, `KECAMATAN`, `KOMODITAS`, `NAMA_ANALIS`, `TANGGAL`, `ESTIMASI_ALSINTAN`, `STATUS` | Tabel "Prospek Terbaru" |

**Simpan**: tidak ada.

---

### 3. `/peta`

**Fungsi**: peta interaktif titik kecamatan + prospek.

📄 **File**: SIAP ALSINTAN - Baseline (MASTER)

| 📋 Sheet | Action | Kolom yang dibaca | Tampil di layar |
|---|---|---|---|
| `MASTER_WILAYAH` | `getWilayah` | `LATITUDE`, `LONGITUDE` | Posisi marker di peta (satu marker per kecamatan) |
| `MASTER_WILAYAH` | `getWilayah` | `KECAMATAN`, `KABUPATEN` | Tooltip marker |
| `MASTER_WILAYAH` | `getWilayah` | `LUAS_LAHAN_HA`, `DATA_PANEN_TON`, `JUMLAH_GAPOKTAN` | Panel detail saat kecamatan diklik |
| `DATA_PROSPEK` | `getProspek` (limit 100) | `ID_KECAMATAN`, `ID_PROSPEK`, `NAMA_GAPOKTAN` | Menandai kecamatan yang sudah punya prospek |

**Simpan**: tidak ada.

> Contoh: `MASTER_WILAYAH` baris 1 (`GRABAG`) punya `LATITUDE = -7.673`,
> `LONGITUDE = 109.953`. Kecamatan tanpa koordinat tidak muncul sebagai marker.
 
---

### 4. `/prioritas`

**Fungsi**: ranking 16 kecamatan berdasarkan skor prioritas (bukan data mentah —
hasil hitungan di browser).

📄 **File**: SIAP ALSINTAN - Baseline (MASTER)

| 📋 Sheet | Action | Kolom yang dibaca | Dipakai untuk |
|---|---|---|---|
| `MASTER_WILAYAH` | `getWilayah` | `LUAS_LAHAN_HA` | komponen skor "Luas Lahan" |
| `MASTER_WILAYAH` | `getWilayah` | `JUMLAH_GAPOKTAN` | komponen skor "Gapoktan" |
| `MASTER_WILAYAH` | `getWilayah` | `DATA_PANEN_TON` | komponen skor "Produksi" |
| `DATA_PROSPEK` | `getProspek` (limit 100) | `ID_KECAMATAN` | komponen skor "Pipeline Prospek" |

Bobotnya di `src/lib/config/priority-config.ts`, fungsi skornya di
`src/lib/services/priority-engine.ts`. Skor 0–100, level TINGGI/SEDANG/RENDAH.

**Simpan**: tidak ada. Skor **tidak pernah** ditulis ke spreadsheet — dihitung
ulang tiap kali halaman dibuka. Kalau bobot diubah, semua skor berubah retroactive.

---

### 5. `/prospek` — satu-satunya halaman dengan CRUD penuh

**Fungsi**: daftar pipeline prospek alsintan.

📄 **File**: SIAP ALSINTAN - Baseline (MASTER)

#### Data yang dibaca

| 📋 Sheet | Action | Kolom yang dibaca | Tampil di layar |
|---|---|---|---|
| `DATA_PROSPEK` | `getProspek` (limit 100) | `ID_PROSPEK`, `KECAMATAN`, `NAMA_GAPOKTAN`, `KOMODITAS`, `NAMA_ANALIS`, `ESTIMASI_ALSINTAN`, `TANGGAL`, `STATUS` | Tabel utama |
| `MASTER_WILAYAH` | `getWilayah` | `ID_KECAMATAN`, `KECAMATAN`, `LUAS_LAHAN_HA` | Filter kecamatan + form tambah |
| `MASTER_ANALIS` | `getAnalis` | `ID_ANALIS`, `NAMA_ANALIS`, `STATUS` | Dropdown Analis di modal Ubah |

#### Data yang ditulis → 📄 File A, 📋 Sheet `DATA_PROSPEK`

| Tombol | Action | Kolom yang ditulis |
|---|---|---|
| **Tambah Prospek Baru** | `createProspek` | `ID_PROSPEK` (`P003`, `P004`, …), `ID_KECAMATAN`, `KECAMATAN`, `NAMA_GAPOKTAN`, `KOMODITAS`, `ID_ANALIS`, `NAMA_ANALIS`, `STATUS` (`BARU`), `TANGGAL` (hari ini), `ESTIMASI_ALSINTAN`, `CATATAN` |
| **Ubah** | `updateProspek` | `NAMA_GAPOKTAN`, `KOMODITAS`, `STATUS`, `ID_ANALIS` + `NAMA_ANALIS`, `ESTIMASI_ALSINTAN`, `CATATAN` |
| **Nonaktifkan** | `deleteProspek` | `STATUS` → `TIDAK_POTENSIAL`, `CATATAN` += penanda. **Baris tidak dihapus** |
| **Aktifkan Kembali** | `restoreProspek` | `STATUS` kembali + penanda dibuang dari `CATATAN` |

Kolom yang **dikunci** (tidak bisa diubah lewat mana pun):
`ID_PROSPEK`, `ID_KECAMATAN`, `KECAMATAN`, `TANGGAL`.

> `ID_PROSPEK` punya dua asal:
> - Nomor urut manual → `P001`, `P002`, `P003`, …
> - **ID Poktan numerik** → `5107401`, dibuat otomatis oleh `/survey`
>
> Keduanya unik. Karena itu `nextId()` di backend memfilter per prefix `P`
> supaya ID Poktan numerik tidak menggeser nomor urut.

---

### 6. `/analis`

**Fungsi**: kelola analis + lihat beban kerja masing-masing.

📄 **File**: SIAP ALSINTAN - Baseline (MASTER)

#### Data yang dibaca

| 📋 Sheet | Action | Kolom yang dibaca | Tampil di layar |
|---|---|---|---|
| `MASTER_ANALIS` | `getAnalis` | `ID_ANALIS`, `NAMA_ANALIS`, `STATUS`, `WILAYAH`, `EMAIL` | Tabel analis |
| `MASTER_WILAYAH` | `getWilayah` | `ID_KECAMATAN`, `KECAMATAN`, `KABUPATEN` | Filter wilayah + form tambah analis |
| `DATA_PROSPEK` | `getProspek` (limit 100) | `ID_ANALIS`, `NAMA_ANALIS`, `ID_PROSPEK`, `NAMA_GAPOKTAN`, `KECAMATAN`, `KOMODITAS`, `ESTIMASI_ALSINTAN`, `STATUS`, `TANGGAL` | Daftar prospek tiap analis |

#### Data yang ditulis → 📄 File A, 📋 Sheet `MASTER_ANALIS`

| Tombol | Action | Kolom yang ditulis |
|---|---|---|
| **Tambah Analis** | `createAnalis` | baris baru: `ID_ANALIS`, `NAMA_ANALIS`, `WILAYAH`, `STATUS`, `EMAIL` |
| **Ubah Status** | `updateAnalisStatus` | `STATUS` (`AKTIF` / `TIDAK_AKTIF`) |

---

### 7. `/survey` — paling banyak menulis

**Fungsi**: form survey lapangan. Pilih kecamatan → pilih poktan → isi data →
kirim.

#### Data yang dibaca

| 📄 File | 📋 Sheet | Action | Kolom yang dibaca |
|---|---|---|---|
| SIAP ALSINTAN - Baseline (MASTER) | `MASTER_WILAYAH` | `getWilayah` | `KECAMATAN` (dropdown pertama, 16 isi) |
| **Poktan 2026** | tab kecamatan terpilih (16 pilihan) | `getPoktan` | `Nama Poktan`, `ID Poktan`, `Jumlah Anggota`, `Nama Desa`, `Nama Ketua`, `Alamat Sekretariat` |
| SIAP ALSINTAN - Baseline (MASTER) | `DATA_PROSPEK` | `getProspek?prospekId=…` | `ID_PROSPEK`, `NAMA_GAPOKTAN`, `KECAMATAN` (untuk deep-link dari `/prospek`) |
| SIAP ALSINTAN - Baseline (MASTER) | `DATA_SURVEY` | `getSurvey` | semua 17 kolom (tabel riwayat) |

> Kalau `getPoktan` belum ada di deployment GAS, frontend otomatis jatuh ke
> `getSourceData` (`key=poktan`, `tab=<KECAMATAN>`, `limit=2000`), hasilnya
> dibersihkan di browser lalu di-cache dengan bentuk yang sama. Jadi halaman
> tetap berfungsi sebelum `Code.gs` terbaru di-deploy.

#### Data yang ditulis → 2 sheet sekaligus

**📄 File A, 📋 Sheet `DATA_SURVEY`** — satu baris baru:

| Kolom | Asal nilai |
|---|---|
| `ID_SURVEY` | `S001`, `S002`, … (otomatis) |
| `ID_PROSPEK` | **ID Poktan** dari master (mis. `5107401`) |
| `NAMA_GAPOKTAN` | nama poktan yang dipilih |
| `NAMA_KETUA` | auto-fill dari master, bisa diedit manual |
| `JUMLAH_ANGGOTA` | auto-fill dari master; **dikosongkan** kalau master = 0 |
| `LATITUDE`, `LONGITUDE`, `ACCURACY_M` | GPS perangkat |
| `LUAS_SAWAH_AKTUAL`, `JENIS_ALSINTAN`, `ESTIMASI_HARGA`, `CATATAN` | diisi manual |
| `ID_ANALIS`, `NAMA_ANALIS` | dari sesi login |
| `TIMESTAMP`, `STATUS`, `FOTO_URL` | otomatis |

**📄 File A, 📋 Sheet `DATA_PROSPEK`** — otomatis, tanpa tombol:

Kalau ID Poktan yang disurvei belum punya baris di `DATA_PROSPEK`, backend
membuatnya:

| Kolom | Nilai |
|---|---|
| `ID_PROSPEK` | ID Poktan itu juga (`5107401`) |
| `ID_KECAMATAN`, `KECAMATAN` | dari master wilayah |
| `NAMA_GAPOKTAN` | nama poktan |
| `KOMODITAS` | `Padi` |
| `ID_ANALIS`, `NAMA_ANALIS` | dari sesi login |
| `STATUS` | `BARU` |
| `TANGGAL` | hari ini |
| `CATATAN` | `Master Poktan 2026 · ID Poktan 5107401 · Desa …` |

Idempoten: kalau poktan yang sama disurvei dua kali, tidak dibuat baris ganda.

**Efek lanjutan**: karena `/dashboard`, `/peta`, `/prioritas`, `/monitoring`,
`/prospek`, `/analis` semua baca `DATA_PROSPEK`, satu submit di `/survey`
langsung mengubah tampilan di 6 halaman lain.

---

### 8. `/monitoring`

**Fungsi**: pantau progres pipeline per tahap & beban kerja per analis.

📄 **File**: SIAP ALSINTAN - Baseline (MASTER)

| 📋 Sheet | Action | Kolom yang dibaca | Tampil di layar |
|---|---|---|---|
| `DATA_PROSPEK` | `getProspek` (limit 100) | `STATUS` | Kartu Closing/Disburse/Cair + donut pipeline (Baru→Survey→Potensial→Closing→Disburse→Cair) |
| `DATA_PROSPEK` | `getProspek` (limit 100) | `ID_ANALIS`, `NAMA_ANALIS` | Baris prospek per analis |
| `MASTER_WILAYAH` | `getWilayah` | `KECAMATAN`, `LUAS_LAHAN_HA`, `JUMLAH_GAPOKTAN` | Grafik-target per kecamatan |
| `MASTER_ANALIS` | `getAnalis` | `ID_ANALIS`, `NAMA_ANALIS`, `STATUS` | Tabel beban kerja analis |

**Simpan**: tidak ada.

> Transitif lewat `statusCounts`: `SURVEY` + `DALAM_PROSPEK` dihitung sebagai
> satu tahap "Survey". Jadi angka monitoring tidak sama persis dengan
> filter status di `/prospek`.

---

### 9. `/sumber-data`

**Fungsi**: jelajah 6 file sumber produksi & alsintan.

📄 **File** (pilihannya dibuat dari daftar di `Code.gs` → `SOURCES`):

| Label di layar | File | ID |
|---|---|---|
| Gapoktan | `Poktan 2026.xlsx` | `1xd4G2iCUBvyqUwuTni3anBOJhoQwmb-TNW1qOE4YBzg` |
| Produksi | `Produksi Padi Sawah 2025.xlsx` | `1NEEZarMvHL11z2rXx0dS31KuiI0tAMJCIH_b11eYFQo` |
| Produksi | `Produksi Padi Ladang 2025.xlsx` | `1G3x0B9Oxi4rfMoWTBJ3Ie-rIL2-dCrPV9vlh0BahvqQ` |
| Produksi | `Produksi Beras 2025.xlsx` | `1s41NFQjZBdlQWW_6d-NBNMnEkYLufyf-Z-bCgaxOiC4` |
| Alsintan | `Rekap Alsintan … April 2026.xlsx` | `1z5zDzvksX5xT6C_OvM_Kv_cFYPuGdOPvAKxsxp7LBoY` |
| SP TP | `Rekap Bulanan SP TP.xlsx` | `1DzlqupA0M-6Ehs6QSwTo_o7oU_g7uVYROCSr8aiuzt8` |
| Database | `SIAP ALSINTAN - Baseline (MASTER).xlsx` | `1EZ3XYXRaCkJmHhLbhVkrzKqcFrtcN7DX3k7BNZc20F4` |

📋 **Sheet**: semua tab di file yang dipilih (dropdown, isi diambil live)

| Action | Parameter |
|---|---|
| `getSources` | — (daftar metadata file) |
| `getSourceData` | `key`, `tab`, `q` (pencarian), `page`, `limit` (maks 2.000) |

**Simpan**: **tidak ada sama sekali.** Halaman ini read-only, tidak ada tombol
tambah/ubah/hapus. File sumber tidak bisa diubah dari aplikasi.

---

### 10. `/pengaturan`

**Fungsi**: setelan lokal (URL GAS override, cache, dll).

| | |
|---|---|
| **Baca** | tidak ada. Hanya `POST action=ping` untuk cek koneksi |
| **Simpan ke spreadsheet** | **tidak ada** |
| **Simpan di browser** | `localStorage` (URL GAS override, dll) |

---

## Cache Browser (localStorage)

Prefix `siap_v2_`. **Tidak ada TTL** — cache tidak kedaluwarsa sendiri.

| Key | Diisi oleh halaman | Isi |
|---|---|---|
| `siap_v2_wilayah_all` | semua halaman | 16 kecamatan |
| `siap_v2_dashboard_kpi` | `/dashboard` | angka KPI |
| `siap_v2_prospek_all` | `/prospek`, `/peta`, `/prioritas`, `/monitoring`, `/analis` | daftar prospek (limit 100) |
| `siap_v2_prospek_dashboard` | `/dashboard` | 5 prospek terbaru |
| `siap_v2_analis_all` | `/analis`, `/monitoring`, `/prospek` | daftar analis |
| `siap_v2_poktan_<kecamatan>` | `/survey` | poktan per kecamatan |
| `siap_v2_sources_list` | `/sumber-data` | daftar file sumber |
| `siap_v2_source_data_<key>_<tab>_<q>_<page>` | `/sumber-data` | isi tab |

---

## Temuan yang Perlu Diketahui

### ⚠️ `AN001` berstatus `TIDAK_AKTIF`
Dicek langsung ke GAS pada 2026-09-30:

```
AN001 | Budi Santoso        | TIDAK_AKTIF | totalProspek=2
AN002 | YANUAR ADI WIBISONO | AKTIF       | totalProspek=0
```

- `updateProspek` **menolak** menugaskan `AN001` (analis harus AKTIF)
- `createProspek` **tidak menolak** — masih jatuh ke default `AN001` kalau
  pemanggil tidak mengirim `idAnalis`
- 2 prospek di `DATA_PROSPEK` milik analis nonaktif

### ⚠️ Mock data masih muncul di 4 halaman
Kalau GAS lambat/gagal, halaman ini bisa sesaat menampilkan data palsu:

| Halaman | Yang dipalsukan |
|---|---|
| `/dashboard` | `MOCK_DASHBOARD_KPI`, `MOCK_WILAYAH`, `MOCK_PROSPEK` |
| `/peta` | `MOCK_WILAYAH`, `MOCK_PROSPEK` |
| `/prioritas` | `MOCK_WILAYAH`, `MOCK_PROSPEK` |
| `/monitoring` | `MOCK_WILAYAH`, `MOCK_PROSPEK`, `MOCK_ANALIS` |
| `/analis` | `MOCK_ANALIS`, `MOCK_WILAYAH`, `MOCK_PROSPEK` |

`MOCK_PROSPEK` memakai `P001`–`P005` yang **bentrok** dengan baris asli di
`DATA_PROSPEK` — tabel terlihat punya 5 baris padahal spreadsheet cuma punya 2.
`/prospek` sudah diperbaiki (mock hanya kalau GAS belum dikonfigurasi).

### ⚠️ `USE_MOCK` selalu `false`
`prospek.ts:13`, `analis.ts:13`, `wilayah.ts:13`, `dashboard.ts:13` menulis
`const USE_MOCK = !isGasConfigured` — tanpa `()`. Karena `!fungsi` = `false`,
cabang mock di 4 modul itu tidak pernah jalan.

### ⚠️ Login email/password tidak ke spreadsheet
Lihat §1 — masih mock hardcoded. Siapa pun yang bisa membaca source code bisa
login sebagai admin. Jalur Google Sign-In sudah benar (verifikasi `USERS` +
`STATUS`).

### ℹ️ `MASTER_DESA` (495 desa) belum dipakai
Data `baku_sawah_ha` per desa belum pernah masuk ke form `/survey`.

### ℹ️ Status `TIDAK_POTENSIAL` ambigu
Bisa berarti (a) dipilih manual di pipeline, atau (b) hasil `deleteProspek`.
Frontend membedakannya lewat penanda `Dinonaktifkan <tanggal>` di ujung
`CATATAN`. Kalau ada yang mengedit `CATATAN` langsung di Excel, penandanya
hilang dan tombol "Aktifkan Kembali" ikut hilang.

### ℹ️ Tombol Google 403 di produksi
`https://alsintan-six.vercel.app` belum masuk *Authorized JavaScript origins*
di OAuth client Google. Tidak berhubungan dengan alur data.

---

## Peta Singkat

```
  10 HALAMAN BROWSER
         │
         │  semua baca/tulis lewat HTTP
         ▼
  ┌─────────────────────────────────────┐
  │  GAS Web App — apps-script/Code.gs  │
  │  { success, data, error, timestamp} │
  └──────────┬──────────────────────┬───┘
             │                      │
   READ+WRITE│                      │READ ONLY
             ▼                      ▼
┌──────────────────────────┐  ┌───────────────────────────────┐
│ 📄 SIAP ALSINTAN -       │  │ 📄 Poktan 2026            ← /survey, /sumber-data
│    Baseline (MASTER)     │  │ 📄 Produksi Padi Sawah    ← /sumber-data
│                          │  │ 📄 Produksi Padi Ladang   ← /sumber-data
│ 📋 USERS          ← /login│  │ 📄 Produksi Beras         ← /sumber-data
│ 📋 MASTER_WILAYAH  ← 6 hal│  │ 📄 Rekap Alsintan         ← /sumber-data
│ 📋 DATA_PROSPEK    ← 6 hal│  │ 📄 Rekap Bulanan SP TP    ← /sumber-data
│      ↑ tulis /prospek     │  └───────────────────────────────┘
│      ↑ tulis /survey      │
│ 📋 DATA_SURVEY     ← /survey│
│      ↑ tulis /survey      │
│ 📋 MASTER_ANALIS   ← /analis│
│      ↑ tulis /analis      │
│                           │
│ 📋 MASTER_DESA           (tak dipakai)
│ 📋 REKAP_KECAMATAN       (tak dipakai)
│ 📋 IMPORT_BAKU_SAWAH_DESA(tak dipakai)
└───────────────────────────┘
```

---

*Dokumen dibuat 2026-09-30. Struktur sheet diverifikasi langsung ke GAS aktif
pada tanggal tersebut (getWilayah, getProspek, getAnalis, authCheck) dan ke
file lokal `excel/backup-2026-09-27/`. Backup spreadsheet: `excel/backup-2026-09-27/`.*
