// ============================================================
// SIAP ALSINTAN — API Service: Dashboard
// ============================================================

import { API_CONFIG } from '@/lib/config/app-config'
import type { DashboardKPI } from '@/lib/types'
import { MOCK_DASHBOARD_KPI } from '@/lib/mock/mock-data'

const USE_MOCK = !API_CONFIG.gasApiUrl || API_CONFIG.gasApiUrl.includes('PLACEHOLDER')

export async function getDashboardKPI(): Promise<DashboardKPI> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 600))
    return { ...MOCK_DASHBOARD_KPI }
  }
  // TODO: GAS call setelah NC2 dikonfirmasi
  throw new Error('GAS API belum dikonfigurasi')
}
