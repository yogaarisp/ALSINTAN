# ALUR DATA — SIAP ALSINTAN

Rekap: setiap halaman website ambil data dari spreadsheet mana / sheet mana,
lalu menyimpan ke sheet mana.

> Semua halaman **tidak** bicara langsung ke spreadsheet. Semuanya lewat
> **Google Apps Script Web App** (middleware) di `apps-script/Code.gs`.
> Tidak ada satu pun halaman yang menulis ke Excel/Sheets secara langsung.

---

## 1. Daftar Spreadsheet

### 1.1 Spreadsheet utama (bisa ditulis)

| # | Nama | ID | Status |
|---|---|---|---|
| 1 | **SIAP ALSINTAN - Baseline (MASTER)** | `1EZ3XYXRaCkJmHhLbhVkrzKqcFrtcN7DX3k7BNZc20F4` | **Read + Write** — satu-satunya spreadsheet yang bisa diubah aplikasi |

Sheet di dalamnya:

| Sheet | Isi | Baris | Diubah aplikasi? |
|---|---|---|---|
| `MASTER_WILAYAH` | 16 kecamatan + luas lahan, panorama, koordinat | 16 | ❌ read-only |
| `MASTER_DESA` | 495 desa + baku sawah | 495 | ❌ **tidak dipakai halaman mana pun** |
| `REKAP_KECAMATAN` | rekap luas baku per kecamatan | 17 | ❌ **tidak dipakai halaman mana pun** |
| `IMPORT_BAKU_SAWAH_DESA` | bahan Baku Sawah per Desa | — | ❌ **tidak dipakai halaman mana pun** |
| `DATA_PROSPEK` | pipeline prospek alsintan | 2 | ✅ **tulis** |
| `DATA_SURVEY` | hasil survey lapangan | 0 | ✅ **tulis** |
| `MASTER_ANALIS` (dulu `MASTER_AO`) | daftar analis + status | 2 | ✅ **tulis** |
| `USERS` | akun yang boleh login | 4 | ❌ read-only |

### 1.2 Spreadsheet sumber (read-only)

Dibaca langsung oleh GAS dari spreadsheet lain di folder ALSINTAN. **Tidak
pernah ditulis** oleh aplikasi. Daftar ada di `Code.gs` → `var SOURCES`.

| Key | Nama | Kategori | ID |
|---|---|---|---|
| `poktan` | **Poktan 2026** | Gapoktan | `1xd4G2iCUBvyqUwuTni3anBOJhoQwmb-TNW1qOE4YBzg` |
| `padi_sawah` | Produksi Padi Sawah 2025 | Produksi | `1NEEZarMvHL11z2rXx0dS31KuiI0tAMJCIH_b11eYFQo` |
| `padi_ladang` | Produksi Padi Ladang 2025 | Produksi | `1G3x0B9Oxi4rfMoWTBJ3Ie-rIL2-dCrPV9vlh0BahvqQ` |
| `beras` | Produksi Beras 2025 | Produksi | `1s41NFQjZBdlQWW_6d-NBNMnEkYLufyf-Z-bCgaxOiC4` |
| `rekap_alsintan` | Rekap Alsintan s.d. April 2026 | Alsintan | `1z5zDzvksX5xT6C_OvM_Kv_cFYPuGdOPvAKxsxp7LBoY` |
| `rekap_bulanan` | Rekap Bulanan SP TP | SP TP | `1DzlqupA0M-6Ehs6QSwTo_o7oU_g7uVYROCSr8aiuzt8` |
| `baseline` | SIAP ALSINTAN - Baseline (MASTER) | Database | `1EZ3XYXRaCkJmHhLbhVkrzKqcFrtcN7DX3k7BNZc20F4` |

**Poktan 2026** punya 16 tab, satu per kecamatan (Title Case):
`Bagelen`, `Banyuurip`, `Bayan`, `Bener`, `Bruno`, `Butuh`, `Gebang`, `Grabag`,
`Kaligesing`, `Kemiri`, `Kutoarjo`, `Loano`, `Ngombol`, `Pituruh`,
`Purwodadi`, `Purworejo`.

