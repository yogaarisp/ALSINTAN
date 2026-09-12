# API REFERENCE — SIAP ALSINTAN (Fase 1)

Komunikasi antara Frontend Web dan Google Apps Script Middleware menggunakan HTTP GET/POST dengan parameter `action`.

Base URL: `VITE_GAS_API_URL` (Contoh: `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`)

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
    "aoAktif": 3
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
- **Query Params**: `status`, `idAO`, `kecamatan`, `page`, `limit`
- **Method**: `POST`
- **Action**: `createProspek`
- **Body**:
```json
{
  "idKecamatan": "W001",
  "namaGapoktan": "Gapoktan Maju Bersama",
  "komoditas": "Padi",
  "estimasiKebutuhan": "Combine Harvester 2 unit",
  "catatan": "Akses jalan bagus"
}
```

---

## 4. Data Survey Lapangan
- **Method**: `POST`
- **Action**: `createSurvey`
- **Body**:
```json
{
  "idProspek": "P001",
  "namaGapoktan": "Gapoktan Maju Bersama",
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

---

## 5. Sumber Data (Spreadsheet Sumber Lain — Read-only)
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
