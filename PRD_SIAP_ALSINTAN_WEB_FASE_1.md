# PRD --- SIAP ALSINTAN Web

## Fase 1 --- Website Baru dengan Google Spreadsheet sebagai Data Source

**Versi:** 1.1\
**Status:** Development Ready\
**Platform:** Web Responsive / PWA Ready\
**Data Source Fase 1:** Google Spreadsheet\
**Middleware:** Google Apps Script\
**Database Lokal Fase 1:** Tidak digunakan\
**Tujuan Utama:** Pemetaan potensi wilayah dan penentuan prioritas
wilayah prospek alsintan

------------------------------------------------------------------------

## 1. Overview

SIAP ALSINTAN Web adalah aplikasi web untuk menggantikan Google Sites
sebagai portal utama sistem SIAP ALSINTAN.

Fungsi utama sistem bukan hanya menampilkan data, tetapi membantu
manajemen dan AO menentukan **wilayah mana yang paling potensial dan
harus diprioritaskan untuk diprospek**.

Pada Fase 1 tidak dilakukan migrasi database ke MySQL. Google
Spreadsheet tetap menjadi **source of truth**, sedangkan Google Apps
Script menjadi middleware/API.

Website menjadi frontend utama yang menyatukan dashboard, peta potensi,
ranking prioritas wilayah, dashboard AO, prospek, survey, monitoring,
dan reporting.

------------------------------------------------------------------------

## 2. Latar Belakang

Sistem existing memanfaatkan Google Sites, Google Spreadsheet, Google
Forms, Google Maps, Google Looker Studio, dan Google Apps Script.

Website baru menggantikan Google Sites dengan aplikasi web yang lebih
fleksibel, modern, responsive, dan siap dikembangkan menjadi aplikasi
penuh.

Untuk mempercepat implementasi dan mengurangi risiko, data existing
tidak langsung dimigrasikan ke database baru. Google Spreadsheet tetap
dipertahankan sebagai pusat data pada Fase 1.

------------------------------------------------------------------------

## 3. Tujuan Sistem

### Tujuan Utama

Membangun sistem pemetaan dan monitoring yang membantu menentukan
**wilayah prioritas untuk prospek alsintan** berdasarkan data wilayah
dan data aktual lapangan.

### Tujuan Khusus

-   Menggantikan Google Sites dengan website sendiri.
-   Menampilkan data potensi wilayah pada peta.
-   Mengolah data wilayah dari Dinas Pertanian.
-   Menampilkan luas lahan per kecamatan.
-   Menampilkan data panen/produksi per wilayah.
-   Menampilkan jumlah Gapoktan per kecamatan.
-   Menampilkan komoditas per wilayah.
-   Menentukan ranking/skor prioritas wilayah.
-   Membantu AO menentukan wilayah yang harus diprospek terlebih dahulu.
-   Mencatat hasil prospek dan survey AO.
-   Membandingkan potensi awal dengan kondisi aktual lapangan.
-   Mempertahankan Google Spreadsheet sebagai source of truth pada Fase
    1.
-   Menyiapkan arsitektur untuk migrasi MySQL pada fase berikutnya.

------------------------------------------------------------------------

## 4. Konsep Data Utama

### 4.1 Data Potensi Wilayah --- Dinas Pertanian

Menjadi baseline/master potensi wilayah.

Contoh: - Kecamatan - Luas lahan - Data panen/produksi - Komoditas -
Jumlah Gapoktan - Informasi potensi lainnya

### 4.2 Data Aktual Lapangan --- AO

Berasal dari aktivitas prospek dan survey AO.

Contoh: - Nama Gapoktan - Jumlah anggota - Luas lahan hasil survey -
Komoditas - Jenis alsintan - Estimasi kebutuhan - Estimasi harga -
Foto - GPS - Catatan - Status prospek - AO - Waktu survey

### 4.3 Hubungan Data

``` text
DATA DINAS PERTANIAN
        ↓
ANALISIS POTENSI WILAYAH
        ↓
RANKING PRIORITAS
        ↓
REKOMENDASI WILAYAH PROSPEK
        ↓
AO
        ↓
PROSPEK
        ↓
SURVEY LAPANGAN
        ↓
DATA AKTUAL
        ↓
EVALUASI / MONITORING
```

------------------------------------------------------------------------

## 5. Prioritas Wilayah

