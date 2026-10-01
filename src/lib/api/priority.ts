// ============================================================
// SIAP ALSINTAN — Priority Configuration API
// ============================================================
// Sinkronisasi bobot & threshold Priority Engine ke Google Sheets
// (tab CONFIG_PRIORITAS) dengan fallback offline/localStorage.
// ============================================================

import { gasGet, gasPost, isGasConfigured } from '@/lib/api/gas'
import { PRIORITY_CONFIG } from '@/lib/config/priority-config'
import {
  getPriorityOverrides,
  setPriorityOverrides,
  resetPriorityOverrides,
  type PriorityOverrides,
} from '@/lib/settings/settings-store'

export interface PriorityConfigResponse extends PriorityOverrides {
  isBackend: boolean
}

export async function getPriorityConfigApi(): Promise<PriorityConfigResponse> {
  const local = getPriorityOverrides()
  const fallback: PriorityConfigResponse = {
    weights: local?.weights ?? PRIORITY_CONFIG.weights,
    thresholds: local?.thresholds ?? PRIORITY_CONFIG.thresholds,
    lastUpdated: local?.lastUpdated,
    updatedBy: local?.updatedBy,
    isBackend: Boolean(local?.isBackend),
  }

  if (!isGasConfigured()) {
    return fallback
  }

  try {
    const res = await gasGet<{
      weights: PriorityOverrides['weights']
      thresholds: PriorityOverrides['thresholds']
      lastUpdated?: string
      updatedBy?: string
    }>('getPriorityConfig')

    if (res && res.weights && res.thresholds) {
      const synced: PriorityConfigResponse = {
        weights: res.weights,
        thresholds: res.thresholds,
        lastUpdated: res.lastUpdated,
        updatedBy: res.updatedBy,
        isBackend: true,
      }
      setPriorityOverrides(synced)
      return synced
    }
    return fallback
  } catch (err) {
    console.warn('Gagal memuat konfigurasi prioritas dari backend, menggunakan cache lokal:', err)
    return fallback
  }
}

export async function updatePriorityConfigApi(payload: {
  weights: PriorityOverrides['weights']
  thresholds: PriorityOverrides['thresholds']
  updatedBy?: string
}): Promise<PriorityConfigResponse> {
  const isOnline = isGasConfigured()

  if (isOnline) {
    try {
      const res = await gasPost<{
        weights: PriorityOverrides['weights']
        thresholds: PriorityOverrides['thresholds']
        lastUpdated?: string
        updatedBy?: string
      }>('updatePriorityConfig', payload)

      const result: PriorityConfigResponse = {
        weights: res.weights || payload.weights,
        thresholds: res.thresholds || payload.thresholds,
        lastUpdated: res.lastUpdated || new Date().toISOString(),
        updatedBy: res.updatedBy || payload.updatedBy || 'ADMIN',
        isBackend: true,
      }
      setPriorityOverrides(result)
      return result
    } catch (err) {
      console.warn('Gagal menyimpan ke backend, menyimpan ke lokal:', err)
    }
  }

  const localResult: PriorityConfigResponse = {
    weights: payload.weights,
    thresholds: payload.thresholds,
    lastUpdated: new Date().toISOString(),
    updatedBy: payload.updatedBy || 'ADMIN (Lokal)',
    isBackend: false,
  }
  setPriorityOverrides(localResult)
  return localResult
}

export async function resetPriorityConfigApi(): Promise<void> {
  resetPriorityOverrides()
}
