// ============================================================
// SIAP ALSINTAN — API Client
// ============================================================
// HTTP client untuk komunikasi ke Google Apps Script
// Credential tidak diekspos di frontend — URL dari env variable
// ============================================================

import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { API_CONFIG } from '@/lib/config/app-config'
import type { ApiResponse } from '@/lib/types'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.gasApiUrl,
      timeout: API_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Tambahkan API key jika ada
        if (API_CONFIG.gasApiKey) {
          config.params = {
            ...config.params,
            key: API_CONFIG.gasApiKey,
          }
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Jangan ekspos detail error internal ke user
        const message = this.getErrorMessage(error)
        return Promise.reject(new Error(message))
      }
    )
  }

  private getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') return 'Request timeout. Coba lagi.'
      if (error.response?.status === 401) return 'Sesi berakhir. Silakan login kembali.'
      if (error.response?.status === 403) return 'Anda tidak memiliki akses ke resource ini.'
      if (error.response?.status === 404) return 'Data tidak ditemukan.'
      if (error.response?.status && error.response.status >= 500) return 'Server error. Hubungi administrator.'
      return error.message || 'Terjadi kesalahan.'
    }
    return 'Terjadi kesalahan yang tidak diketahui.'
  }

  async get<T>(path: string, params?: Record<string, unknown>, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(path, {
      params: { action: path.replace('/', ''), ...params },
      ...config,
    })
    return response.data
  }

  async post<T>(path: string, data: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    // GAS: kirim sebagai text/plain supaya browser tidak melakukan CORS preflight
    const response = await this.client.post<ApiResponse<T>>(path, data, {
      ...config,
      headers: { 'Content-Type': 'text/plain;charset=utf-8', ...(config?.headers ?? {}) },
    })
    return response.data
  }

  async put<T>(path: string, data: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(path, data, config)
    return response.data
  }
}

export const apiClient = new ApiClient()
