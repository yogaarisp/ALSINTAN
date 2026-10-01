// ============================================================
// SIAP ALSINTAN — Settings Store (localStorage)
// ============================================================
// Mengizinkan Administrator mengubah konfigurasi runtime
// (bobot Priority Engine & URL Google Apps Script) yang akan
// me-override nilai bawaan dari config file.
// Catatan: tersimpan per-browser (localStorage). Untuk produksi,
// sebaiknya dipindah ke penyimpanan backend / Spreadsheet settings.
// ============================================================

const PREFIX = 'siap_settings_'
const PRIORITY_KEY = 'priority'
const GAS_URL_KEY = 'gas_url'

export interface PriorityOverrides {
  weights: {
    luasLahan: number
    jumlahGapoktan: number
    produksi: number
    prospekExisting: number
  }
  thresholds: {
    tinggi: number
    sedang: number
  }
  lastUpdated?: string
  updatedBy?: string
  isBackend?: boolean
}

function read<T>(key: string): T | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return undefined
    return JSON.parse(raw) as T
  } catch {
    /* ignore corrupt value */
    return undefined
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* storage penuh / private mode */
  }
}

function remove(key: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    /* ignore */
  }
}

// ── Priority Engine Overrides ──────────────────────────────
export function getPriorityOverrides(): PriorityOverrides | undefined {
  return read<PriorityOverrides>(PRIORITY_KEY)
}

export function setPriorityOverrides(overrides: PriorityOverrides): void {
  write(PRIORITY_KEY, overrides)
}

export function resetPriorityOverrides(): void {
  remove(PRIORITY_KEY)
}

// ── Google Apps Script URL Override ────────────────────────
export function getGasUrlOverride(): string {
  return read<string>(GAS_URL_KEY) ?? ''
}

export function setGasUrlOverride(url: string): void {
  write(GAS_URL_KEY, url.trim())
}

export function resetGasUrlOverride(): void {
  remove(GAS_URL_KEY)
}