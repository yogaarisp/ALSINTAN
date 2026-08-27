# DATA MAPPING & SCHEMA DICTIONARY — SIAP ALSINTAN (Fase 1)

> **Status:** Adaptable to existing Google Spreadsheet columns.
> *Catatan: Jangan mengubah header spreadsheet existing tanpa persetujuan stakeholder.*

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
Data pipeline prospek alsintan yang dicatat AO.

| Kolom App | Header Spreadsheet | Tipe Data | Keterangan |
|-----------|--------------------|-----------|------------|
| `idProspek` | ID_PROSPEK | String | ID unik prospek (contoh: P001) |
| `idKecamatan` | ID_KECAMATAN | String | Referensi ke Master Wilayah |
| `kecamatan` | KECAMATAN | String | Nama kecamatan |
| `namaGapoktan` | NAMA_GAPOKTAN | String | Nama kelompok tani |
| `komoditas` | KOMODITAS | String | Komoditas utama |
| `idAO` | ID_AO | String | ID Account Officer |
| `namaAO` | NAMA_AO | String | Nama Account Officer penanggung jawab |
| `status` | STATUS | String | Enum: BARU, DALAM_PROSPEK, SURVEY, POTENSIAL, TIDAK_POTENSIAL, CLOSING |
| `tanggal` | TANGGAL | Date / String | Tanggal registrasi (YYYY-MM-DD) |
| `estimasiKebutuhan`| ESTIMASI_ALSINTAN | String | Jenis & jumlah alat yang dibutuhkan |
| `catatan` | CATATAN | String | Catatan keterangan prospek |

---

## 3. Sheet: `DATA_SURVEY`
Data hasil survey verifikasi lapangan aktual oleh AO.

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
| `idAO` | ID_AO | String | AO surveyor |
| `timestamp` | TIMESTAMP | ISO String | Waktu pelaksanaan survey |
| `status` | STATUS | String | Status survey |
