// ============================================================
// SIAP ALSINTAN — API Service: Dashboard
// ============================================================
// KPI dihitung langsung dari MASTER_WILAYAH + DATA_PROSPEK + MASTER_AO
// di Apps Script, sehingga angka selalu sinkron dengan spreadsheet
// ============================================================

import type { DashboardKPI } from '@/lib/types'
import { MOCK_DASHBOARD_KPI } from '@/lib/mock/mock-data'
import { getLocalCache, setLocalCache } from '@/lib/utils/cache'
import { gasGet, isGasConfigured } from './gas'

const USE_MOCK = !isGasConfigured

export async function getDashboardKPI(): Promise<DashboardKPI> {
  if (USE_MOCK) {
    return { ...MOCK_DASHBOARD_KPI }
  }
  try {
    const data = await gasGet<DashboardKPI>('getDashboardKPI')
    if (data) {
      setLocalCache('dashboard_kpi', data)
    }
    return data
  } catch (err) {
    const cached = getLocalCache<DashboardKPI>('dashboard_kpi')
    if (cached) return cached
    throw err
  }
}
