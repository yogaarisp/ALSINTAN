// ============================================================
// SIAP ALSINTAN — API Service: Analis
// ============================================================
// Sumber data: sheet MASTER_ANALIS di Google Spreadsheet (via Apps Script)
// ============================================================

import type { MasterAnalis } from '@/lib/types'
import { MOCK_ANALIS } from '@/lib/mock/mock-data'
import { gasGet, gasPost, isGasConfigured } from './gas'

import { getLocalCache, setLocalCache } from '@/lib/utils/cache'

const USE_MOCK = !isGasConfigured

export async function getAnalis(): Promise<MasterAnalis[]> {
  if (USE_MOCK) {
    return [...MOCK_ANALIS]
  }
  try {
    const data = await gasGet<MasterAnalis[]>('getAnalis')
    if (data && data.length > 0) {
      setLocalCache('analis_all', data)
    }
    return data
  } catch (err) {
    const cached = getLocalCache<MasterAnalis[]>('analis_all')
    if (cached) return cached
    throw err
  }
}

export async function getAnalisById(idAnalis: string): Promise<MasterAnalis | null> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    return MOCK_ANALIS.find((a) => a.idAnalis === idAnalis) ?? null
  }
  const all = await getAnalis()
  return all.find((a) => a.idAnalis === idAnalis) ?? null
}

export interface CreateAnalisForm {
  namaAnalis: string
  email: string
  wilayah: string[]
  status: 'AKTIF' | 'TIDAK_AKTIF'
}

export async function createAnalis(form: CreateAnalisForm): Promise<MasterAnalis> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 600))
    const newAnalis: MasterAnalis = {
      idAnalis: `AN${String(MOCK_ANALIS.length + 1).padStart(3, '0')}`,
      namaAnalis: form.namaAnalis,
      email: form.email,
      wilayah: form.wilayah,
      status: form.status,
      totalProspek: 0,
      totalSurvey: 0,
    }
    MOCK_ANALIS.push(newAnalis)
    return newAnalis
  }
  return gasPost<MasterAnalis>('createAnalis', { ...form })
}

export async function updateAnalisStatus(idAnalis: string, status: 'AKTIF' | 'TIDAK_AKTIF'): Promise<MasterAnalis> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400))
    const analis = MOCK_ANALIS.find((a) => a.idAnalis === idAnalis)
    if (!analis) throw new Error('Analis tidak ditemukan')
    analis.status = status
    return { ...analis }
  }
  return gasPost<MasterAnalis>('updateAnalisStatus', { idAnalis, status })
}
