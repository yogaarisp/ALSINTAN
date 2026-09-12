// ============================================================
// SIAP ALSINTAN — GAS (Apps Script) Call Helpers
// ============================================================
// Semua module API melewati sini. Response GAS mengikuti kontrak
// API.md: { success, data, error?, timestamp? }
// ============================================================

import { API_CONFIG } from '@/lib/config/app-config'
import { apiClient } from './client'
import type { ApiResponse } from '@/lib/types'

export const isGasConfigured =
  Boolean(API_CONFIG.gasApiUrl) && !API_CONFIG.gasApiUrl.includes('PLACEHOLDER')

function assertGasResponse(res: unknown): asserts res is ApiResponse<unknown> {
  if (!res || typeof res !== 'object' || !('success' in res)) {
    throw new Error(
      'Respon tidak valid dari Apps Script. Pastikan Web App sudah di-deploy dan diotorisasi.',
    )
  }
  const gas = res as ApiResponse<unknown>
  if (!gas.success) {
    throw new Error(gas.error || 'Gagal mengambil data dari spreadsheet')
  }
}

export async function gasGet<T>(action: string, params?: Record<string, unknown>): Promise<T> {
  const res = await apiClient.get<unknown>('', { action, ...params })
  assertGasResponse(res)
  return res.data as T
}

export async function gasPost<T>(action: string, payload?: Record<string, unknown>): Promise<T> {
  const res = await apiClient.post<unknown>('', { action, ...(payload ?? {}) })
  assertGasResponse(res)
  return res.data as T
}
