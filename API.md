# API REFERENCE — SIAP ALSINTAN (Fase 1)

Komunikasi antara Frontend Web dan Google Apps Script Middleware menggunakan HTTP GET/POST dengan parameter `action`.

Base URL: `VITE_GAS_API_URL` (Contoh: `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`)

## Daftar Action

| Action | Method |since deploy |
|---|---|---|
| `ping` | GET | awal |
| `getDashboardKPI` | GET | awal |
| `getWilayah` | GET | awal |
| `getProspek` | GET | awal |
| `getAnalis` | GET | awal |
| `getSurvey` | GET | awal |
| `getSources` | GET | awal |
| `getSourceData` | GET | awal |
| `createProspek` | POST | awal |
| `createSurvey` | POST | awal |
| `createAnalis` | POST | awal |
| `updateAnalisStatus` | POST | awal |
| `authCheck` | POST | awal |
| `getPoktan` | GET | **2026-09-29** |
| `updateProspek` | POST | **2026-09-29** |
| `deleteProspek` | POST | **2026-09-29** |
| `restoreProspek` | POST | **2026-09-29** |

Action yang ditandai **2026-09-29** hanya tersedia setelah `Code.gs` versi
terbaru dideploy sebagai **New version**. Tanpa itu, `getSourceData` (fallback
baca Master Poktan) tetap bekerja, tapi `createSurvey` akan menolak ID Poktan
dan tombol submit di `/survey` sengaja diblokir supaya data lapangan tidak
hilang.

---

## 1. Dashboard & KPI
- **Method**: `GET`
- **Action**: `getDashboardKPI`
- **Response**:
```json
{
  "success": true,
  "data": {
    "totalKecamatan": 8,
    "totalGapoktan": 229,
    "totalLuasLahan": 18090,
    "prospekBaru": 8,
    "analisAktif": 3
  }
}
```

---

## 2. Master Wilayah
- **Method**: `GET`
- **Action**: `getWilayah`
- **Query Params**: `kabupaten`, `kecamatan`
- **Response**:
```json
{
  "success": true,
  "data": [
    {
      "idKecamatan": "W001",
      "kecamatan": "Cikampek",
      "kabupaten": "Karawang",
      "luasLahan": 3250,
      "dataPanen": 8200,
      "jumlahGapoktan": 42,
      "komoditas": ["Padi", "Jagung"],
      "koordinatLat": -6.4123,
      "koordinatLng": 107.4567
    }
  ]
}
```

---

## 3. Data Prospek
- **Method**: `GET`
- **Action**: `getProspek`
- **Query Params**: `status`, `idAnalis`, `kecamatan`, `page`, `limit`
- **Method**: `POST`
- **Action**: `createProspek`
> `ID_PROSPEK` punya dua sumber: nomor urut manual (`P001`, `P002`, ...) dan ID Poktan
> numerik dari Master Poktan 2026 (mis. `5107401`) yang dibuat otomatis saat
> poktan tersebut pertama kali disurvei. Keduanya unik.
> Nama poktan dikirim lewat field `namaGapoktan` (nama kolom sheet tidak diubah,
> jadi baris lama tetap terbaca) — isinya adalah **nama poktan**, bukan gapoktan.
- **Body**:
```json
{
  "idKecamatan": "W001",
  "namaGapoktan": "Poktan Maju Bersama",
  "komoditas": "Padi",
  "estimasiKebutuhan": "Combine Harvester 2 unit",
  "catatan": "Akses jalan bagus",
  "idAnalis": "AN001",
  "namaAnalis": "Budi Santoso"
}
```
> `idAnalis` opsional. Kalau tidak dikirim, backend jatuh ke `AN001`. Frontend
> mengirimnya otomatis dari sesi login kalau pengguna berperan `ANALIS`.

- **Method**: `POST`
- **Action**: `updateProspek`

Ubah isi satu prospek. Field yang tidak dikirim tidak disentuh sama sekali.
`ID_PROSPEK`, `ID_KECAMATAN`, `KECAMATAN`, dan `TANGGAL` **tidak bisa diubah**:
ID jadi kunci relasi ke `DATA_SURVEY`, sedangkan kecamatan dan tanggal adalah
jejak registrasi awal.

| Field | Kolom sheet | Keterangan |
|---|---|---|
| `idProspek` | `ID_PROSPEK` | Wajib, sebagai kunci baris |
| `namaGapoktan` | `NAMA_GAPOKTAN` | |
| `komoditas` | `KOMODITAS` | |
| `status` | `STATUS` | Harus salah satu dari `STATUS_PROSPEK`, selain itu ditolak |
| `idAnalis` | `ID_ANALIS` + `NAMA_ANALIS` | `NAMA_ANALIS` diambil otomatis dari `MASTER_ANALIS`; analis nonaktif ditolak |
| `estimasiKebutuhan` | `ESTIMASI_ALSINTAN` | |
| `catatan` | `CATATAN` | Mengganti seluruh isi, bukan menambahkan |