Kolom tiap tab (header di baris 1/2/3 tergantung kecamatan — `Pituruh` baris 3):

```
No | Nama Poktan | ID Poktan | Jumlah Anggota | Nama Desa | Nama Ketua | Alamat Sekretariat
```

Total 3.242 poktan. Nama di `MASTER_WILAYAH` disimpan HURUF KAPITAL
(`PITURUH`), nama tab Title Case (`Pituruh`) — pencocokan dilakukan
case-insensitive.

---

## 2. Tabel Besar: Per Halaman

| Halaman | Baca dari | Sheet | Simpan ke | Sheet |
|---|---|---|---|---|
| `/login` | Baseline (MASTER) | `USERS` | — | — |
| `/dashboard` | Baseline (MASTER) | `MASTER_WILAYAH`, `DATA_PROSPEK` | — | — |
| `/peta` | Baseline (MASTER) | `MASTER_WILAYAH`, `DATA_PROSPEK` | — | — |
| `/prioritas` | Baseline (MASTER) | `MASTER_WILAYAH`, `DATA_PROSPEK` | — | — |
| `/prospek` | Baseline (MASTER) | `DATA_PROSPEK`, `MASTER_WILAYAH`, `MASTER_ANALIS` | **Baseline (MASTER)** | **`DATA_PROSPEK`** |
| `/analis` | Baseline (MASTER) | `MASTER_ANALIS`, `MASTER_WILAYAH`, `DATA_PROSPEK` | **Baseline (MASTER)** | **`MASTER_ANALIS`** |
| `/survey` | Baseline (MASTER) + **Poktan 2026** | `MASTER_WILAYAH`, `DATA_PROSPEK`, `DATA_SURVEY`, `MASTER_ANALIS` + 16 tab poktan | **Baseline (MASTER)** | **`DATA_SURVEY`** + **`DATA_PROSPEK`** (otomatis) |
| `/monitoring` | Baseline (MASTER) | `MASTER_WILAYAH`, `DATA_PROSPEK`, `MASTER_ANALIS` | — | — |
| `/sumber-data` | 7 spreadsheet sumber | sesuai tab yang dipilih | — | — |
| `/pengaturan` | — (cek koneksi saja) | — | — (cuma `localStorage`) | — |

**Ringkasan: aplikasi hanya menulis ke 2 sheet — `DATA_SURVEY` dan
`DATA_PROSPEK` (lewat `/prospek`), plus `MASTER_ANALIS` (lewat `/analis`).**

---

## 3. Detail Per Halaman

### `/login`
- **Baca**: Baseline (MASTER) → `USERS`
  - Action `authCheck` (POST) → kolom `EMAIL`, `NAMA`, `ROLE`, `ID_ANALIS`, `STATUS`
  - Hanya user ber-`STATUS = AKTIF` yang boleh masuk
  - Google Sign-In: email diverifikasi oleh `authCheck`
- **Login email/password**: **TIDAK** baca spreadsheet sama sekali —
  masih pakai daftar mock hardcoded di `src/lib/auth/auth-context.tsx:27`
  (`admin@siap-alsintan.id` / `admin123`, `budi@…` / `analis123`, `manager@…` / `mgr123`)
- **Simpan**: tidak ada ke spreadsheet. Sesi disimpan di `localStorage`

### `/dashboard`
- **Baca**: Baseline (MASTER)
  - `getDashboardKPI` → agregasi `MASTER_WILAYAH` + hitung `DATA_PROSPEK`
  - `getWilayah` → `MASTER_WILAYAH` (16 baris)
  - `getProspek` (limit 5) → `DATA_PROSPEK`
- **Simpan**: tidak ada

### `/peta`
- **Baca**: Baseline (MASTER)
  - `getWilayah` → `MASTER_WILAYAH` (kolom `LATITUDE`, `LONGITUDE` untuk titik peta)
  - `getProspek` (limit 100) → `DATA_PROSPEK`
- **Simpan**: tidak ada

