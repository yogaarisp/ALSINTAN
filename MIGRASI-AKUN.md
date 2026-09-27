# MIGRASI AKUN GOOGLE — SIAP ALSINTAN

> Tujuan: pindahkan seluruh sistem ke akun `siapalsintan.tyas@gmail.com`
> Target: semua file milik akun baru, tidak bergantung akun lama yang tidak bisa diakses.

## Kenapa plan ini (bukan sekadar ganti URL Apps Script)

Akun lama `yokbisasemarang@gmail.com` **tidak bisa diakses lagi** (password lupa).
Konsekuensinya: `Transfer ownership` spreadsheet **mustahil** — hanya owner yang bisa,
dan tidak ada orang yang bisa masuk sebagai owner.

Solusi yang dipilih: **buat folder & 7 spreadsheet baru milik akun baru**, lalu
isi ulang datanya dari backup lokal. Hasilnya: 100% file milik akun baru.

---

## Status

Legend: `[ ]` belum · `[~]` sedang · `[x]` selesai

### Fase 1 — Persiapan
- [x] Backup data lokal tersedia di `excel/backup-2026-09-26/` (7 file xlsx)
- [x] Folder `ALSINTAN` dibuat di akun baru — `1SSz9RlEF4AGuspbiRfy55xsxS3xQS_Dy`
- [x] Service account (`alsintan@prime-odyssey-...`) diberi role **Editor** di folder
- [x] `SIAP_DRIVE_FOLDER_ID` di `.env.local` diarahkan ke folder baru
- [x] 7 spreadsheet kosong dibuat manual di dalam folder baru (2026-09-27)

### Fase 2 — Konversi data (otomatis, oleh agent)
- [x] 7 file `.xlsx` di folder diunduh ke `excel/import/` (opsional — backup lokal dipakai langsung)
- [x] 7 Google Spreadsheet dibuat & diisi 46 tab (16+1+6+6+1+8+8, hidden tabs LTAWAL/REKAP dilewati)
- [x] Daftar 7 ID spreadsheet dicatat (lihat tabel di bawah)

### Fase 3 — Kode & konfigurasi (otomatis, oleh agent)
- [x] `apps-script/Code.gs`: `SPREADSHEET_ID` → ID baseline baru
- [x] `apps-script/Code.gs`: 6 `SOURCES[].id` → ID spreadsheet baru
- [x] `.env.local`: `SIAP_SPREADSHEET_ID` → ID baseline baru
- [ ] `src/lib/mock/mock-sources.ts`: URL mock diperbarui (opsional — mock hanya untuk dev)

### Fase 4 — Deploy (manual, oleh pemilik akun)
- [x] Login `script.google.com` pakai akun baru → New project
- [x] Paste `apps-script/Code.gs` → Save
- [x] Deploy → New deployment → Web app: **Execute as Me**, **Access Anyone**
- [x] Authorize → Advanced → Go to (unsafe) → Allow
- [x] Catat Web app URL baru

### Fase 5 — Verifikasi (otomatis, oleh agent)
- [x] `npm run gas:verify -- --url=<URL_BARU>` → 8/8 endpoint + 6/6 sumber OK (2026-09-27)
- [x] Tambah email `siapalsintan.tyas@gmail.com` ke sheet `USERS` (ROLE=ADMIN)
- [x] Test halaman produksi (authCheck OK — Tyas (Ops SIAP), ADMIN)

### Fase 6 — Cutover produksi
- [x] Vercel → Settings → Environment Variables → `VITE_GAS_API_URL` = URL baru (via API, 2026-09-27)
- [x] Vercel → Redeploy (production deployment READY, JS bundle verified)
- [ ] Login & cek semua halaman (manual test by user)
- [ ] Arsipkan spreadsheet lama (jangan dihapus)

---

## Data yang dipakai (7 file)

| # | Nama | Tab | Peran |
|---|---|---|---|
| 1 | `Poktan 2026` | 16 | sumber Gapoktan per kecamatan |
| 2 | `Produksi Beras 2025` | 1 | sumber produksi |
| 3 | `Produksi Padi Ladang 2025` | 7 + LTAWAL | sumber produksi |
| 4 | `Produksi Padi Sawah 2025` | 7 + LTAWAL | sumber produksi |
| 5 | `Rekap Alsintan seKabupaten Purworejo sampai dengan April2026` | 1 | sumber alsintan |
| 6 | `Rekap Bulanan SP TP` | 9 | sumber SP TP |
| 7 | `SIAP ALSINTAN - Baseline LBS Padi Sawah Purworejo 2025` | 8 | **pusat sistem** |

