// ============================================================
// SIAP ALSINTAN — API Service: Wilayah
// ============================================================
// Abstraction layer antara UI dan data source (GAS / Mock)
// Ganti implementasi di sini tanpa mengubah komponen UI
// ============================================================

import { API_CONFIG } from '@/lib/config/app-config'
import type { MasterWilayah, WilayahFilter } from '@/lib/types'
import { MOCK_WILAYAH } from '@/lib/mock/mock-data'

const USE_MOCK = !API_CONFIG.gasApiUrl || API_CONFIG.gasApiUrl.includes('PLACEHOLDER')

/**
 * Ambil semua data wilayah
 * TODO: Implementasikan call ke GAS setelah NC2 & NC3 terkonfirmasi
 */
export async function getWilayah(filter?: WilayahFilter): Promise<MasterWilayah[]> {
  if (USE_MOCK) {
    // Simulasi delay network
    await new Promise((r) => setTimeout(r, 500))
    let data = [...MOCK_WILAYAH]
    if (filter?.kabupaten) {
      data = data.filter((w) => w.kabupaten === filter.kabupaten)
    }
    if (filter?.kecamatan) {
      data = data.filter((w) => w.kecamatan.toLowerCase().includes(filter.kecamatan!.toLowerCase()))
    }
    return data
  }

  // TODO: Implementasi GAS call
  // const res = await apiClient.get<MasterWilayah[]>('', { action: 'getWilayah', ...filter })
  // return res.data
  throw new Error('GAS API belum dikonfigurasi. Set VITE_GAS_API_URL di .env.local')
}

/**
 * Ambil detail satu wilayah berdasarkan ID
 */
export async function getWilayahById(idKecamatan: string): Promise<MasterWilayah | null> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    return MOCK_WILAYAH.find((w) => w.idKecamatan === idKecamatan) ?? null
  }
  // TODO: GAS call
  throw new Error('GAS API belum dikonfigurasi')
}