Sistem harus menjawab:

> Wilayah mana yang paling layak diprioritaskan untuk prospek alsintan?

Indikator dapat meliputi: - Luas lahan - Data panen/produksi - Jumlah
Gapoktan - Komoditas - Potensi kebutuhan alsintan - Jumlah prospek
existing - Hasil survey AO

### Priority Score

Sistem disiapkan menghasilkan skor prioritas.

Contoh tampilan:

``` text
Kecamatan X
Luas Lahan             1.250 Ha
Jumlah Gapoktan          32
Produksi/Panen         Tinggi
Kebutuhan Alsintan     Tinggi
Prospek Existing        Rendah

Priority Score          92/100
Prioritas               TINGGI
```

**Formula dan bobot final wajib mengikuti aturan stakeholder; jangan
membuat bobot secara asumsi.**

Kategori minimal: - Prioritas Tinggi - Prioritas Sedang - Prioritas
Rendah

------------------------------------------------------------------------

## 6. Scope Fase 1

### A. Website / Portal

Menggantikan fungsi Google Sites.

### B. Dashboard Home

Menampilkan: - Outstanding Kredit - Prospek Baru - AO Aktif - Conversion
Rate - Total Kecamatan - Total Gapoktan - Total Luas Lahan - Ringkasan
wilayah prioritas - Grafik perkembangan - Ringkasan aktivitas

KPI yang tidak tersedia pada Spreadsheet existing harus dikonfirmasi
terlebih dahulu.

### C. Peta Potensi Wilayah

Menampilkan: - Kecamatan - Luas lahan - Produksi/panen - Jumlah
Gapoktan - Komoditas - Priority Score - Status prioritas - Data
prospek - Data survey

Visualisasi dapat menggunakan choropleth, marker, heatmap, dan detail
panel.

### D. Ranking Prioritas Wilayah

Tabel minimal: - Ranking - Kecamatan - Luas Lahan - Jumlah Gapoktan -
Produksi/Panen - Priority Score - Level Prioritas

### E. Dashboard AO

AO dapat melihat: - Wilayah prioritas - Prospek miliknya - Status
prospek - Survey belum dilakukan - Survey selesai - Detail prospek -
Rekomendasi wilayah - Tombol survey

### F. Data Prospek

Minimal: - ID Prospek - Kecamatan - Nama Gapoktan - Komoditas - AO -
Status - Tanggal - Estimasi kebutuhan - Catatan

### G. Survey

Mode A --- Existing: Website mengarahkan pengguna ke Google Form.

Mode B --- Web Form: Website menyediakan form sendiri dan mengirimkan
hasil melalui Google Apps Script ke Spreadsheet.

Field minimal: - Nama Gapoktan - Jumlah Anggota - Luas Sawah - Jenis
Alsintan - Estimasi Harga - Foto - Lokasi GPS - Catatan

### H. Dashboard Manajemen

Menampilkan: - Outstanding Kredit - Progress AO - Peta prioritas -
Heatmap - Grafik - Target vs Realisasi - Top Kecamatan - Top Komoditas -
Prospek per wilayah - Survey per wilayah

------------------------------------------------------------------------

## 7. User Roles

### Admin

Akses: - Dashboard - Peta - Data wilayah - Data AO - Data prospek - Data
survey - Monitoring - Reporting - Konfigurasi - Integrasi

### AO

Akses: - Dashboard AO - Wilayah prioritas - Prospek - Detail prospek -
Survey - Update status survey - Hasil survey miliknya

### Manajemen

Akses: - Dashboard - KPI - Peta - Ranking wilayah - Monitoring AO -
Grafik - Target vs Realisasi - Reporting

------------------------------------------------------------------------

## 8. Arsitektur Sistem Fase 1

``` text
┌──────────────────────────────────┐
│        SIAP ALSINTAN WEB         │
│                                  │
│ Dashboard                        │
│ Peta Potensi                     │
│ Ranking Prioritas                │
│ Dashboard AO                     │
│ Prospek                          │
│ Survey                           │
│ Reporting                        │
└────────────────┬─────────────────┘
                 │
                 │ HTTP / API
                 ▼
┌──────────────────────────────────┐
│       GOOGLE APPS SCRIPT         │
│          Middleware/API          │
└────────────────┬─────────────────┘
                 │
                 ▼
┌──────────────────────────────────┐
│        GOOGLE SPREADSHEET        │
│                                  │
│ MASTER WILAYAH                   │
│ MASTER KOMODITAS                 │
│ MASTER AO                        │
│ DATA PROSPEK                     │
│ DATA SURVEY                      │
│ DATA POTENSI                     │
│ HASIL ANALISIS                   │
└──────────────────────────────────┘
```

