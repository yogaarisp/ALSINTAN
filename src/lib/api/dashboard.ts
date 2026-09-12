// ============================================================
// SIAP ALSINTAN — API Service: Dashboard
// ============================================================
// KPI dihitung langsung dari MASTER_WILAYAH + DATA_PROSPEK + MASTER_AO
// di Apps Script, sehingga angka selalu sinkron dengan spreadsheet
// ============================================================

import type { DashboardKPI } from '@/lib/types'
import { MOCK_DASHBOARD_KPI } from '@/lib/mock/mock-data'
import { gasGet, isGasConfigured } from './gas'

const USE_MOCK = !isGasConfigured

export async function getDashboardKPI(): Promise<DashboardKPI> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 600))
    return { ...MOCK_DASHBOARD_KPI }
  }
  return gasGet<DashboardKPI>('getDashboardKPI')
}
