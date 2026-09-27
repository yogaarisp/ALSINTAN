# DATA MAPPING & SCHEMA DICTIONARY — SIAP ALSINTAN (Fase 1)

> **Status:** Adaptable to existing Google Spreadsheet columns.
> *Catatan: Jangan mengubah header spreadsheet existing tanpa persetujuan stakeholder.*

---

## 0. Peta Halaman Web → Spreadsheet → Sheet (Tab)

Sistem terdiri dari **7 Google Spreadsheet** (1 Baseline + 6 Sumber Data).
Semua akses data mengalir melalui **Apps Script Web App** (`Code.gs`)
yang bertindak sebagai middleware antara frontend dan Google Sheets API.

### 0a. Spreadsheet Baseline (MASTER)

| Spreadsheet File | ID Spreadsheet | Sheet (Tab) |
|---|---|---|
| **SIAP ALSINTAN - Baseline (MASTER)** | `1EZ3XYXRaCkJmHhLbhVkrzKqcFrtcN7DX3k7BNZc20F4` | `MASTER_WILAYAH`, `MASTER_DESA`, `DATA_PROSPEK`, `DATA_SURVEY`, `MASTER_ANALIS`, `USERS`, `IMPORT_BAKU_SAWAH_DESA`, `REKAP_KECAMATAN` |

### 0b. Spreadsheet Sumber Data (6 file)

| # | Spreadsheet File | ID Spreadsheet | Sheet (Tab) |
|---|---|---|---|
| 1 | **Poktan 2026** | `1xd4G2iCUBvyqUwuTni3anBOJhoQwmb-TNW1qOE4YBzg` | Tab sesuai data poktan |
| 2 | **Produksi Padi Sawah 2025** | `1NEEZarMvHL11z2rXx0dS31KuiI0tAMJCIH_b11eYFQo` | Tab sesuai data produksi |
| 3 | **Produksi Padi Ladang 2025** | `1G3x0B9Oxi4rfMoWTBJ3Ie-rIL2-dCrPV9vlh0BahvqQ` | Tab sesuai data produksi |
| 4 | **Produksi Beras 2025** | `1s41NFQjZBdlQWW_6d-NBNMnEkYLufyf-Z-bCgaxOiC4` | Tab sesuai data produksi |
| 5 | **Rekap Alsintan s.d. April 2026** | `1z5zDzvksX5xT6C_OvM_Kv_cFYPuGdOPvAKxsxp7LBoY` | Tab sesuai data alsintan |
| 6 | **Rekap Bulanan SP TP** | `1DzlqupA0M-6Ehs6QSwTo_o7oU_g7uVYROCSr8aiuzt8` | `PS`, `PL`, `Jagung`, `Kedele`, `Kc. Hijau`, `Kc. Tanah`, `Ubi Kayu`, `Ubi Jalar` |

### 0c. Peta Lengkap: Halaman Web → Action → Spreadsheet → Sheet

| Halaman Web | Action Apps Script | Spreadsheet File | Sheet (Tab) yang Dibaca/Ditulis |
|---|---|---|---|
| **Dashboard** | `getDashboardKPI` | SIAP ALSINTAN - Baseline (MASTER) | `MASTER_WILAYAH`, `DATA_PROSPEK`, `MASTER_ANALIS` |
| **Pemetaan/Wilayah** | `getWilayah` | SIAP ALSINTAN - Baseline (MASTER) | `MASTER_WILAYAH` |
| **Prospek** | `getProspek` / `createProspek` | SIAP ALSINTAN - Baseline (MASTER) | `DATA_PROSPEK` |
| **Survey** | `getSurvey` / `createSurvey` | SIAP ALSINTAN - Baseline (MASTER) | `DATA_SURVEY` *(+ Google Drive untuk foto)* |
| **Analis** | `getAnalis` / `createAnalis` / `updateAnalisStatus` | SIAP ALSINTAN - Baseline (MASTER) | `MASTER_ANALIS`, `DATA_PROSPEK`, `DATA_SURVEY` |
| **Login/Auth** | `authCheck` | SIAP ALSINTAN - Baseline (MASTER) | `USERS` |
| **Sumber Data** | `getSources` | Poktan 2026 + Produksi Padi Sawah 2025 + Produksi Padi Ladang 2025 + Produksi Beras 2025 + Rekap Alsintan s.d. April 2026 + Rekap Bulanan SP TP | Semua tab di masing-masing spreadsheet |
| **Sumber Data** | `getSourceData` (per key) | Salah satu dari 6 spreadsheet di atas (sesuai parameter `key`) | Semua tab di spreadsheet yang dipilih |

### 0d. Diagram Alur Data

```
[Frontend Web]
    │
    │  gasGet() / gasPost()  →  axios (baseURL = VITE_GAS_API_URL)
    │
    ▼
[Apps Script Web App (Code.gs)]
    │
    ├──→ Spreadsheet: SIAP ALSINTAN - Baseline (MASTER)
    │       ├── MASTER_WILAYAH   (data wilayah & KPI dashboard)
    │       ├── MASTER_DESA      (data desa)
    │       ├── DATA_PROSPEK     (CRUD prospek)
    │       ├── DATA_SURVEY      (CRUD survey + foto ke Drive)
    │       ├── MASTER_ANALIS     (CRUD analis)
    │       ├── USERS            (autentikasi & role)
    │       ├── IMPORT_BAKU_SAWAH_DESA
    │       └── REKAP_KECAMATAN
    │
    ├──→ Spreadsheet: Poktan 2026
    ├──→ Spreadsheet: Produksi Padi Sawah 2025
    ├──→ Spreadsheet: Produksi Padi Ladang 2025
    ├──→ Spreadsheet: Produksi Beras 2025
    ├──→ Spreadsheet: Rekap Alsintan s.d. April 2026
    └──→ Spreadsheet: Rekap Bulanan SP TP
            (tab: PS, PL, Jagung, Kedele, Kc. Hijau, Kc. Tanah, Ubi Kayu, Ubi Jalar)
```