Website tidak mengakses Spreadsheet secara langsung jika dapat
dihindari.

------------------------------------------------------------------------

## 9. Struktur Data Spreadsheet

Struktur final harus menyesuaikan Spreadsheet existing.

### MASTER_WILAYAH

-   ID Kecamatan
-   Kecamatan
-   Kabupaten/Kota
-   Luas Lahan
-   Data Panen/Produksi
-   Jumlah Gapoktan
-   Komoditas
-   Data pendukung lainnya

### MASTER_KOMODITAS

-   ID Komoditas
-   Nama Komoditas
-   Keterangan

### MASTER_AO

-   ID AO
-   Nama AO
-   Wilayah
-   Status
-   Informasi lainnya

### DATA_PROSPEK

-   ID Prospek
-   ID Kecamatan
-   Nama Gapoktan
-   Komoditas
-   AO
-   Status
-   Tanggal
-   Estimasi kebutuhan
-   Catatan

### DATA_SURVEY

-   ID Survey
-   ID Prospek
-   Nama Gapoktan
-   Jumlah Anggota
-   Luas Sawah
-   Jenis Alsintan
-   Estimasi Harga
-   Foto
-   Latitude
-   Longitude
-   Accuracy
-   Catatan
-   AO
-   Timestamp
-   Status

### HASIL_ANALISIS

Dapat menyimpan: - Kecamatan - Score - Level Prioritas - Ranking -
Parameter analisis - Timestamp perhitungan

**Jangan menghapus, memindahkan, atau mengubah struktur Spreadsheet
existing tanpa persetujuan.**

------------------------------------------------------------------------

## 10. API / Google Apps Script

Endpoint minimal:

``` text
GET /dashboard
GET /wilayah
GET /wilayah/{id}
GET /wilayah/prioritas
GET /map
GET /ao
GET /prospek
GET /prospek/{id}
GET /survey
GET /kpi
```

Write operation:

``` text
POST /prospek
POST /survey
PUT /prospek/{id}
PUT /survey/{id}
```

Endpoint final menyesuaikan implementasi Apps Script.

------------------------------------------------------------------------

## 11. Peta

Gunakan library web map seperti Leaflet.

Fitur: - Zoom - Pan - Marker - Popup/detail - Filter - Layer wilayah -
Choropleth - Heatmap jika diperlukan

Filter minimal: - Kecamatan - Komoditas - AO - Prioritas - Status
prospek

Klik wilayah menampilkan: - Kecamatan - Luas Lahan - Produksi/Panen -
Jumlah Gapoktan - Komoditas - Priority Score - Level Prioritas - Jumlah
Prospek - Jumlah Survey - AO

------------------------------------------------------------------------

## 12. Dashboard AO

Contoh:

``` text
Halo, Budi

Wilayah Prioritas       8
Prospek Saya           24
Survey Selesai         18
Menunggu Survey         6
```

AO dapat melihat rekomendasi wilayah:

``` text
#1 Kecamatan A
Priority Score: 92
Gapoktan: 32
Luas Lahan: 1.250 Ha

[LIHAT WILAYAH]
```

AO kemudian dapat membuat atau membuka prospek dari wilayah tersebut.

------------------------------------------------------------------------

## 13. Survey dan GPS

Form harus mobile-first.

GPS menggunakan Geolocation API jika browser memberikan izin.

Data GPS: - Latitude - Longitude - Accuracy

Foto dapat diambil/upload melalui smartphone.

Foto disimpan menggunakan mekanisme storage yang disepakati. Pada Fase 1
dapat tetap menggunakan ekosistem Google jika diperlukan.

------------------------------------------------------------------------

## 14. Status Prospek

Minimal: - Baru - Dalam Prospek - Survey - Potensial - Tidak Potensial -
Closing

Status final harus mengikuti workflow existing/stakeholder.

## Status Survey

Minimal: - Belum Survey - Survey Berjalan - Survey Selesai -
Diverifikasi

