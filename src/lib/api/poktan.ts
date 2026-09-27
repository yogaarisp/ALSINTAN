// ============================================================
// SIAP ALSINTAN — API Service: Master Poktan
// ============================================================
// Sumber data: spreadsheet "Poktan 2026" — 16 tab (satu per kecamatan),
// total ±3.243 kelompok tani. Dibaca read-only lewat action GAS `getPoktan`.
// Berbeda dengan DATA_PROSPEK: ini master acuan resmi, bukan hasil kerja Analis.
// ============================================================

import type { MasterPoktan, PoktanFilter, PoktanResponse } from '@/lib/types'
import { getLocalCache, setLocalCache } from '@/lib/utils/cache'
import { gasGet, isGasConfigured } from './gas'

const USE_MOCK = !isGasConfigured()

function cacheKey(filter?: PoktanFilter): string {
  return `poktan_${(filter?.kecamatan || 'all').toLowerCase()}`
}

const EMPTY: PoktanResponse = { items: [], total: 0, page: 1, limit: 0, totalPages: 1, kecamatan: [] }

/**
 * Daftar kelompok tani. Tanpa `kecamatan` akan memuat seluruh 3.243 baris —
 * untuk dropdown, lebih baik selalu pass `kecamatan` (maks. ±311 baris per tab).
 */
export async function getPoktan(filter?: PoktanFilter): Promise<PoktanResponse> {
  if (USE_MOCK) return EMPTY

  try {
    const res = await gasGet<PoktanResponse>('getPoktan', {
      kecamatan: filter?.kecamatan,
      q: filter?.q,
      page: filter?.page,
      limit: filter?.limit,
    })
    if (res && res.items) setLocalCache(cacheKey(filter), res)
    return res
  } catch (err) {
    const cached = getLocalCache<PoktanResponse>(cacheKey(filter))
    if (cached) return cached
    throw err
  }
}

export async function getPoktanById(idPoktan: string): Promise<MasterPoktan | null> {
  if (USE_MOCK) return null
  return gasGet<MasterPoktan | null>('getPoktan', { idPoktan })
}
