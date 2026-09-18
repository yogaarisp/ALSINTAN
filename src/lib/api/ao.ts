// ============================================================
// SIAP ALSINTAN — API Service: AO (Account Officer)
// ============================================================
// Sumber data: sheet MASTER_AO di Google Spreadsheet (via Apps Script)
// ============================================================

import type { MasterAO } from '@/lib/types'
import { MOCK_AO } from '@/lib/mock/mock-data'
import { gasGet, gasPost, isGasConfigured } from './gas'

import { getLocalCache, setLocalCache } from '@/lib/utils/cache'

const USE_MOCK = !isGasConfigured

export async function getAO(): Promise<MasterAO[]> {
  if (USE_MOCK) {
    return [...MOCK_AO]
  }
  try {
    const data = await gasGet<MasterAO[]>('getAO')
    if (data && data.length > 0) {
      setLocalCache('ao_all', data)
    }
    return data
  } catch (err) {
    const cached = getLocalCache<MasterAO[]>('ao_all')
    if (cached) return cached
    throw err
  }
}

export async function getAOById(idAO: string): Promise<MasterAO | null> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    return MOCK_AO.find((a) => a.idAO === idAO) ?? null
  }
  const all = await getAO()
  return all.find((a) => a.idAO === idAO) ?? null
}

export interface CreateAOForm {
  namaAO: string
  email: string
  wilayah: string[]
  status: 'AKTIF' | 'TIDAK_AKTIF'
}

export async function createAO(form: CreateAOForm): Promise<MasterAO> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 600))
    const newAO: MasterAO = {
      idAO: `AO${String(MOCK_AO.length + 1).padStart(3, '0')}`,
      namaAO: form.namaAO,
      email: form.email,
      wilayah: form.wilayah,
      status: form.status,
      totalProspek: 0,
      totalSurvey: 0,
    }
    MOCK_AO.push(newAO)
    return newAO
  }
  return gasPost<MasterAO>('createAO', { ...form })
}

export async function updateAOStatus(idAO: string, status: 'AKTIF' | 'TIDAK_AKTIF'): Promise<MasterAO> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400))
    const ao = MOCK_AO.find((a) => a.idAO === idAO)
    if (!ao) throw new Error('AO tidak ditemukan')
    ao.status = status
    return { ...ao }
  }
  return gasPost<MasterAO>('updateAOStatus', { idAO, status })
}
