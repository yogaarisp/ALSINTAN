// ============================================================
// SIAP ALSINTAN — API Service: Prospek
// ============================================================
// Sumber data: sheet DATA_PROSPEK di Google Spreadsheet (via Apps Script)
// ============================================================

import type { DataProspek, ProspekFilter, PaginatedResponse, CreateProspekForm } from '@/lib/types'
import { MOCK_PROSPEK } from '@/lib/mock/mock-data'
import { PAGINATION } from '@/lib/config/app-config'
import { gasGet, gasPost, isGasConfigured } from './gas'

const USE_MOCK = !isGasConfigured

export async function getProspek(filter?: ProspekFilter): Promise<PaginatedResponse<DataProspek>> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500))
    let data = [...MOCK_PROSPEK]

    if (filter?.status) data = data.filter((p) => p.status === filter.status)
    if (filter?.idAO) data = data.filter((p) => p.idAO === filter.idAO)
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

  return gasGet<PaginatedResponse<DataProspek>>('getProspek', {
    status: filter?.status,
    idAO: filter?.idAO,
    kecamatan: filter?.kecamatan,
    komoditas: filter?.komoditas,
    dateFrom: filter?.dateFrom,
    dateTo: filter?.dateTo,
    search: filter?.search,
    page: filter?.page,
    limit: filter?.limit,
  })
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
      idAO: 'AO001', // akan diisi dari auth session
      namaAO: 'Budi Santoso',
      status: 'BARU',
      tanggal: new Date().toISOString().split('T')[0],
    }
    return newProspek
  }
  return gasPost<DataProspek>('createProspek', { ...form })
}