---

## 1. Sheet: `MASTER_WILAYAH`
Baseline data potensi wilayah dari Dinas Pertanian.

| Kolom App | Header Spreadsheet | Tipe Data | Keterangan |
|-----------|--------------------|-----------|------------|
| `idKecamatan` | ID_KECAMATAN | String | Kode unik wilayah (contoh: W001) |
| `kecamatan` | KECAMATAN | String | Nama kecamatan |
| `kabupaten` | KABUPATEN | String | Nama kabupaten/kota |
| `luasLahan` | LUAS_LAHAN_HA | Number | Luas area pertanian (Ha) |
| `dataPanen` | DATA_PANEN_TON | Number | Estimasi hasil panen (Ton/Tahun) |
| `jumlahGapoktan` | JUMLAH_GAPOKTAN | Number | Total kelompok tani terdaftar |
| `komoditas` | KOMODITAS | String (Comma separated) | Jenis komoditas (misal: Padi, Jagung) |
| `koordinatLat` | LATITUDE | Number | Titik lintang untuk peta |
| `koordinatLng` | LONGITUDE | Number | Titik bujur untuk peta |

---

## 2. Sheet: `DATA_PROSPEK`
Data pipeline prospek alsintan yang dicatat Analis.

| Kolom App | Header Spreadsheet | Tipe Data | Keterangan |
|-----------|--------------------|-----------|------------|
| `idProspek` | ID_PROSPEK | String | ID unik prospek (contoh: P001) |
| `idKecamatan` | ID_KECAMATAN | String | Referensi ke Master Wilayah |
| `kecamatan` | KECAMATAN | String | Nama kecamatan |
| `namaGapoktan` | NAMA_GAPOKTAN | String | Nama kelompok tani |
| `komoditas` | KOMODITAS | String | Komoditas utama |
| `idAnalis` | ID_ANALIS | String | ID Analis |
| `namaAnalis` | NAMA_ANALIS | String | Nama Analis penanggung jawab |
| `status` | STATUS | String | Enum: BARU, DALAM_PROSPEK, SURVEY, POTENSIAL, TIDAK_POTENSIAL, CLOSING |
| `tanggal` | TANGGAL | Date / String | Tanggal registrasi (YYYY-MM-DD) |
| `estimasiKebutuhan`| ESTIMASI_ALSINTAN | String | Jenis & jumlah alat yang dibutuhkan |
| `catatan` | CATATAN | String | Catatan keterangan prospek |

---

## 3. Sheet: `DATA_SURVEY`
Data hasil survey verifikasi lapangan aktual oleh Analis.

| Kolom App | Header Spreadsheet | Tipe Data | Keterangan |
|-----------|--------------------|-----------|------------|
| `idSurvey` | ID_SURVEY | String | ID unik survey |
| `idProspek` | ID_PROSPEK | String | Referensi ke Data Prospek |
| `namaGapoktan` | NAMA_GAPOKTAN | String | Nama Gapoktan yang diverifikasi |
| `jumlahAnggota` | JUMLAH_ANGGOTA | Number | Jumlah anggota petani aktif |
| `luasSawah` | LUAS_SAWAH_AKTUAL | Number | Luas sawah hasil pengukuran lapangan |
| `jenisAlsintan` | JENIS_ALSINTAN | String | Spesifikasi alsintan |
| `estimasiHarga` | ESTIMASI_HARGA | Number | Estimasi nilai investasi (Rupiah) |
| `latitude` | LATITUDE | Number | Titik GPS Geolocation |
| `longitude` | LONGITUDE | Number | Titik GPS Geolocation |
| `accuracy` | ACCURACY_M | Number | Akurasi sinyal GPS perangkat (meter) |
| `idAnalis` | ID_ANALIS | String | Analis lapangan |
| `namaAnalis` | NAMA_ANALIS | String | Nama Analis yang melakukan survey |
| `fotoUrl` | FOTO_URL | String | Link foto di Google Drive |
| `timestamp` | TIMESTAMP | ISO String | Waktu pelaksanaan survey |
| `status` | STATUS | String | Status survey |

---

## 4. Sheet: `MASTER_ANALIS`
Master petugas Analis (dulu `MASTER_AO`) beserta wilayah penugasan.

| Kolom App | Header Spreadsheet | Tipe Data | Keterangan |
|-----------|--------------------|-----------|------------|
| `idAnalis` | ID_ANALIS | String | ID unik analis (contoh: AN001) |
| `namaAnalis` | NAMA_ANALIS | String | Nama lengkap petugas |
| `wilayah` | WILAYAH | String (Comma separated) | Kecamatan/kabupaten penugasan |
| `status` | STATUS | String | Enum: AKTIF, TIDAK_AKTIF |
| `email` | EMAIL | String | Email login Google |

> Sheet `USERS` memakai kolom `ID_ANALIS`. Nilai `ROLE` masih boleh berisi `AO`
> (penamaan lama) — backend `authCheck` menormalikannya menjadi `ANALIS`.
