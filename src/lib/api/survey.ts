// ============================================================
// SIAP ALSINTAN — API Service: Survey
// ============================================================
// Sumber data: sheet DATA_SURVEY di Google Spreadsheet (via Apps Script)
// ============================================================

import type { DataSurvey, SurveyFilter, PaginatedResponse, UpdateSurveyForm, RekapPencairan, StatusSurvey } from '@/lib/types'
import { gasGet, gasPost } from './gas'

export async function getSurvey(filter?: SurveyFilter): Promise<PaginatedResponse<DataSurvey>> {
  return gasGet<PaginatedResponse<DataSurvey>>('getSurvey', {
    status: filter?.status,
    idAnalis: filter?.idAnalis,
    dateFrom: filter?.dateFrom,
    dateTo: filter?.dateTo,
    page: filter?.page,
    limit: filter?.limit,
  })
}

export async function getSurveyById(idSurvey: string): Promise<DataSurvey | null> {
  return gasGet<DataSurvey | null>('getSurvey', { idSurvey })
}

// Payload survey — foto dikirim sebagai base64 (disimpan ke Drive oleh Apps Script)
export interface CreateSurveyPayload {
  idProspek?: string
  kecamatan?: string
  namaProspek?: string
  namaGapoktan?: string
  namaKetua?: string
  jumlahAnggota?: number
  luasSawah?: number
  jenisAlsintan?: string
  estimasiHarga?: number
  estimasiPlafon?: number
  latitude?: number
  longitude?: number
  accuracy?: number
  catatan?: string
  idAnalis?: string
  namaAnalis?: string
  fotoBase64?: string
  fotoName?: string
  status?: StatusSurvey
}

export async function createSurvey(form: CreateSurveyPayload): Promise<DataSurvey> {
  return gasPost<DataSurvey>('createSurvey', {
    ...form,
    namaGapoktan: form.namaGapoktan || form.namaProspek,
    namaProspek: form.namaProspek || form.namaGapoktan,
  })
}

export async function updateSurvey(form: UpdateSurveyForm): Promise<DataSurvey> {
  return gasPost<DataSurvey>('updateSurvey', { ...form })
}

export async function getRekapPencairan(filter?: {
  idProspek?: string
  kecamatan?: string
  search?: string
  page?: number
  limit?: number
}): Promise<PaginatedResponse<RekapPencairan>> {
  return gasGet<PaginatedResponse<RekapPencairan>>('getRekapPencairan', { ...filter })
}
