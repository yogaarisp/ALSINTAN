# DATA_MAPPING — Pemetaan Halaman Web ke Spreadsheet Google Sheets
## SIAP ALSINTAN · Kabupaten Purworejo

**Terakhir diperbarui:** 28 September 2026  
**Folder Google Drive:** https://drive.google.com/drive/folders/1SSz9RlEF4AGuspbiRfy55xsxS3xQS_Dy

---

## Daftar Spreadsheet

| # | Nama Spreadsheet | ID | Kategori |
|---|-----------------|-----|----------|
| 1 | **SIAP ALSINTAN - Baseline (MASTER)** | `1EZ3XYXRaCkJmHhLbhVkrzKqcFrtcN7DX3k7BNZc20F4` | Database Utama |
| 2 | **Poktan 2026** | `1xd4G2iCUBvyqUwuTni3anBOJhoQwmb-TNW1qOE4YBzg` | Kelompok Tani |
| 3 | **Produksi Padi Sawah 2025** | `1NEEZarMvHL11z2rXx0dS31KuiI0tAMJCIH_b11eYFQo` | Produksi |
| 4 | **Produksi Padi Ladang 2025** | `1G3x0B9Oxi4rfMoWTBJ3Ie-rIL2-dCrPV9vlh0BahvqQ` | Produksi |
| 5 | **Produksi Beras 2025** | `1s41NFQjZBdlQWW_6d-NBNMnEkYLufyf-Z-bCgaxOiC4` | Produksi |
| 6 | **Rekap Alsintan s.d. April 2026** | `1z5zDzvksX5xT6C_OvM_Kv_cFYPuGdOPvAKxsxp7LBoY` | Alsintan |
| 7 | **Rekap Bulanan SP TP** | `1DzlqupA0M-6Ehs6QSwTo_o7oU_g7uVYROCSr8aiuzt8` | SP TP |

---

## Sheet di Spreadsheet Baseline (MASTER)

| Nama Sheet | Fungsi | Baris Data | Kolom |
|------------|--------|-----------|-------|
| `MASTER_WILAYAH` | Data 16 kecamatan: luas lahan Ha, koordinat lat/lng, jumlah gapoktan, komoditas | 17 | 10 |
| `MASTER_DESA` | Data seluruh desa Kabupaten Purworejo | 495 | 5 |
| `IMPORT_BAKU_SAWAH_DESA` | Luas baku sawah per desa (baseline Dinas Pertanian) | 495 | 3 |
| `REKAP_KECAMATAN` | Rekap agregat luas lahan per kecamatan | 18 | 2 |
| `DATA_PROSPEK` | Daftar prospek pengadaan alsintan per poktan | dinamis | 11 |
| `DATA_SURVEY` | Hasil survey lapangan: GPS, foto, luas sawah aktual | dinamis | 17 |
| `MASTER_ANALIS` | Daftar petugas analis, wilayah penugasan, status aktif | dinamis | 5 |
| `USERS` | Email dan role pengguna sistem (Admin, Analis, Manajemen) | dinamis | 5 |

## Tab di Spreadsheet Poktan 2026

16 tab, satu per kecamatan, total ±3.242 poktan:

| Tab | Baris Data | Tab | Baris Data |
|-----|-----------|-----|-----------|
| Bagelen | 160 | Loano | 152 |
| Banyuurip | 184 | Ngombol | 241 |
| Bayan | 186 | Pituruh | 312 |
| Bener | 297 | Purwodadi | 217 |
| Bruno | 172 | Purworejo | 156 |
| Butuh | 151 | Kaligesing | 300 |
| Gebang | 174 | Kemiri | 218 |
| Grabag | 170 | Kutoarjo | 169 |

Struktur tiap tab Poktan 2026:

| Kolom | Isi |
|-------|-----|
| No | Nomor urut |
| Nama Poktan | Nama kelompok tani |
| ID Poktan | ID unik poktan (numerik) |
| Jumlah Anggota | Jumlah anggota poktan |
| Nama Desa | Desa lokasi poktan |
| Nama Ketua | Nama ketua poktan |
| Alamat Sekretariat | Alamat lengkap sekretariat |

---

## Pemetaan Per Halaman

---

### 1. `/dashboard` — Dashboard

**Akses:** Admin · Analis · Manajemen