Status final harus mengikuti workflow existing/stakeholder.

------------------------------------------------------------------------

## 15. UI/UX

Desain: - Modern - Professional - Clean - Responsive - Mobile-first -
Mudah digunakan - Tidak menyerupai Google Sites - Fokus pada informasi
dan pengambilan keputusan

Desktop sidebar:

``` text
Dashboard
Peta Potensi
Prioritas Wilayah
Prospek
Survey
AO
Monitoring
Reporting
Pengaturan
```

Mobile:

``` text
Home | Peta | Prioritas | Prospek | Profil
```

------------------------------------------------------------------------

## 16. Security

Website wajib: - HTTPS - Authentication - Role-based access - Input
validation - Permission validation - Activity logging untuk aktivitas
penting - Credential tidak berada di frontend - API configuration
disimpan secara aman

Credential Google dan konfigurasi Apps Script tidak boleh diekspos
secara tidak perlu.

------------------------------------------------------------------------

## 17. Performance

Target: - Dashboard cepat. - Request API efisien. - Caching untuk data
yang tidak membutuhkan update setiap detik. - Pagination untuk
prospek/survey. - Peta tidak memuat data berlebihan sekaligus. -
Filtering efisien.

------------------------------------------------------------------------

## 18. PWA

Fase 1: **PWA Ready**

Prioritas: - Responsive - Installable - Mobile-friendly

Offline penuh bukan requirement utama Fase 1.

Offline survey dapat menjadi pengembangan fase berikutnya.

------------------------------------------------------------------------

## 19. Reporting

Fase 1: - Google Spreadsheet tetap digunakan untuk pengolahan data. -
Google Looker Studio tetap dapat digunakan untuk reporting existing. -
Website menyediakan dashboard dan visualisasi utama.

Tidak perlu mengganti seluruh reporting existing sekaligus.

------------------------------------------------------------------------

## 20. Integrasi Existing

-   Google Spreadsheet → source of truth
-   Google Apps Script → middleware/API
-   Google Forms → tetap digunakan selama masa transisi
-   Google Looker Studio → tetap digunakan untuk reporting existing
-   Google Maps → dapat dipertahankan apabila masih diperlukan

------------------------------------------------------------------------

## 21. Alur Bisnis Utama

### Menentukan Wilayah Prioritas

``` text
Data Dinas Pertanian
        ↓
Data Kecamatan
        ↓
Luas Lahan
Panen/Produksi
Jumlah Gapoktan
Komoditas
        ↓
Analisis Potensi
        ↓
Priority Score
        ↓
Ranking Wilayah
        ↓
Rekomendasi Prospek
```

### AO Melakukan Prospek

``` text
AO
 ↓
Lihat Wilayah Prioritas
 ↓
Pilih Kecamatan
 ↓
Lihat Gapoktan / Potensi
 ↓
Buat Prospek
 ↓
Survey
 ↓
Data Lapangan
 ↓
Spreadsheet
```

### Monitoring

``` text
Data Wilayah + Data Prospek + Data Survey
                    ↓
                Dashboard
                    ↓
       Peta | KPI | Ranking | AO | Report
```

------------------------------------------------------------------------

## 22. Fase Pengembangan

### Phase 1A --- Foundation

-   Setup project
-   Hosting
-   Domain/subdomain
-   Authentication
-   Role
-   Layout
-   Sidebar
-   Mobile navigation

### Phase 1B --- Integrasi Spreadsheet

-   Audit Spreadsheet existing
-   Identifikasi sheet
-   Identifikasi kolom
-   Apps Script API
-   Read data
-   Error handling

### Phase 1C --- Dashboard

-   KPI
-   Grafik
-   Summary
-   Data wilayah
-   Data prospek
-   Data AO

### Phase 1D --- Peta & Prioritas

-   Peta wilayah
-   Layer kecamatan
-   Data luas lahan
-   Data panen/produksi
-   Data Gapoktan
-   Komoditas
-   Priority Score
-   Ranking
-   Filter
-   Detail wilayah

### Phase 1E --- AO

-   Dashboard AO
-   Daftar prospek
-   Wilayah rekomendasi
-   Detail prospek
-   Status prospek

### Phase 1F --- Survey

Tahap awal:

``` text
Website → Google Form
```

Tahap lanjutan:

``` text
Website → Web Form → Apps Script → Spreadsheet
```

