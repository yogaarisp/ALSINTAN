// ============================================================
// SIAP ALSINTAN — API Service: AO
// ============================================================

import { API_CONFIG } from '@/lib/config/app-config'
import type { MasterAO } from '@/lib/types'
import { MOCK_AO } from '@/lib/mock/mock-data'

const USE_MOCK = !API_CONFIG.gasApiUrl || API_CONFIG.gasApiUrl.includes('PLACEHOLDER')

export async function getAO(): Promise<MasterAO[]> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400))
    return [...MOCK_AO]
  }
  throw new Error('GAS API belum dikonfigurasi')
}

export async function getAOById(idAO: string): Promise<MasterAO | null> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    return MOCK_AO.find((a) => a.idAO === idAO) ?? null
  }
  throw new Error('GAS API belum dikonfigurasi')
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
  throw new Error('GAS API belum dikonfigurasi')
}

export async function updateAOStatus(idAO: string, status: 'AKTIF' | 'TIDAK_AKTIF'): Promise<MasterAO> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400))
    const ao = MOCK_AO.find((a) => a.idAO === idAO)
    if (!ao) throw new Error('AO tidak ditemukan')
    ao.status = status
    return { ...ao }
  }
  throw new Error('GAS API belum dikonfigurasi')
}

