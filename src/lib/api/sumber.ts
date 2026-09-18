// ============================================================
// SIAP ALSINTAN — API Service: Sumber Data
// ============================================================
// Baca langsung (live) spreadsheet sumber lain di folder
// ALSINTAN: Poktan, Produksi, Rekap — via Apps Script
// ============================================================

import type { SourceInfo, SourceData } from '@/lib/types'
import { DEFAULT_SOURCES } from '@/lib/mock/mock-sources'
import { getLocalCache, setLocalCache } from '@/lib/utils/cache'
import { gasGet } from './gas'

export async function getSources(): Promise<SourceInfo[]> {
  try {
    const data = await gasGet<SourceInfo[]>('getSources')
    if (data && data.length > 0) {
      setLocalCache('sources_list', data)
    }
    return data
  } catch (err) {
    const cached = getLocalCache<SourceInfo[]>('sources_list', DEFAULT_SOURCES)
    if (cached) return cached
    throw err
  }
}

export interface SourceDataParams {
  key: string
  tab: string
  q?: string
  page?: number
  limit?: number
}

export async function getSourceData(params: SourceDataParams): Promise<SourceData> {
  const cacheKey = `source_data_${params.key}_${params.tab}_${params.q || ''}_${params.page || 1}`
  try {
    const data = await gasGet<SourceData>('getSourceData', { ...params })
    if (data && data.rows) {
      setLocalCache(cacheKey, data)
    }
    return data
  } catch (err) {
    const cached = getLocalCache<SourceData>(cacheKey)
    if (cached) return cached
    throw err
  }
}