| Data yang Ditampilkan | Spreadsheet | Sheet | Operasi |
|----------------------|------------|-------|---------|
| Total kecamatan aktif | Baseline (MASTER) | `MASTER_WILAYAH` | Baca |
| Total luas lahan (Ha) | Baseline (MASTER) | `MASTER_WILAYAH` | Baca |
| Total gapoktan/poktan | Baseline (MASTER) | `MASTER_WILAYAH` | Baca |
| Jumlah prospek baru | Baseline (MASTER) | `DATA_PROSPEK` | Baca |
| Jumlah analis aktif | Baseline (MASTER) | `MASTER_ANALIS` | Baca |
| 5 prospek terbaru | Baseline (MASTER) | `DATA_PROSPEK` | Baca |
| Skor & ranking prioritas wilayah | Baseline (MASTER) | `MASTER_WILAYAH` + `DATA_PROSPEK` | Baca (kalkulasi lokal) |

> Tidak ada operasi tulis di halaman ini.

---

### 2. `/peta` — Peta Potensi

**Akses:** Admin · Analis · Manajemen

| Data yang Ditampilkan | Spreadsheet | Sheet | Operasi |
|----------------------|------------|-------|---------|
| Koordinat marker tiap kecamatan (lat/lng) | Baseline (MASTER) | `MASTER_WILAYAH` | Baca |
| Warna prioritas marker (merah/kuning/hijau) | Baseline (MASTER) | `MASTER_WILAYAH` + `DATA_PROSPEK` | Baca |
| Popup klik: luas lahan, gapoktan, skor | Baseline (MASTER) | `MASTER_WILAYAH` | Baca |
| Popup klik: jumlah prospek aktif | Baseline (MASTER) | `DATA_PROSPEK` | Baca |

> Tidak ada operasi tulis di halaman ini.

---

### 3. `/prioritas` — Prioritas Wilayah

**Akses:** Admin · Analis · Manajemen

| Data yang Ditampilkan | Spreadsheet | Sheet | Operasi |
|----------------------|------------|-------|---------|
| Data 16 kecamatan (luas lahan, gapoktan, koordinat) | Baseline (MASTER) | `MASTER_WILAYAH` | Baca |
| Jumlah prospek per kecamatan | Baseline (MASTER) | `DATA_PROSPEK` | Baca |

Skor prioritas dihitung **di browser** dari dua data di atas:
- Luas Lahan → bobot **30%**
- Jumlah Gapoktan → bobot **25%**
- Data Produksi → bobot **25%**
- Prospek Existing → bobot **20%**

> Bobot dapat diubah Admin di halaman `/pengaturan`.  
> Tidak ada operasi tulis di halaman ini.

---

### 4. `/prospek` — Prospek

**Akses:** Admin · Analis (tambah) · Manajemen (lihat saja)

| Data yang Ditampilkan / Diproses | Spreadsheet | Sheet | Operasi |
|---------------------------------|------------|-------|---------|
| Daftar seluruh prospek | Baseline (MASTER) | `DATA_PROSPEK` | Baca |
| Filter dropdown kecamatan | Baseline (MASTER) | `MASTER_WILAYAH` | Baca |
| Lookup nama analis saat input prospek baru | Baseline (MASTER) | `MASTER_ANALIS` | Baca |
| Validasi kecamatan saat input prospek baru | Baseline (MASTER) | `MASTER_WILAYAH` | Baca |
| **Tambah prospek baru** | Baseline (MASTER) | `DATA_PROSPEK` | **✏️ Tulis** |

Kolom yang ditulis ke `DATA_PROSPEK`:

| Kolom | Nilai |
|-------|-------|
| `ID_PROSPEK` | Auto-generate (P001, P002, ...) |
| `ID_KECAMATAN` | Dari pilihan dropdown |
| `KECAMATAN` | Nama kecamatan |
| `NAMA_GAPOKTAN` | Input manual |
| `KOMODITAS` | Pilihan (default: Padi) |
| `ID_ANALIS` | ID analis yang login |
| `NAMA_ANALIS` | Nama analis yang login |
| `STATUS` | `BARU` |
| `TANGGAL` | Tanggal hari ini |
| `ESTIMASI_ALSINTAN` | Input manual |
| `CATATAN` | Input manual (opsional) |

---

### 5. `/survey` — Survey Lapangan

**Akses:** Admin · Analis