- **Method**: `POST`
- **Action**: `deleteProspek`

**Soft delete.** Barisnya tetap ada di sheet; yang berubah hanya:

- `STATUS` → `TIDAK_POTENSIAL`
- `CATATAN` → ditambahkan penanda `Dinonaktifkan <tanggal> — <alasan>`

Alasannya: baris di `DATA_SURVEY` mereferensikan `ID_PROSPEK`, jadi menghapus
baris induknya membuat data lapangan yatim dan KPI/monitoring ikut rusak.

```json
{ "idProspek": "5107401", "alasan": "Lahan tidak bisa dikunjungi" }
```

Respons:

```json
{
  "ok": true,
  "sudahNonaktif": false,
  "jumlahSurvey": 2,
  "prospek": { "...": "DataProspek" }
}
```

`sudahNonaktif: true` berarti baris sudah `TIDAK_POTENSIAL` sebelumnya, jadi
tidak ada yang ditulis ulang (pemanggilan idempoten). `jumlahSurvey` dipakai
frontend untuk memberi tahu Analis bahwa data lapangan tetap aman.

> Penting: status `TIDAK_POTENSIAL` bisa juga dipilih manual di pipeline tanpa
> lewat `deleteProspek`. Frontend membedakannya lewat penanda `Dinonaktifkan`
> di `CATATAN` — hanya baris bertanda itu yang menampilkan tombol
> "Aktifkan Kembali".

- **Method**: `POST`
- **Action**: `restoreProspek`

Membatalkan `deleteProspek`: status dikembalikan (default `BARU`) dan penanda
`Dinonaktifkan` dibuang dari ujung `CATATAN`.

```json
{ "idProspek": "5107401", "status": "BARU" }
```

---

## 4. Data Survey Lapangan
- **Method**: `POST`
- **Action**: `createSurvey`
- **Body**:
```json
{
  "idProspek": "P001",
  "namaGapoktan": "Poktan Maju Bersama",
  "namaKetua": "Budi Santoso",
  "jumlahAnggota": 85,
  "luasSawah": 320,
  "jenisAlsintan": "Combine Harvester",
  "estimasiHarga": 850000000,
  "latitude": -6.4123,
  "longitude": 107.4567,
  "accuracy": 5,
  "catatan": "Verifikasi luas sawah akurat"
}
```

> **`namaKetua` opsional.** Diisi otomatis dari kolom `Nama Ketua` Master
> Poktan 2026 dan disimpan ke kolom baru `NAMA_KETUA` di `DATA_SURVEY` (kolom
> Q, ditambahkan di posisi terakhir supaya kolom A–P tidak bergeser). 13 dari
> 3.242 poktan tidak punya ketua di master, jadi field ini tidak diwajibkan.
> `jumlahAnggota` tetap wajib minimal 1: 621 poktan tercatat `0` di master dan
> angka itu dikosongkan di form agar Analis mengisi hasil hitung lapangan.

> **`idProspek` boleh berisi ID Poktan.** Form Survey mengirim `idProspek` berisi
> ID Poktan dari Master Poktan 2026 (mis. `"5107401"`), bukan hanya nomor urut
> `P001`. Kalau ID tersebut belum ada di `DATA_PROSPEK`, backend mencocokkannya
> ke Master Poktan 2026 dan **mendaftarkan baris prospek otomatis** dengan
> `ID_PROSPEK` = ID Poktan, supaya KPI, monitoring, dan hitungan prospek per
> Analis ikut terhitung. Idempoten — survey berikutnya untuk poktan yang sama
> memakai baris yang sudah ada. Jika ID tidak dikenal di kedua sumber, action
> tetap gagal dengan pesan `idProspek tidak dikenal`.

---

## 5. Master Analis
- **Method**: `GET`
- **Action**: `getAnalis`
- **Response**:
```json
{
  "success": true,
  "data": [
    {
      "idAnalis": "AN001",
      "namaAnalis": "Budi Santoso",
      "wilayah": ["Purworejo"],
      "status": "AKTIF",
      "email": "budi@siap-alsintan.id",
      "totalProspek": 12,
      "totalSurvey": 8
    }
  ]
}
```
- **Method**: `POST`
- **Action**: `createAnalis`
- **Body**:
```json
{
  "namaAnalis": "Budi Santoso",
  "email": "budi@siap-alsintan.id",
  "wilayah": ["Purworejo"],
  "status": "AKTIF"
}
```
- **Method**: `POST`
- **Action**: `updateAnalisStatus`
- **Body**: `{ "idAnalis": "AN001", "status": "TIDAK_AKTIF" }`