### `/prioritas`
- **Baca**: Baseline (MASTER)
  - `getWilayah` → `MASTER_WILAYAH` (untuk skor prioritas per kecamatan)
  - `getProspek` (limit 100) → `DATA_PROSPEK`
- **Simpan**: tidak ada

### `/prospek` — **hanya halaman yang punya CRUD penuh**
- **Baca**: Baseline (MASTER)
  - `getProspek` (limit 100) → `DATA_PROSPEK`
  - `getWilayah` → `MASTER_WILAYAH`
  - `getAnalis` → `MASTER_ANALIS`
- **Simpan**: Baseline (MASTER) → **`DATA_PROSPEK`**

| Tombol | Action | Yang ditulis |
|---|---|---|
| Tambah Prospek Baru | `createProspek` | baris baru: `ID_PROSPEK` (`P003`, `P004`, …), `ID_ANALIS` dari sesi login |
| Ubah | `updateProspek` | `NAMA_GAPOKTAN`, `KOMODITAS`, `STATUS`, `ID_ANALIS`+`NAMA_ANALIS`, `ESTIMASI_ALSINTAN`, `CATATAN` |
| Nonaktifkan | `deleteProspek` | `STATUS` → `TIDAK_POTENSIAL` + penanda di `CATATAN`. **Baris tidak dihapus** |
| Aktifkan Kembali | `restoreProspek` | `STATUS` kembali + penanda dibuang dari `CATATAN` |

Kolom `DATA_PROSPEK` (11 kolom, urutannya penting):

```
ID_PROSPEK | ID_KECAMATAN | KECAMATAN | NAMA_GAPOKTAN | KOMODITAS |
ID_ANALIS | NAMA_ANALIS | STATUS | TANGGAL | ESTIMASI_ALSINTAN | CATATAN
```

Dikunci (tidak bisa diedit): `ID_PROSPEK`, `ID_KECAMATAN`, `KECAMATAN`, `TANGGAL`.

> `ID_PROSPEK` punya dua asal: nomor urut manual (`P001`…) dan **ID Poktan
> numerik** (`5107401`) yang dibuat otomatis oleh `/survey`.

### `/analis`
- **Baca**: Baseline (MASTER)
  - `getAnalis` → `MASTER_ANALIS`
  - `getWilayah` → `MASTER_WILAYAH`
  - `getProspek` (limit 100) → `DATA_PROSPEK` (untuk hitung prospek per analis)
- **Simpan**: Baseline (MASTER) → **`MASTER_ANALIS`**

| Tombol | Action | Yang ditulis |
|---|---|---|
| Tambah Analis | `createAnalis` | baris baru di `MASTER_ANALIS` |
| Ubah Status | `updateAnalisStatus` | kolom `STATUS` (`AKTIF` / `TIDAK_AKTIF`) |

Kolom `MASTER_ANALIS`: `ID_ANALIS | NAMA_ANALIS | WILAYAH | STATUS | EMAIL`
(nama kolom lama `ID_AO`/`NAMA_AO` otomatis dibaca sebagai `ID_ANALIS`/`NAMA_ANALIS`)

### `/survey` — **paling banyak menulis**
- **Baca**:
  - Baseline (MASTER) → `getWilayah` → `MASTER_WILAYAH` (16 kecamatan, untuk dropdown pertama)
  - **Poktan 2026** → `getPoktan` → tab kecamatan terpilih (310–400 baris per kecamatan)
    - Kalau `getPoktan` belum ada di deployment, otomatis jatuh ke
      `getSourceData` (`key=poktan`, `tab=<KECAMATAN>`), hasilnya dibersihkan
      di sisi browser lalu di-cache dengan bentuk yang sama
  - Baseline (MASTER) → `getProspek?prospekId=…` → `DATA_PROSPEK` (untuk deep-link dari `/prospek`)
  - Baseline (MASTER) → `getSurvey` → `DATA_SURVEY` (tabel riwayat)
- **Simpan**: Baseline (MASTER) → **`DATA_SURVEY`** + **`DATA_PROSPEK`**

Satu kiriman form menulis ke **dua sheet**:

```
DATA_SURVEY  ← baris baru (ID_SURVEY S001, S002, …)
DATA_PROSPEK ← otomatis: kalau ID Poktan belum punya baris di DATA_PROSPEK,
                dibuat dengan ID_PROSPEK = ID Poktan itu (mis. 5107401).
                Kalau sudah ada, tidak diduplikasi (idempoten).
```

Kolom `DATA_SURVEY` (17 kolom, A–P urut aslinya, Q ditambahkan 2026-09-29):

```
A ID_SURVEY | B ID_PROSPEK | C NAMA_GAPOKTAN | D JUMLAH_ANGGOTA |
E LUAS_SAWAH_AKTUAL | F JENIS_ALSINTAN | G ESTIMASI_HARGA | H LATITUDE |
I LONGITUDE | J ACCURACY_M | K CATATAN | L ID_ANALIS | M NAMA_ANALIS |
N TIMESTAMP | O STATUS | P FOTO_URL | Q NAMA_KETUA
```

> Kolom `NAMA_GAPOKTAN` **sama** dengan isi **nama poktan** (bukan gapoktan).
> Nama kolom tidak diubah supaya baris lama tetap terbaca.
> `Q NAMA_KETUA` ditambahkan sebagai kolom terakhir supaya A–P tidak bergeser.

### `/monitoring`
- **Baca**: Baseline (MASTER)
  - `getWilayah` → `MASTER_WILAYAH`
  - `getProspek` (limit 100) → `DATA_PROSPEK`
  - `getAnalis` → `MASTER_ANALIS`
- **Simpan**: tidak ada

### `/sumber-data`
- **Baca**: 7 spreadsheet sumber (lihat tabel §1.2)
  - `getSources` → daftar metadata spreadsheet
  - `getSourceData` (`key`, `tab`, `q`, `page`, `limit`) → isi tab yang dipilih
- **Simpan**: **tidak ada.** Halaman ini murni read-only, tidak bisa mengubah
  spreadsheet sumber apa pun

### `/pengaturan`
- **Baca**: tidak ada. Hanya `ping` (`POST`) untuk cek koneksi GAS
- **Simpan**: **tidak ada ke spreadsheet.** Setting disimpan di `localStorage`
  (URL GAS override, dll)

---

## 4. Cache Browser (localStorage)

Prefix: `siap_v2_`. **Tidak ada TTL** — cache tidak kedaluwarsa sendiri, jadi
klik "refresh" saja tidak dijamin mengambil data baru; harus clear storage atau
tambah `retry: 1` di query.

| Key | Diisi oleh | Isi |
|---|---|---|
| `siap_v2_wilayah_all` | `getWilayah` | 16 kecamatan |
| `siap_v2_dashboard_kpi` | `getDashboardKPI` | angka KPI |
| `siap_v2_prospek_all` | `getProspek` (limit 100) | daftar prospek |
| `siap_v2_prospek_dashboard` | `getProspek` (limit 5) | 5 prospek terbaru |
| `siap_v2_analis_all` | `getAnalis` | daftar analis |
| `siap_v2_poktan_<kecamatan>` | `getPoktan` | poktan per kecamatan |
| `siap_v2_sources_list` | `getSources` | daftar spreadsheet sumber |
| `siap_v2_source_data_<key>_<tab>_<q>_<page>` | `getSourceData` | isi tab |

---

## 5. Catatan & Risiko yang Diketahui

### 5.1 Sheet yang belum dipakai
`MASTER_DESA`, `REKAP_KECAMATAN`, `IMPORT_BAKU_SAWAH_DESA` ada di spreadsheet
tapi tidak dibaca halaman mana pun. `MASTER_DESA` (495 desa) sebenarnya
potensial untuk lookup `Nama Desa` di form survey.

### 5.2 Mock data yang masih bisa muncul
Beberapa halaman masih jatuh ke mock kalau respons GAS belum datang:

| Halaman | Sumber mock |
|---|---|
| `/dashboard`, `/peta`, `/prioritas`, `/monitoring` | `MOCK_WILAYAH`, `MOCK_DASHBOARD_KPI`, `MOCK_PROSPEK` |
| `/analis` | `MOCK_ANALIS`, `MOCK_PROSPEK` |
| `/sumber-data` | `DEFAULT_SOURCES` |

