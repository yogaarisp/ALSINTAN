# NEED CONFIRMATION (NC) — SIAP ALSINTAN (Fase 1)

Berikut adalah daftar item yang memerlukan masukan/konfirmasi dari stakeholder atau client:

| No | Item | Dampak Teknis | Status Saat Ini |
|---|------|---------------|-----------------|
| **NC1** | **Formula & Pembobotan Priority Score** | Menentukan urutan ranking prioritas wilayah prospek | Menggunakan nilai default `DEVELOPMENT ONLY` pada `priority-config.ts` (Luas 30%, Gapoktan 25%, Produksi 25%, Prospek 20%) |
| **NC2** | **URL Google Apps Script Deployment** | Integrasi fetch & sync data live ke Google Spreadsheet | Menggunakan service mock data abstraction, siap disambungkan begitu URL diberikan |
| **NC3** | **Struktur Kolom Spreadsheet Existing** | Pemetaan header sheet ke data model aplikasi | Schema adapter disiapkan mengikuti PRD Section 9 |
| **NC4** | **Metode Autentikasi Google OAuth** | Login menggunakan akun Google Workspace tim | Auth context telah disiapkan modular; tinggal memasukkan `VITE_GOOGLE_CLIENT_ID` |
| **NC5** | **Storage Foto Dokumentasi Survey** | Penyimpanan file gambar hasil survey dari lapangan | Disiapkan integrasi Google Drive via Apps Script / direct upload |
| **NC6** | **GeoJSON Batas Administrasi Kecamatan** | Rendering polygon choropleth batas wilayah kecamatan | Marker koordinat titik kecamatan sudah aktif; polygon layer dapat dihubungkan ketika file GeoJSON kabupaten tersedia |
| **NC7** | **Sumber Data KPI "Outstanding Kredit"** | Sumber data finansial pembiayaan alsintan | Ditandai opsional/TODO hingga ada sheet/kolom sumber yang jelas |
| **NC8** | **Definisi & Rumus "Conversion Rate"** | Perhitungan efektivitas prospek menjadi closing | Menggunakan persentase `Closing / Total Prospek` sebagai default |
