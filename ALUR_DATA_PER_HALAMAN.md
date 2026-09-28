# Alur Data Per Halaman Website
# SIAP ALSINTAN — Kabupaten Purworejo

**Terakhir diperbarui:** 28 September 2026  
**Folder Google Drive:** https://drive.google.com/drive/folders/1SSz9RlEF4AGuspbiRfy55xsxS3xQS_Dy

---

## 📋 Halaman Prospek (`/prospek`)

### Data Diambil Dari:
| Spreadsheet | Sheet | Data yang Diambil |
|-------------|-------|-------------------|
| Baseline (MASTER) | `DATA_PROSPEK` | Daftar seluruh prospek yang sudah ada |
| Baseline (MASTER) | `MASTER_WILAYAH` | Daftar 16 kecamatan untuk dropdown filter |
| Baseline (MASTER) | `MASTER_ANALIS` | Nama analis untuk ditampilkan di form |

### Data Tersimpan Ke:
| Spreadsheet | Sheet | Data yang Disimpan |
|-------------|-------|-------------------|
| Baseline (MASTER) | `DATA_PROSPEK` | Entri prospek baru yang diinput Analis |

### Alur:
```
Spreadsheet "Baseline"
  Sheet MASTER_WILAYAH  ──→  Daftar kecamatan di dropdown
  Sheet DATA_PROSPEK    ──→  Tampilkan daftar prospek
  Sheet MASTER_ANALIS   ──→  Nama analis di form

Analis input prospek baru
  ──→  Tersimpan ke Sheet DATA_PROSPEK
         di Spreadsheet "Baseline"
```

---

## 📍 Halaman Survey (`/survey`)

### Data Diambil Dari:
| Spreadsheet | Sheet / Tab | Data yang Diambil |
|-------------|------------|-------------------|
| Baseline (MASTER) | `MASTER_WILAYAH` | Daftar 16 kecamatan untuk dropdown |
| **Poktan 2026** | Tab per kecamatan (mis. "Pituruh", "Bagelen") | Daftar ±3.242 poktan sesuai kecamatan yang dipilih |
| Baseline (MASTER) | `DATA_PROSPEK` | Data prospek sebagai referensi |
| Baseline (MASTER) | `DATA_SURVEY` | Riwayat survey yang sudah pernah dilakukan |

### Data Tersimpan Ke:
| Spreadsheet / Tempat | Sheet / Folder | Data yang Disimpan |
|---------------------|---------------|-------------------|
| Baseline (MASTER) | `DATA_SURVEY` | Hasil survey lengkap (nama poktan, ketua, luas sawah, jenis alsintan, estimasi harga, koordinat GPS, timestamp) |
| Baseline (MASTER) | `DATA_PROSPEK` | Entri prospek baru — dibuat **otomatis** jika poktan belum pernah diprospek sebelumnya |
| Google Drive | Folder "SIAP ALSINTAN - Foto Survey" | Foto dokumentasi lahan yang diambil Analis |

### Alur:
```
Spreadsheet "Poktan 2026"
  Tab kecamatan pilihan  ──→  Daftar poktan di form

Spreadsheet "Baseline"
  Sheet MASTER_WILAYAH   ──→  Dropdown 16 kecamatan
  Sheet DATA_PROSPEK     ──→  Referensi prospek existing
  Sheet DATA_SURVEY      ──→  Riwayat survey

Analis isi form + ambil GPS + foto

Hasil tersimpan ke:
  ──→  Sheet DATA_SURVEY  (Spreadsheet "Baseline")
  ──→  Sheet DATA_PROSPEK (Spreadsheet "Baseline") ← otomatis jika poktan baru
  ──→  Folder Google Drive "SIAP ALSINTAN - Foto Survey" ← foto lahan
```

---

## 📊 Halaman Monitoring (`/monitoring`)

### Data Diambil Dari:
| Spreadsheet | Sheet | Data yang Diambil |
|-------------|-------|-------------------|
| Baseline (MASTER) | `MASTER_WILAYAH` | Data 16 kecamatan sebagai acuan wilayah |
| Baseline (MASTER) | `DATA_PROSPEK` | Jumlah dan status prospek per kecamatan & per analis |
| Baseline (MASTER) | `MASTER_ANALIS` | Daftar analis beserta wilayah penugasan |
| Baseline (MASTER) | `DATA_SURVEY` | Jumlah survey selesai per analis |

### Data Tersimpan Ke:
> Tidak ada. Halaman ini **hanya menampilkan** data — tidak menyimpan apapun ke spreadsheet.