| Data yang Ditampilkan / Diproses | Spreadsheet | Sheet / Tab | Operasi |
|---------------------------------|------------|------------|---------|
| Riwayat survey milik analis | Baseline (MASTER) | `DATA_SURVEY` | Baca |
| Data prospek (referensi form) | Baseline (MASTER) | `DATA_PROSPEK` | Baca |
| Dropdown 16 kecamatan | Baseline (MASTER) | `MASTER_WILAYAH` | Baca |
| Daftar poktan saat kecamatan dipilih | **Poktan 2026** | Tab nama kecamatan (mis. `Pituruh`, `Bagelen`) | Baca |
| **Simpan hasil survey** | Baseline (MASTER) | `DATA_SURVEY` | **✏️ Tulis** |
| **Auto-buat prospek** (poktan baru) | Baseline (MASTER) | `DATA_PROSPEK` | **✏️ Tulis (otomatis)** |
| **Simpan foto lahan** | Google Drive | Folder "SIAP ALSINTAN - Foto Survey" | **✏️ Tulis** |

Kolom yang ditulis ke `DATA_SURVEY`:

| Kolom | Nilai |
|-------|-------|
| `ID_SURVEY` | Auto-generate (S001, S002, ...) |
| `ID_PROSPEK` | ID poktan yang dipilih |
| `NAMA_GAPOKTAN` | Nama poktan terpilih |
| `NAMA_KETUA` | Dari Master Poktan 2026 |
| `JUMLAH_ANGGOTA` | Input form |
| `LUAS_SAWAH_AKTUAL` | Input form (Ha) |
| `JENIS_ALSINTAN` | Pilihan form |
| `ESTIMASI_HARGA` | Input form (Rp) |
| `LATITUDE` | GPS otomatis |
| `LONGITUDE` | GPS otomatis |
| `ACCURACY_M` | Akurasi GPS (meter) |
| `CATATAN` | Input form (opsional) |
| `ID_ANALIS` | ID analis yang login |
| `NAMA_ANALIS` | Nama analis yang login |
| `TIMESTAMP` | Waktu submit |
| `STATUS` | `SURVEY_SELESAI` |
| `FOTO_URL` | Link Google Drive foto |

---

### 6. `/analis` — Analis

**Akses:** Admin · Manajemen

| Data yang Ditampilkan / Diproses | Spreadsheet | Sheet | Operasi |
|---------------------------------|------------|-------|---------|
| Daftar analis beserta KPI | Baseline (MASTER) | `MASTER_ANALIS` | Baca |
| KPI total prospek per analis | Baseline (MASTER) | `DATA_PROSPEK` | Baca |
| KPI total survey per analis | Baseline (MASTER) | `DATA_SURVEY` | Baca |
| Dropdown wilayah penugasan | Baseline (MASTER) | `MASTER_WILAYAH` | Baca |
| **Tambah analis baru** | Baseline (MASTER) | `MASTER_ANALIS` | **✏️ Tulis** |
| **Ubah status aktif/nonaktif** | Baseline (MASTER) | `MASTER_ANALIS` | **✏️ Tulis** |

Kolom yang ditulis ke `MASTER_ANALIS`:

| Kolom | Nilai |
|-------|-------|
| `ID_ANALIS` | Auto-generate (AN001, AN002, ...) |
| `NAMA_ANALIS` | Input form |
| `WILAYAH` | Kecamatan penugasan (pisah koma) |
| `STATUS` | `AKTIF` / `NONAKTIF` |
| `EMAIL` | Email login Google |

---

### 7. `/monitoring` — Monitoring

**Akses:** Admin · Manajemen

| Data yang Ditampilkan | Spreadsheet | Sheet | Operasi |
|----------------------|------------|-------|---------|
| Grafik progres per kecamatan | Baseline (MASTER) | `MASTER_WILAYAH` + `DATA_PROSPEK` | Baca |
| Tabel performa analis | Baseline (MASTER) | `MASTER_ANALIS` | Baca |
| Jumlah prospek per analis | Baseline (MASTER) | `DATA_PROSPEK` | Baca |
| Jumlah survey per analis | Baseline (MASTER) | `DATA_SURVEY` | Baca |
| Conversion rate prospek → survey | Baseline (MASTER) | `DATA_PROSPEK` + `DATA_SURVEY` | Baca (kalkulasi lokal) |

