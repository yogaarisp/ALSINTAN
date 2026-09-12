// ============================================================
// SIAP ALSINTAN — API Service: Sumber Data
// ============================================================
// Baca langsung (live) spreadsheet sumber lain di folder
// ALSINTAN: Poktan, Produksi, Rekap — via Apps Script
// ============================================================

import type { SourceInfo, SourceData } from '@/lib/types'
import { gasGet } from './gas'

export async function getSources(): Promise<SourceInfo[]> {
  return gasGet<SourceInfo[]>('getSources')
}

export interface SourceDataParams {
  key: string
  tab: string
  q?: string
  page?: number
  limit?: number
}

export async function getSourceData(params: SourceDataParams): Promise<SourceData> {
  return gasGet<SourceData>('getSourceData', { ...params })
}