### Phase 1G --- Reporting

-   Dashboard management
-   Target vs realisasi
-   Top kecamatan
-   Top komoditas
-   Monitoring AO
-   Perbandingan potensi dan aktual

------------------------------------------------------------------------

## 23. Acceptance Criteria

-   [ ] Website dapat diakses melalui domain.
-   [ ] Login berjalan.
-   [ ] Role Admin, AO, dan Manajemen dapat dibedakan.
-   [ ] Website dapat membaca data Spreadsheet.
-   [ ] Data Dinas Pertanian dapat ditampilkan berdasarkan kecamatan.
-   [ ] Luas lahan dapat ditampilkan.
-   [ ] Data panen/produksi dapat ditampilkan jika tersedia.
-   [ ] Jumlah Gapoktan dapat ditampilkan.
-   [ ] Komoditas dapat ditampilkan.
-   [ ] Peta wilayah dapat ditampilkan.
-   [ ] Ranking prioritas wilayah dapat ditampilkan.
-   [ ] Priority Score dapat dihitung sesuai formula yang disepakati.
-   [ ] AO dapat melihat wilayah prioritas.
-   [ ] AO dapat melihat prospeknya.
-   [ ] AO dapat melakukan/membuka survey.
-   [ ] Survey dapat masuk ke Spreadsheet.
-   [ ] Data baru dapat muncul pada dashboard.
-   [ ] Website responsive desktop dan smartphone.
-   [ ] Spreadsheet existing tidak rusak.
-   [ ] Workflow existing tetap berjalan.
-   [ ] Credential Google tidak terekspos ke frontend.
-   [ ] Arsitektur siap untuk migrasi MySQL.

------------------------------------------------------------------------

## 24. Batasan Fase 1

Fase 1 tidak mencakup: - Migrasi database ke MySQL. - Penghapusan Google
Spreadsheet. - Penghapusan Google Apps Script secara keseluruhan. -
Penghapusan Looker Studio secara keseluruhan. - Offline penuh. -
Perhitungan Priority Score dengan bobot yang belum disepakati. -
Perubahan struktur data existing tanpa persetujuan.

------------------------------------------------------------------------

## 25. Future Phase --- Migrasi Database

Jika sistem sudah stabil:

``` text
Google Spreadsheet
        ↓
Data Migration
        ↓
MySQL / MariaDB
        ↓
REST API
        ↓
SIAP ALSINTAN Web
```

Pada fase tersebut: - MySQL menjadi source of truth. - Spreadsheet
menjadi reporting/export. - Apps Script dapat dikurangi. - Google Forms
dapat dihentikan. - Reporting dapat dipindahkan ke dashboard native.

Frontend harus dirancang agar migrasi data source tidak membutuhkan
pembangunan ulang dari awal.

------------------------------------------------------------------------

## 26. Prinsip Pengembangan

**Jangan over-engineering pada Fase 1.**

Prioritas: 1. Pertahankan sistem existing. 2. Ganti Google Sites dengan
website sendiri. 3. Pertahankan Spreadsheet sebagai source of truth. 4.
Integrasikan Apps Script sebagai API. 5. Tampilkan data Dinas Pertanian
sebagai baseline potensi wilayah. 6. Buat pemetaan dan ranking prioritas
wilayah. 7. Bantu AO menentukan wilayah prospek. 8. Catat data aktual
dari prospek/survey. 9. Bandingkan potensi wilayah dengan hasil
lapangan. 10. Siapkan arsitektur untuk migrasi MySQL.

------------------------------------------------------------------------

## 27. Target Akhir Fase 1

Pengguna cukup mengakses satu aplikasi SIAP ALSINTAN Web:

``` text
Data Wilayah
    ↓
Peta Potensi
    ↓
Ranking Prioritas
    ↓
Penentuan Wilayah Prospek
    ↓
AO
    ↓
Survey Lapangan
    ↓
Google Spreadsheet
    ↓
Dashboard Terupdate
```

Di belakang layar:

``` text
SIAP ALSINTAN WEB
        ↓
GOOGLE APPS SCRIPT
        ↓
GOOGLE SPREADSHEET
```

Pendekatan ini mempertahankan sistem existing, mempercepat pengembangan,
mengurangi risiko, dan tetap membuka jalan menuju database sendiri pada
fase berikutnya.
