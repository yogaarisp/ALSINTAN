// ============================================================
// SIAP ALSINTAN — Priority Analysis Engine
// ============================================================
// ⚠️  [DEVELOPMENT ONLY]
// Formula ini BELUM disepakati oleh stakeholder.
// Ref: PRD Section 5 & 6, NEED_CONFIRMATION NC1
// ============================================================

import { PRIORITY_CONFIG, getPriorityLevel } from '@/lib/config/priority-config'
import type { MasterWilayah, DataProspek, PriorityScoreResult } from '@/lib/types'

export interface PriorityInput {
  wilayah: MasterWilayah
  prospeks?: DataProspek[]
}

/**
 * Normalisasi nilai ke 0-100
 */
function normalize(value: number, max: number, inverse = false): number {
  if (max === 0) return 0
  const normalized = Math.min((value / max) * 100, 100)
  return inverse ? 100 - normalized : normalized
}

/**
 * ⚠️  [DEVELOPMENT ONLY]
 * Hitung Priority Score untuk satu wilayah kecamatan.
 * Formula dan bobot BELUM disepakati stakeholder — jangan gunakan untuk produksi.
 */
export function calculatePriorityScore(input: PriorityInput): PriorityScoreResult {
  const { wilayah, prospeks = [] } = input
  const norm = PRIORITY_CONFIG.normalization
  const weights = PRIORITY_CONFIG.weights

  // Normalisasi setiap komponen
  const luasLahanScore = normalize(wilayah.luasLahan, norm.luasLahan.max)
  const gapoktanScore = normalize(wilayah.jumlahGapoktan, norm.jumlahGapoktan.max)
  const produksiScore = normalize(
    wilayah.dataPanen || wilayah.dataProduksi || 0,
    norm.produksi.max
  )
  const prospekScore = normalize(
    prospeks.length,
    norm.prospekExisting.max,
    norm.prospekExisting.inverse
  )

  // Hitung weighted score
  const rawScore =
    luasLahanScore * weights.luasLahan +
    gapoktanScore * weights.jumlahGapoktan +
    produksiScore * weights.produksi +
    prospekScore * weights.prospekExisting

  const score = Math.round(Math.min(rawScore, 100))
  const level = getPriorityLevel(score)

  return {
    idKecamatan: wilayah.idKecamatan,
    kecamatan: wilayah.kecamatan,
    score,
    level,
    rank: 0, // akan diisi setelah sort
    components: {
      luasLahan: Math.round(luasLahanScore),
      jumlahGapoktan: Math.round(gapoktanScore),
      produksi: Math.round(produksiScore),
      prospekExisting: Math.round(prospekScore),
    },
    calculatedAt: new Date().toISOString(),
    isDevOnly: PRIORITY_CONFIG.isDevelopmentOnly,
  }
}

/**
 * ⚠️  [DEVELOPMENT ONLY]
 * Hitung dan ranking semua wilayah.
 */
export function rankWilayah(
  wilayahList: MasterWilayah[],
  allProspeks: DataProspek[]
): PriorityScoreResult[] {
  const results = wilayahList.map((wilayah) => {
    const wilayahProspeks = allProspeks.filter(
      (p) => p.idKecamatan === wilayah.idKecamatan
    )
    return calculatePriorityScore({ wilayah, prospeks: wilayahProspeks })
  })

  // Sort descending by score, assign rank
  results.sort((a, b) => b.score - a.score)
  results.forEach((r, i) => {
    r.rank = i + 1
  })

  return results
}
