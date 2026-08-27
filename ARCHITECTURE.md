# ARCHITECTURE — SIAP ALSINTAN Web (Fase 1)

## 1. Arsitektur Tingkat Tinggi

```
┌────────────────────────────────────────────────────────┐
│               SIAP ALSINTAN WEB (SPA)                  │
│                                                        │
│  [UI & Page Layer]                                     │
│  - Executive Dashboard      - Prioritas Wilayah        │
│  - Peta Potensi (Leaflet)   - Pipeline Prospek         │
│  - Dashboard AO             - Survey Lapangan (GPS)    │
│  - Monitoring & Evaluasi                               │
│                                                        │
│  [Application Service Layer & State]                   │
│  - TanStack Query (Caching & Stale-while-revalidate)   │
│  - Priority Analysis Engine (Configurable Engine)      │
│  - Auth Context & Protected Route Guards               │
│                                                        │
│  [API & Data Abstraction Layer]                        │
│  - ApiClient (Axios Client with Sanitized Errors)      │
│  - Service Abstractions: Wilayah, Prospek, AO, Survey  │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ HTTPS / JSON API
                            ▼
┌────────────────────────────────────────────────────────┐
│            GOOGLE APPS SCRIPT MIDDLEWARE               │
│  - Endpoints: getWilayah, getProspek, addSurvey, etc.  │
│  - Authentication / API Key verification               │
│  - CORS Enabled Handling                               │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ Apps Script SpreadsheetApp
                            ▼
┌────────────────────────────────────────────────────────┐
│          GOOGLE SPREADSHEET (Source of Truth)          │
│  - MASTER_WILAYAH         - MASTER_KOMODITAS           │
│  - MASTER_AO              - DATA_PROSPEK               │
│  - DATA_SURVEY            - HASIL_ANALISIS             │
└────────────────────────────────────────────────────────┘
```

## 2. Kesiapan Migrasi Fase 2 (Database Transition)

Frontend sama sekali **tidak bergantung langsung** pada skema Google Spreadsheet. Semua interaksi data melewati layer abstraksi di `/src/lib/api/*` dan `/src/lib/types/*`.

Ketika memasuki Fase 2 (Migrasi ke MySQL / REST API):
- Hanya perlu mengganti URL endpoint di `.env` atau mengubah implementasi service di `/src/lib/api/*`
- UI Layer, Priority Engine, dan Map Component tidak memerlukan refactoring ulang dari nol.

## 3. Modul Priority Analysis Engine

- Lokasi: `/src/lib/services/priority-engine.ts`
- Konfigurasi Bobot & Normalisasi: `/src/lib/config/priority-config.ts`
- Status: **[DEVELOPMENT ONLY]** — Pembobotan dan normalisasi dibuat configurable sehingga formula bisnis final dapat dengan mudah disesuaikan ketika disetujui oleh stakeholder.

## 4. Keamanan & PWA

- Credential Google Apps Script disimpan pada Environment Variables (`.env.local` / CI-CD secrets).
- PWA terkonfigurasi dengan Service Worker untuk caching asset statis dan manifest aplikasi mobile.
