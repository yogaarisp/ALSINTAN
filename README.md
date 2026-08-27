# SIAP ALSINTAN Web

> Sistem Informasi dan Analisis Potensi Alat Mesin Pertanian

## Stack

- **Frontend**: React 18 + TypeScript + Vite 5
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **State/Cache**: TanStack Query v5
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod
- **Map**: Leaflet + React Leaflet v4
- **Charts**: Recharts
- **PWA**: vite-plugin-pwa
- **Data Source**: Google Spreadsheet via Google Apps Script

## Development

```bash
npm install
npm run dev
```

## Environment Variables

Copy `.env.example` ke `.env.local` dan isi:

```env
VITE_GAS_API_URL=       # URL Google Apps Script deployment
VITE_APP_NAME=SIAP ALSINTAN
VITE_APP_VERSION=1.0.0
```

## Arsitektur

```
Browser (React SPA)
    ↓
/src/lib/api/    ← API Service Layer
    ↓
Google Apps Script (CORS enabled)
    ↓
Google Spreadsheet
```

## Dokumentasi

- [PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md) — Analisis project
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Arsitektur sistem
- [API.md](./API.md) — API reference
- [TODO.md](./TODO.md) — TODO list
- [NEED_CONFIRMATION.md](./NEED_CONFIRMATION.md) — Items for stakeholder confirmation
