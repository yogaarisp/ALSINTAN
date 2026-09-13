// ============================================================
// SIAP ALSINTAN — API Service: Survey
// ============================================================
// Sumber data: sheet DATA_SURVEY di Google Spreadsheet (via Apps Script)
// ============================================================

import type { DataSurvey, SurveyFilter, PaginatedResponse, CreateSurveyForm } from '@/lib/types'
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

// Catatan: foto (FileList) belum dikirim — penyimpanan file menunggu NC5
export async function createSurvey(form: Omit<CreateSurveyForm, 'foto'>): Promise<DataSurvey> {
  return gasPost<DataSurvey>('createSurvey', { ...form })
}