`/prospek` sudah diperbaiki — mock hanya dipakai kalau GAS belum dikonfigurasi.

> `MOCK_PROSPEK` memakai ID `P001`–`P005` yang **bentrok** dengan baris asli di
> `DATA_PROSPEK`. Di halaman lain yang masih memakainya, tabel bisa sesaat
> menampilkan 5 baris padahal spreadsheet cuma punya 2.

### 5.3 `AN001` berstatus `TIDAK_AKTIF`
Tercek langsung ke GAS pada 2026-09-30:

```
AN001 | Budi Santoso        | TIDAK_AKTIF | totalProspek=2
AN002 | YANUAR ADI WIBISONO | AKTIF       | totalProspek=0
```

Dampaknya:
- `updateProspek` **menolak** menugaskan `AN001` (validasi: analis harus AKTIF)
- `createProspek` **tidak** menolak — masih jatuh ke default `AN001` kalau
  pemanggil tidak mengirim `idAnalis`
- `/analis` menampilkan Budi sebagai nonaktif, padahal 2 prospek miliknya masih aktif

### 5.4 `USE_MOCK` selalu `false`
`prospek.ts:13`, `analis.ts:13`, `wilayah.ts:13`, `dashboard.ts:13` menulis
`const USE_MOCK = !isGasConfigured` (tanpa `()`). `!fungsi` bernilai `false`,
jadi cabang mock di 4 modul itu **tidak pernah jalan**. Belum diperbaiki.

### 5.5 Tombol Google 403 di produksi
`https://alsintan-six.vercel.app` belum masuk *Authorized JavaScript origins*
di OAuth client Google. Tidak berhubungan dengan alur data.

### 5.6 Status TIDAK_POTENSIAL ambigu
Nilai status ini bisa berarti dua hal: (a) dipilih manual di pipeline, atau
(b) hasil `deleteProspek`. Frontend membedakannya lewat penanda
`Dinonaktifkan <tanggal>` di ujung `CATATAN`. Kalau ada yang mengedit
`CATATAN` langsung di Excel, penandanya hilang dan tombol "Aktifkan Kembali"
ikut hilang.

---

## 6. Peta Singkat

```
                    ┌──────────────────────────────┐
  Browser  ────────►│  GAS Web App (Code.gs)       │
  (11 halaman)      │  apps-script/Code.gs         │
                    └──────┬────────────────┬──────┘
                           │                │
              READ + WRITE │                │ READ ONLY
                           ▼                ▼
        ┌──────────────────────────┐   ┌─────────────────────────┐
        │ SIAP ALSINTAN -          │   │ 6 spreadsheet sumber   │
        │ Baseline (MASTER)        │   │ + Baseline (read-only) │
        │                         │   │                         │
        │  USERS          ← /login│   │  Poktan 2026     ← /survey, /sumber-data
        │  MASTER_WILAYAH  ← semua │   │  Produksi Padi Sawah   │
        │  DATA_PROSPEK    ← semua │   │  Produksi Padi Ladang  │
        │       ↑ write: /prospek  │   │  Produksi Beras        │
        │       ↑ write: /survey   │   │  Rekap Alsintan        │
        │  DATA_SURVEY     ← /survey│   │  Rekap Bulanan SP TP   │
        │       ↑ write: /survey   │   └─────────────────────────┘
        │  MASTER_ANALIS   ← /analis│
        │       ↑ write: /analis   │
        │  MASTER_DESA       (tak │
        │   dipakai)              │
        │  REKAP_KECAMATAN  (tak  │
        │   dipakai)              │
        │  IMPORT_BAKU_SAWAH_DESA │
        │   (tak dipakai)         │
        └─────────────────────────┘
```

---

*Dokumen ini dibuat 2026-09-30. Struktur sheet diverifikasi langsung ke GAS
aktif pada tanggal tersebut. Backup spreadsheet ada di `excel/backup-2026-09-27/`.*