> Tidak ada operasi tulis di halaman ini.

---

### 8. `/sumber-data` — Sumber Data

**Akses:** Admin · Analis · Manajemen

| Data yang Ditampilkan | Spreadsheet | Sheet / Tab | Operasi |
|----------------------|------------|------------|---------|
| Sidebar daftar 7 sumber | Semua 7 spreadsheet | Metadata tab | Baca |
| Isi tabel poktan | Poktan 2026 | 16 tab kecamatan | Baca |
| Isi tabel produksi padi sawah | Produksi Padi Sawah 2025 | Padi Sawah, Produksi, Rekap, Tanam, Panen, Prod | Baca |
| Isi tabel produksi padi ladang | Produksi Padi Ladang 2025 | Padi Ladang, Produksi, REKAP, Tanam, Panen, Prd | Baca |
| Isi tabel produksi beras | Produksi Beras 2025 | Sheet1_2 | Baca |
| Isi tabel rekap alsintan | Rekap Alsintan s.d. April 2026 | sd april_2026 | Baca |
| Isi tabel rekap bulanan | Rekap Bulanan SP TP | PS, PL, Jagung, Kedele, Kc. Hijau, Kc. Tanah, Ubi Kayu, Ubi Jalar | Baca |
| Isi database utama | Baseline (MASTER) | Semua 8 sheet | Baca |

> Tidak ada operasi tulis di halaman ini. Semua data bersifat read-only.

---

### 9. `/pengaturan` — Pengaturan

**Akses:** Admin saja

| Fitur | Sumber Data | Operasi |
|-------|------------|---------|
| Override URL endpoint GAS | `localStorage` browser | Simpan lokal |
| Konfigurasi bobot Priority Engine | `localStorage` browser | Simpan lokal |
| Test koneksi (ping ke GAS) | Google Apps Script | Baca (health check) |

> Halaman ini **tidak membaca maupun menulis** ke spreadsheet manapun.  
> Semua konfigurasi disimpan di `localStorage` browser pengguna.

---

## Ringkasan Matrix

### Halaman vs Spreadsheet

| Halaman | Baseline | Poktan 2026 | Prod. Sawah | Prod. Ladang | Beras | Rekap Alsintan | Rekap Bulanan |
|---------|:--------:|:-----------:|:-----------:|:------------:|:-----:|:--------------:|:-------------:|
| Dashboard | ✅ | — | — | — | — | — | — |
| Peta Potensi | ✅ | — | — | — | — | — | — |
| Prioritas | ✅ | — | — | — | — | — | — |
| Prospek | ✅ | — | — | — | — | — | — |
| Survey | ✅ | ✅ | — | — | — | — | — |
| Analis | ✅ | — | — | — | — | — | — |
| Monitoring | ✅ | — | — | — | — | — | — |
| Sumber Data | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pengaturan | — | — | — | — | — | — | — |

### Sheet Baseline vs Halaman yang Membacanya

| Sheet | Dashboard | Peta | Prioritas | Prospek | Survey | Analis | Monitoring |
|-------|:---------:|:----:|:---------:|:-------:|:------:|:------:|:----------:|
| `MASTER_WILAYAH` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `DATA_PROSPEK` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `MASTER_ANALIS` | ✅ | — | — | ✅ | — | ✅ | ✅ |
| `DATA_SURVEY` | — | — | — | — | ✅ | ✅ | ✅ |
| `MASTER_DESA` | — | — | — | — | — | — | — |
| `USERS` | — | — | — | — | — | — | — |

> `MASTER_DESA` dan `USERS` diakses oleh sistem (login & validasi) tetapi tidak ditampilkan langsung di halaman manapun.

### Operasi Tulis (Write) ke Spreadsheet

| Halaman | Sheet Tujuan | Data yang Ditulis |
|---------|-------------|-------------------|
| `/prospek` | `DATA_PROSPEK` | Entri prospek baru |
| `/survey` | `DATA_SURVEY` | Hasil survey + GPS + link foto |
| `/survey` (otomatis) | `DATA_PROSPEK` | Prospek auto-create untuk poktan baru |
| `/analis` | `MASTER_ANALIS` | Data analis baru / perubahan status |

---

*Dokumen ini dibuat otomatis berdasarkan analisis kode sumber dan struktur spreadsheet aktual per 28 September 2026.*