Tab baseline: `MASTER_WILAYAH` (16 kec), `MASTER_DESA` (495 desa),
`IMPORT_BAKU_SAWAH_DESA`, `REKAP_KECAMATAN`, `DATA_PROSPEK`, `DATA_SURVEY`,
`MASTER_ANALIS`, `USERS`.

---

## ID yang perlu diubah di kode

`apps-script/Code.gs` — 7 nilai:

```js
var SPREADSHEET_ID = '...';            // baris 14  -> baseline baru

var SOURCES = [
  { key: 'poktan',         id: '...' },  // baris 28
  { key: 'padi_sawah',     id: '...' },  // baris 29
  { key: 'padi_ladang',    id: '...' },  // baris 30
  { key: 'beras',          id: '...' },  // baris 31
  { key: 'rekap_alsintan', id: '...' },  // baris 32
  { key: 'rekap_bulanan',  id: '...' },  // baris 33
];
```

Tidak ada perubahan lain di `src/` maupun di Vercel/GitHub.

---

## ID BARU (folder ALSINTAN — milik siapalsintan.tyas@gmail.com)

| # | Nama | ID Spreadsheet | Tab |
|---|---|---|---|
| 1 | Poktan 2026 | `1xd4G2iCUBvyqUwuTni3anBOJhoQwmb-TNW1qOE4YBzg` | 16 |
| 2 | Produksi Padi Sawah 2025 | `1NEEZarMvHL11z2rXx0dS31KuiI0tAMJCIH_b11eYFQo` | 6 |
| 3 | Produksi Padi Ladang 2025 | `1G3x0B9Oxi4rfMoWTBJ3Ie-rIL2-dCrPV9vlh0BahvqQ` | 6 |
| 4 | Produksi Beras 2025 | `1s41NFQjZBdlQWW_6d-NBNMnEkYLufyf-Z-bCgaxOiC4` | 1 |
| 5 | Rekap Alsintan s.d. April 2026 | `1z5zDzvksX5xT6C_OvM_Kv_cFYPuGdOPvAKxsxp7LBoY` | 1 |
| 6 | Rekap Bulanan SP TP | `1DzlqupA0M-6Ehs6QSwTo_o7oU_g7uVYROCSr8aiuzt8` | 8 |
| 7 | SIAP ALSINTAN - Baseline (MASTER) | `1EZ3XYXRaCkJmHhLbhVkrzKqcFrtcN7DX3k7BNZc20F4` | 8 |
| - | Folder ALSINTAN | `1SSz9RlEF4AGuspbiRfy55xsxS3xQS_Dy` | - |

Semua URL: `https://docs.google.com/spreadsheets/d/<ID>/edit`

---

## Kenapa service account tidak bisa membuat spreadsheet

```
Service account : alsintan@prime-odyssey-508315-r6.iam.gserviceaccount.com
Storage limit   : 0 bytes
```

Error: `The user's Drive storage quota has been exceeded.`

Service account ** boleh mengisi spreadsheet yang sudah ada, tapi tidak boleh
membuat file baru. Karena itu spreadsheet kosong harus dibuat manual sekali saja
(7 kali klik), lalu script mengisi & menamainya otomatis.

---

## ID lama (arsip — jangan dihapus)

| Item | ID |
|---|---|
| Spreadsheet baseline lama | `1o46DOJyyd9ghgqgBqfMR2_QRj-sNcnK6H9c8cFnxGdg` |
| Folder ALSINTAN lama | `10bMgDYu3U_DrvSfmj1myGotU9tLgZfAv` |
| Deployment Apps Script lama | `AKfycbxK-PKATBd50DMufayNBqsi2cq2oFR3l1pYuD6DieYTnrI2N3WmtM241N7UF7UMAsathA` |
| Deployment Apps Script BARU | `AKfycbzeej-375FCqhZcnAvBSsZoRXsJSib6jbLuPTt54jzksFTXne4q61JOaeijmSGJxAA` |

Sistem lama masih jalan (terverifikasi 7/7 endpoint OK per 2026-09-27) —
artinya migrasi ini **tidak mendesak**, bisa dikerjakan dengan tenang.
