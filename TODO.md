# TECHNICAL TODO LIST — SIAP ALSINTAN

## Fase 1A (Foundation & Core UI/UX) — [SELESAI ✅]
- [x] Inisialisasi React + Vite 5 + TypeScript + Tailwind CSS v4 + PWA
- [x] Design System Tokens & Responsive Mobile-first Navigation (Sidebar + Mobile Bottom Nav)
- [x] Authentication Layer (Role-based access: Admin, AO, Manajemen)
- [x] Decision-support Executive Dashboard dengan KPI Cards & Chart Analytics
- [x] Peta Potensi Wilayah Interaktif (Leaflet Web Map + Marker Priority Color Coding + Detail Drawer)
- [x] Ranking Prioritas Wilayah dengan Sorting, Filtering, dan Breakdown Transparency Modal
- [x] Configurable Priority Analysis Engine (`/src/lib/services/priority-engine.ts`)
- [x] Pipeline Prospek Alsintan (List, Search, Create Modal, Detail Inspection)
- [x] Dashboard AO Khusus dengan penugasan wilayah dan antrian survey
- [x] Mobile-first Survey Lapangan dengan Browser Geolocation GPS & Riwayat Survey
- [x] Dashboard Monitoring & Evaluasi Manajemen (Perbandingan Potensi Baseline vs Realisasi Aktual)

## Fase 1B (Integrasi Google Spreadsheet Live) — [MENUNGGU INFO CLIENT ⏳]
- [ ] Dapatkan URL Google Apps Script yang sudah dideploy oleh client (NC2)
- [ ] Verifikasi struktur kolom pada Google Spreadsheet existing (NC3)
- [ ] Sambungkan endpoint live ke `/src/lib/api/*`
- [ ] Lakukan pengujian end-to-end penulisan data survey dari HP ke Spreadsheet

## Fase 2 (Future Scope — Database Migration)
- [ ] Buat skema database relational MySQL / MariaDB
- [ ] Buat backend REST API (Node.js / Laravel / Go)
- [ ] Ganti API Client service layer dari Google Apps Script ke REST API
