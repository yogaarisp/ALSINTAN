// ============================================================
// SIAP ALSINTAN — API Service: Survey
// ============================================================
// Sumber data: sheet DATA_SURVEY di Google Spreadsheet (via Apps Script)
// ============================================================

import type { DataSurvey, SurveyFilter, PaginatedResponse } from '@/lib/types'
import { gasGet, gasPost } from './gas'

export async function getSurvey(filter?: SurveyFilter): Promise<PaginatedResponse<DataSurvey>> {
  return gasGet<PaginatedResponse<DataSurvey>>('getSurvey', {
    status: filter?.status,
    idAO: filter?.idAO,
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
  idProspek: string
  namaGapoktan: string
  jumlahAnggota?: number
  luasSawah?: number
  jenisAlsintan?: string
  estimasiHarga?: number
  latitude?: number
  longitude?: number
  accuracy?: number
  catatan?: string
  idAO?: string
  namaAO?: string
  fotoBase64?: string
  fotoName?: string
}

export async function createSurvey(form: CreateSurveyPayload): Promise<DataSurvey> {
  return gasPost<DataSurvey>('createSurvey', { ...form })
}
