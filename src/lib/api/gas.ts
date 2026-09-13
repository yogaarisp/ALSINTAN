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

function isGasJson(res: unknown): res is ApiResponse<unknown> {
  return Boolean(res && typeof res === 'object' && 'success' in res)
}

// GAS kadang mengembalikan HTML error (404 echo) sesaat — coba ulang 1x
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fn()
      if (isGasJson(res) || i === attempts - 1) return res
    } catch (err) {
      lastError = err
      if (i === attempts - 1) throw err
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw lastError
}

function assertGasResponse(res: unknown): asserts res is ApiResponse<unknown> {
  if (!isGasJson(res)) {
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
  const res = await withRetry(() => apiClient.get<unknown>('', { action, ...params }))
  assertGasResponse(res)
  return res.data as T
}

export async function gasPost<T>(action: string, payload?: Record<string, unknown>): Promise<T> {
  const res = await withRetry(() => apiClient.post<unknown>('', { action, ...(payload ?? {}) }))
  assertGasResponse(res)
  return res.data as T
}
