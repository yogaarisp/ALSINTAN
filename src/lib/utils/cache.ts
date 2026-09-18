// ============================================================
// SIAP ALSINTAN — Local Cache Utility (Stale-While-Revalidate)
// ============================================================
// Menyimpan data terakhir ke localStorage agar UI dapat langsung
// tampil dalam 0 milidetik (tanpa menunggu latency Apps Script ~3 detik)
// ============================================================

const CACHE_PREFIX = 'siap_cache_'

export function getLocalCache<T>(key: string, fallback?: T): T | undefined {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && 'data' in parsed) {
      return parsed.data as T
    }
    return parsed as T
  } catch {
    return fallback
  }
}

export function setLocalCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ data, timestamp: Date.now() })
    )
  } catch {}
}