### Alur:
```
Spreadsheet "Baseline"
  Sheet MASTER_WILAYAH  ──→  Grafik progres per kecamatan
  Sheet DATA_PROSPEK    ──→  Jumlah prospek per analis & kecamatan
  Sheet MASTER_ANALIS   ──→  Tabel daftar analis + KPI
  Sheet DATA_SURVEY     ──→  Jumlah survey selesai per analis

Semua data digabung & dihitung di browser:
  ──→  Grafik progres wilayah
  ──→  Tabel performa analis (conversion rate)
  ──→  Perbandingan potensi vs realisasi lapangan
```

---

## 🗺️ Halaman Peta Potensi (`/peta`)

### Data Diambil Dari:
| Spreadsheet | Sheet | Data yang Diambil |
|-------------|-------|-------------------|
| Baseline (MASTER) | `MASTER_WILAYAH` | Koordinat lat/lng tiap kecamatan, luas lahan, jumlah gapoktan |
| Baseline (MASTER) | `DATA_PROSPEK` | Jumlah prospek per kecamatan (untuk warna prioritas marker) |

### Data Tersimpan Ke:
> Tidak ada. Halaman ini hanya menampilkan data di atas peta.

### Alur:
```
Spreadsheet "Baseline"
  Sheet MASTER_WILAYAH  ──→  Posisi marker di peta (koordinat)
  Sheet DATA_PROSPEK    ──→  Warna marker (merah/kuning/hijau)

Klik marker  ──→  Popup: luas lahan, gapoktan, skor prioritas
```

---

## 🏆 Halaman Prioritas Wilayah (`/prioritas`)

### Data Diambil Dari:
| Spreadsheet | Sheet | Data yang Diambil |
|-------------|-------|-------------------|
| Baseline (MASTER) | `MASTER_WILAYAH` | Luas lahan dan jumlah gapoktan tiap kecamatan |
| Baseline (MASTER) | `DATA_PROSPEK` | Jumlah prospek existing per kecamatan |

### Data Tersimpan Ke:
> Tidak ada. Skor dihitung otomatis di browser, tidak disimpan ke spreadsheet.

### Alur:
```
Spreadsheet "Baseline"
  Sheet MASTER_WILAYAH  ──→  Data luas lahan & gapoktan
  Sheet DATA_PROSPEK    ──→  Data prospek existing

Kalkulasi otomatis di browser:
  Luas Lahan (30%) + Gapoktan (25%) +
  Produksi (25%) + Prospek (20%)
  ──→  Priority Score 0–100
  ──→  Ranking 16 kecamatan
```

---

## 👤 Halaman Analis (`/analis`)

### Data Diambil Dari:
| Spreadsheet | Sheet | Data yang Diambil |
|-------------|-------|-------------------|
| Baseline (MASTER) | `MASTER_ANALIS` | Daftar analis aktif |
| Baseline (MASTER) | `DATA_PROSPEK` | Jumlah prospek tiap analis (untuk KPI) |
| Baseline (MASTER) | `DATA_SURVEY` | Jumlah survey tiap analis (untuk KPI) |
| Baseline (MASTER) | `MASTER_WILAYAH` | Daftar kecamatan untuk pilihan wilayah tugas |

### Data Tersimpan Ke:
| Spreadsheet | Sheet | Data yang Disimpan |
|-------------|-------|-------------------|
| Baseline (MASTER) | `MASTER_ANALIS` | Data analis baru yang ditambahkan Admin |
| Baseline (MASTER) | `MASTER_ANALIS` | Perubahan status aktif/nonaktif analis |

### Alur:
```
Spreadsheet "Baseline"
  Sheet MASTER_ANALIS   ──→  Daftar analis
  Sheet DATA_PROSPEK    ──→  KPI: total prospek per analis
  Sheet DATA_SURVEY     ──→  KPI: total survey per analis
  Sheet MASTER_WILAYAH  ──→  Dropdown wilayah penugasan

Admin tambah/ubah analis
  ──→  Tersimpan ke Sheet MASTER_ANALIS
         di Spreadsheet "Baseline"
```

---

## 🏠 Halaman Dashboard (`/dashboard`)

### Data Diambil Dari:
| Spreadsheet | Sheet | Data yang Diambil |
|-------------|-------|-------------------|
| Baseline (MASTER) | `MASTER_WILAYAH` | Total kecamatan, luas lahan, jumlah gapoktan |
| Baseline (MASTER) | `DATA_PROSPEK` | Jumlah prospek baru, daftar 5 prospek terbaru |
| Baseline (MASTER) | `MASTER_ANALIS` | Jumlah analis aktif |

