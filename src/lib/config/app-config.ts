// ============================================================
// SIAP ALSINTAN — App Configuration
// ============================================================

export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME || 'SIAP ALSINTAN',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  description: import.meta.env.VITE_APP_DESCRIPTION || 'Sistem Informasi dan Analisis Potensi Alsintan',
  env: import.meta.env.VITE_ENV || 'development',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const

export const API_CONFIG = {
  // URL Google Apps Script — disimpan di env agar tidak hardcode
  // TODO: CONFIRM URL aktual dari client — NC2
  gasApiUrl: import.meta.env.VITE_GAS_API_URL || '',
  gasApiKey: import.meta.env.VITE_GAS_API_KEY || '',
  timeout: 30000, // 30 detik
  retryAttempts: 3,
  // Cache TTL dalam milidetik
  cacheTTL: {
    wilayah: 1000 * 60 * 15,    // 15 menit
    dashboard: 1000 * 60 * 5,   // 5 menit
    prospek: 1000 * 60 * 2,     // 2 menit
    survey: 1000 * 60 * 2,      // 2 menit
    ao: 1000 * 60 * 30,         // 30 menit
    komoditas: 1000 * 60 * 60,  // 1 jam
  },
} as const

export const FEATURES = {
  map: import.meta.env.VITE_FEATURE_MAP === 'true',
  priorityScore: import.meta.env.VITE_FEATURE_PRIORITY_SCORE === 'true',
  surveyForm: import.meta.env.VITE_FEATURE_SURVEY_FORM === 'true',
  googleOAuth: import.meta.env.VITE_FEATURE_GOOGLE_OAUTH === 'true',
} as const

export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 100,
} as const

export const MAP_CONFIG = {
  // Default center — akan disesuaikan dengan data wilayah actual
  // TODO: CONFIRM koordinat wilayah kerja — NC12
  defaultCenter: [-6.5, 107.5] as [number, number],
  defaultZoom: 9,
  minZoom: 7,
  maxZoom: 18,
  tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileAttribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
} as const
