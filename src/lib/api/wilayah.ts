// ============================================================
// SIAP ALSINTAN — API Service: Wilayah
// ============================================================
// Sumber data: MASTER_WILAYAH di Google Spreadsheet (via Apps Script)
// Fallback ke mock data hanya saat VITE_GAS_API_URL belum diset
// ============================================================

import type { MasterWilayah, WilayahFilter } from '@/lib/types'
import { MOCK_WILAYAH } from '@/lib/mock/mock-data'
import { getLocalCache, setLocalCache } from '@/lib/utils/cache'
import { gasGet, isGasConfigured } from './gas'

const USE_MOCK = !isGasConfigured

export async function getWilayah(filter?: WilayahFilter): Promise<MasterWilayah[]> {
  if (USE_MOCK) {
    let data = [...MOCK_WILAYAH]
    if (filter?.kabupaten) {
      data = data.filter((w) => w.kabupaten === filter.kabupaten)
    }
    if (filter?.kecamatan) {
      data = data.filter((w) => w.kecamatan.toLowerCase().includes(filter.kecamatan!.toLowerCase()))
    }
    return data
  }

  try {
    let data = await gasGet<MasterWilayah[]>('getWilayah', {
      kabupaten: filter?.kabupaten,
      kecamatan: filter?.kecamatan,
      komoditas: filter?.komoditas,
    })
    if (!filter && data && data.length > 0) {
      setLocalCache('wilayah_all', data)
    }
    if (filter?.priorityLevel) {
      data = data.filter((w) => w.priorityLevel === filter.priorityLevel)
    }
    return data
  } catch (err) {
    const cached = getLocalCache<MasterWilayah[]>('wilayah_all')
    if (cached && !filter) return cached
    throw err
  }
}

export async function getWilayahById(idKecamatan: string): Promise<MasterWilayah | null> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    return MOCK_WILAYAH.find((w) => w.idKecamatan === idKecamatan) ?? null
  }
  return gasGet<MasterWilayah | null>('getWilayah', { idKecamatan })
}
