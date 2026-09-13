# NEED CONFIRMATION (NC) — SIAP ALSINTAN (Fase 1)

Berikut adalah daftar item yang memerlukan masukan/konfirmasi dari stakeholder atau client:

| No | Item | Dampak Teknis | Status Saat Ini |
|---|------|---------------|-----------------|
| **NC1** | **Formula & Pembobotan Priority Score** | Menentukan urutan ranking prioritas wilayah prospek | Menggunakan nilai default `DEVELOPMENT ONLY` pada `priority-config.ts` (Luas 30%, Gapoktan 25%, Produksi 25%, Prospek 20%) |
| **NC2** | **URL Google Apps Script Deployment** | Integrasi fetch & sync data live ke Google Spreadsheet | **SELESAI** — Web App ter-deploy & terverifikasi (lihat `apps-script/Code.gs`, URL di `.env.local`) |
| **NC3** | **Struktur Kolom Spreadsheet Existing** | Pemetaan header sheet ke data model aplikasi | Schema adapter disiapkan mengikuti PRD Section 9 |
| **NC4** | **Metode Autentikasi Google OAuth** | Login menggunakan akun Google Workspace tim | **SIAP DIAKTIFKAN** — Google Sign-In + sheet USERS + `authCheck` selesai; tinggal buat OAuth Client ID & isi `VITE_GOOGLE_CLIENT_ID` |
| **NC5** | **Storage Foto Dokumentasi Survey** | Penyimpanan file gambar hasil survey dari lapangan | **SELESAI** — foto terkirim sebagai base64, disimpan ke Drive (folder "SIAP ALSINTAN - Foto Survey"), link di kolom FOTO_URL |
| **NC6** | **GeoJSON Batas Administrasi Kecamatan** | Rendering polygon choropleth batas wilayah kecamatan | **TAHAP 1 SELESAI** — koordinat 16/16 kecamatan terisi (marker aktif); polygon choropleth menunggu file GeoJSON |
| **NC7** | **Sumber Data KPI "Outstanding Kredit"** | Sumber data finansial pembiayaan alsintan | Ditandai opsional/TODO hingga ada sheet/kolom sumber yang jelas |
| **NC8** | **Definisi & Rumus "Conversion Rate"** | Perhitungan efektivitas prospek menjadi closing | Menggunakan persentase `Closing / Total Prospek` sebagai default |
