// ============================================================
// SIAP ALSINTAN — API Service: Prospek
// ============================================================
// Sumber data: sheet DATA_PROSPEK di Google Spreadsheet (via Apps Script)
// ============================================================

import type {
  DataProspek,
  ProspekFilter,
  PaginatedResponse,
  CreateProspekForm,
  UpdateProspekForm,
  DeleteProspekResult,
  StatusProspek,
} from '@/lib/types'
import { MOCK_PROSPEK } from '@/lib/mock/mock-data'
import { PAGINATION } from '@/lib/config/app-config'
import { getLocalCache, setLocalCache } from '@/lib/utils/cache'
import { gasGet, gasPost, isGasConfigured } from './gas'

const USE_MOCK = !isGasConfigured

export async function getProspek(filter?: ProspekFilter): Promise<PaginatedResponse<DataProspek>> {
  if (USE_MOCK) {
    let data = [...MOCK_PROSPEK]

    if (filter?.status) data = data.filter((p) => p.status === filter.status)
    if (filter?.idAnalis) data = data.filter((p) => p.idAnalis === filter.idAnalis)
    if (filter?.kecamatan) data = data.filter((p) => p.kecamatan.toLowerCase().includes(filter.kecamatan!.toLowerCase()))
    if (filter?.search) {
      const q = filter.search.toLowerCase()
      data = data.filter((p) =>
        p.namaGapoktan.toLowerCase().includes(q) ||
        p.kecamatan.toLowerCase().includes(q) ||
        p.komoditas.toLowerCase().includes(q)
      )
    }

    const total = data.length
    const page = filter?.page || 1
    const limit = filter?.limit || PAGINATION.defaultLimit
    const start = (page - 1) * limit
    const items = data.slice(start, start + limit)

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  try {
    const res = await gasGet<PaginatedResponse<DataProspek>>('getProspek', {
      status: filter?.status,
      idAnalis: filter?.idAnalis,
      kecamatan: filter?.kecamatan,
      komoditas: filter?.komoditas,
      dateFrom: filter?.dateFrom,
      dateTo: filter?.dateTo,
      search: filter?.search,
      page: filter?.page,
      limit: filter?.limit,
    })
    if (res && res.items) {
      if (filter?.limit === 5) {
        setLocalCache('prospek_dashboard', res)
      } else if (!filter || Object.keys(filter).length === 0 || filter.limit === 100) {
        setLocalCache('prospek_all', res)
      }
    }
    return res
  } catch (err) {
    const cacheKey = filter?.limit === 5 ? 'prospek_dashboard' : 'prospek_all'
    const cached = getLocalCache<PaginatedResponse<DataProspek>>(cacheKey)
    if (cached) return cached
    throw err
  }
}

export async function getProspekById(idProspek: string): Promise<DataProspek | null> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    return MOCK_PROSPEK.find((p) => p.idProspek === idProspek) ?? null
  }
  return gasGet<DataProspek | null>('getProspek', { idProspek })
}

export async function createProspek(form: CreateProspekForm): Promise<DataProspek> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 800))
    const newProspek: DataProspek = {
      idProspek: `P${Date.now()}`,
      kecamatan: form.idKecamatan, // akan di-resolve dari master wilayah
      ...form,
      idAnalis: form.idAnalis ?? 'AN001',
      namaAnalis: form.namaAnalis ?? 'Budi Santoso',
      status: 'BARU',
      tanggal: new Date().toISOString().split('T')[0],
    }
    return newProspek
  }
  return gasPost<DataProspek>('createProspek', { ...form })
}

/** Ubah isi prospek yang sudah ada. Kolom kunci tidak dikirim sama sekali. */
export async function updateProspek(form: UpdateProspekForm): Promise<DataProspek> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 600))
    const list = [...MOCK_PROSPEK]
    const i = list.findIndex((p) => p.idProspek === form.idProspek)
    if (i < 0) throw new Error('Prospek tidak ditemukan: ' + form.idProspek)
    list[i] = { ...list[i], ...form }
    return list[i]
  }
  return gasPost<DataProspek>('updateProspek', { ...form })
}

/**
 * Hapus prospek = nonaktifkan (soft delete). Backend mengubah status jadi
 * TIDAK_POTENSIAL dan menambahkan penanda di CATATAN; barisnya tidak dihapus
 * dari sheet supaya DATA_SURVEY yang mereferensikan ID_PROSPEK tidak yatim.
 */
export async function deleteProspek(
  idProspek: string,
  alasan?: string
): Promise<DeleteProspekResult> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400))
    const found = MOCK_PROSPEK.find((p) => p.idProspek === idProspek)
    if (!found) throw new Error('Prospek tidak ditemukan: ' + idProspek)
    return {
      ok: true,
      sudahNonaktif: found.status === 'TIDAK_POTENSIAL',
      jumlahSurvey: 0,
      prospek: { ...found, status: 'TIDAK_POTENSIAL' },
    }
  }
  return gasPost<DeleteProspekResult>('deleteProspek', { idProspek, alasan })
}

/** Kembalikan prospek yang dinonaktifkan, sekalian buang penanda CATATAN. */
export async function restoreProspek(
  idProspek: string,
  status: StatusProspek = 'BARU'
): Promise<DataProspek> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400))
    const found = MOCK_PROSPEK.find((p) => p.idProspek === idProspek)
    if (!found) throw new Error('Prospek tidak ditemukan: ' + idProspek)
    return { ...found, status }
  }
  return gasPost<DataProspek>('restoreProspek', { idProspek, status })
}