### Data Tersimpan Ke:
> Tidak ada. Halaman ini hanya menampilkan ringkasan data.

---

## 📂 Halaman Sumber Data (`/sumber-data`)

### Data Diambil Dari:
| Spreadsheet | Sheet / Tab | Data yang Diambil |
|-------------|------------|-------------------|
| Baseline (MASTER) | Semua 8 sheet | Isi mentah database utama |
| Poktan 2026 | 16 tab kecamatan | Data seluruh poktan |
| Produksi Padi Sawah 2025 | Padi Sawah, Produksi, Rekap, Tanam, Panen, Prod | Data produksi padi sawah |
| Produksi Padi Ladang 2025 | Padi Ladang, Produksi, REKAP, Tanam, Panen, Prd | Data produksi padi ladang |
| Produksi Beras 2025 | Sheet1_2 | Data produksi beras |
| Rekap Alsintan s.d. April 2026 | sd april_2026 | Rekap distribusi alsintan |
| Rekap Bulanan SP TP | PS, PL, Jagung, Kedele, Kc. Hijau, Kc. Tanah, Ubi Kayu, Ubi Jalar | Data luas tanam & panen bulanan |

### Data Tersimpan Ke:
> Tidak ada. Semua data bersifat read-only, hanya untuk referensi.

---

## Ringkasan Alur Semua Halaman

```
╔══════════════════════════════════════════════════════════╗
║              SPREADSHEET SUMBER DATA                     ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  "Baseline (MASTER)"          "Poktan 2026"              ║
║  ├─ MASTER_WILAYAH            ├─ Tab Bagelen             ║
║  ├─ MASTER_ANALIS             ├─ Tab Banyuurip           ║
║  ├─ DATA_PROSPEK              ├─ Tab Bayan               ║
║  ├─ DATA_SURVEY               ├─ ... (16 tab)            ║
║  └─ USERS                     └─ Tab Purworejo           ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
         │ Diambil                        │ Diambil
         ▼                                ▼
╔══════════════════════════════════════════════════════════╗
║                   WEBSITE SIAP ALSINTAN                  ║
╠══════════════════════╦═══════════════════════════════════╣
║  HALAMAN PROSPEK     ║  HALAMAN SURVEY                   ║
║  Ambil dari:         ║  Ambil dari:                      ║
║  • MASTER_WILAYAH    ║  • MASTER_WILAYAH                 ║
║  • DATA_PROSPEK      ║  • DATA_PROSPEK                   ║
║  • MASTER_ANALIS     ║  • DATA_SURVEY                    ║
║                      ║  • Poktan 2026 (tab kecamatan)    ║
║  Simpan ke:          ║                                   ║
║  • DATA_PROSPEK ✏️   ║  Simpan ke:                       ║
║                      ║  • DATA_SURVEY ✏️                 ║
╠══════════════════════╣  • DATA_PROSPEK ✏️ (otomatis)     ║
║  HALAMAN MONITORING  ║  • Google Drive ✏️ (foto)         ║
║  Ambil dari:         ╠═══════════════════════════════════╣
║  • MASTER_WILAYAH    ║  HALAMAN DASHBOARD / PETA /       ║
║  • DATA_PROSPEK      ║  PRIORITAS / ANALIS               ║
║  • MASTER_ANALIS     ║  Ambil dari:                      ║
║  • DATA_SURVEY       ║  • MASTER_WILAYAH                 ║
║                      ║  • DATA_PROSPEK                   ║
║  Tidak menyimpan     ║  • MASTER_ANALIS                  ║
║  apapun              ║  • DATA_SURVEY                    ║
║                      ║                                   ║
║                      ║  Tidak menyimpan apapun           ║
╚══════════════════════╩═══════════════════════════════════╝
```

---

## Kesimpulan

Dari 9 halaman website, **hanya 3 halaman yang menyimpan data** ke spreadsheet:

| Halaman | Menyimpan Ke | Keterangan |
|---------|-------------|------------|
| **Prospek** | `DATA_PROSPEK` | Entri prospek baru dari Analis |
| **Survey** | `DATA_SURVEY` | Hasil survey lapangan + GPS + foto |
| **Survey** (otomatis) | `DATA_PROSPEK` | Prospek auto-create untuk poktan yang belum terdaftar |
| **Analis** | `MASTER_ANALIS` | Data analis baru / perubahan status |

Halaman lainnya (Dashboard, Peta, Prioritas, Monitoring, Sumber Data, Pengaturan) **hanya membaca** data — tidak mengubah apapun di spreadsheet.

---

*SIAP ALSINTAN · Kabupaten Purworejo · 28 September 2026*