> Action lama `getAO` / `createAO` / `updateAOStatus` masih dilayani sebagai alias.

---

## 6. Sumber Data (Spreadsheet Sumber Lain — Read-only)
- **Method**: `GET`
- **Action**: `getSources`
- **Response**: daftar spreadsheet sumber (Poktan, Produksi, Rekap) + daftar tab (`nama`, `baris`, `kolom`) + `url` + `status`
- **Method**: `GET`
- **Action**: `getSourceData`
- **Query Params**: `key` (mis. `poktan`), `tab` (nama tab), `q` (pencarian opsional), `page`, `limit` (default 200, max 2000)
- **Response**:
```json
{
  "success": true,
  "data": {
    "sumber": { "key": "poktan", "nama": "Poktan 2026" },
    "tab": "Ngombol",
    "header": ["NO", "NAMA GAPOKTAN", "..."],
    "rows": [["1", "Gapoktan X", "..."]],
    "total": 240,
    "page": 1,
    "limit": 200,
    "totalPages": 2,
    "updatedAt": "2026-09-12T12:00:00.000Z"
  }
}
```

---

## 7. Master Poktan (Poktan 2026)
Daftar kelompok tani per kecamatan, sudah dinormalisasi (dipakai form Survey untuk
memilih gapoktan sesuai kecamatan).

- **Method**: `GET`
- **Action**: `getPoktan`
- **Query Params**:
  | Param | Keterangan |
  |---|---|
  | `kecamatan` | Nama kecamatan. Tanpa param = seluruh 16 kecamatan (3.242 poktan). Cocokkan tidak membedakan huruf besar/kecil (`PURWODADI` = `Purwodadi`) |
  | `q` | Pencarian di nama poktan / desa / ketua / alamat / ID Poktan |
  | `page`, `limit` | Default `limit` 500, max 1000 |
  | `idPoktan` | Lookup satu poktan; mengembalikan objek tunggal (bukan daftar) |
- **Response**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "idPoktan": "5105498",
        "namaPoktan": "Berkah Tani Milenial",
        "jumlahAnggota": 9,
        "desa": "GIRIGONDO",
        "ketua": "Eko Retno Purwanto",
        "alamat": "Dusun Kaligoro RT 02 RW 05",
        "kecamatan": "Pituruh"
      }
    ],
    "total": 310,
    "page": 1,
    "limit": 500,
    "totalPages": 1,
    "kecamatan": ["Bagelen", "Banyuurip", "..."],
    "updatedAt": "2026-09-27T04:00:00.000Z"
  }
}
```

**Catatan implementasi**
- Sumber: spreadsheet `Poktan 2026` (`SOURCES` key `poktan`), dibaca read-only.
- 16 tab = 16 kecamatan. Baris 1 = judul, baris 2 = header, data mulai baris 3
  (tab `Pituruh` punya header di baris 3 — posisi header dideteksi otomatis).
- Sel `Nama Poktan` pada file sumber tidak bersih: nama poktan berada di awal sel,
  disusul label UI eksportir (`Tambah Anggota`, `Ubah`, `Hapus`, ...) setelah
  rentetan spasi panjang. Nama diambil dari segmen pertama.
- ID Poktan dan Jumlah Anggota disimpan sebagai angka; dibulatkan agar tidak
  muncul `5098431.0`.
- Hasil per kecamatan di-cache di `CacheService` (TTL 6 jam, satu key per tab).
  `ID_PROSPEK` pada `DATA_PROSPEK` boleh berisi ID Poktan numerik
  (mis. `5107401`) — `nextId` sudah difilter berdasarkan prefix agar nomor urut
  `P001`, `P002`, ... tidak tergeser.
- **Jalur baca cadangan (frontend):** kalau `getPoktan` belum ada di deployment
  aktif, `src/lib/api/poktan.ts` otomatis jatuh ke action `getSourceData`
  (`key=poktan&tab=<KECAMATAN>&limit=2000`) yang sudah ada sejak awal, lalu
  membersihkan sel di sisi klien. `getSheetByName()` tidak membedakan huruf
  besar/kecil, jadi `tab=PITURUH` tetap ketemu tab `Pituruh`. Hasil fallback
  disimpan ke localStorage dengan bentuk identik, jadi transparan bagi UI.
  Konsekuensinya: tidak ada cache di GAS (lebih lambat, ±3 detik per kecamatan).
