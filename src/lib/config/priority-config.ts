// ============================================================
// SIAP ALSINTAN — Priority Score Configuration
// ============================================================
// ⚠️  [DEVELOPMENT ONLY]
// Formula dan bobot di bawah ini BELUM disepakati oleh stakeholder.
// JANGAN gunakan nilai ini untuk keputusan bisnis production.
// Ref: PRD Section 5, NEED_CONFIRMATION.md NC1
// ============================================================

import type { PriorityLevel } from '@/lib/types'

export interface PriorityWeights {
  luasLahan: number       // bobot luas lahan (0-1)
  jumlahGapoktan: number  // bobot jumlah gapoktan (0-1)
  produksi: number        // bobot data produksi/panen (0-1)
  prospekExisting: number // bobot prospek yang sudah ada (0-1)
}

export interface PriorityThresholds {
  tinggi: number   // score >= ini → TINGGI
  sedang: number   // score >= ini → SEDANG, else RENDAH
}

export interface PriorityNormalization {
  luasLahan: { max: number }
  jumlahGapoktan: { max: number }
  produksi: { max: number }
  prospekExisting: { max: number; inverse: boolean }
}

export interface PriorityConfig {
  isDevelopmentOnly: boolean
  version: string
  lastUpdated: string
  weights: PriorityWeights
  thresholds: PriorityThresholds
  normalization: PriorityNormalization
}

// ⚠️  [DEVELOPMENT ONLY] — Nilai placeholder untuk development
export const PRIORITY_CONFIG: PriorityConfig = {
  isDevelopmentOnly: true,
  version: 'dev-0.1',
  lastUpdated: '2026-08-27',

  // ⚠️  TODO: CONFIRM bobot dengan stakeholder — NC1
  weights: {
    luasLahan: 0.30,        // TODO: CONFIRM
    jumlahGapoktan: 0.25,   // TODO: CONFIRM
    produksi: 0.25,         // TODO: CONFIRM
    prospekExisting: 0.20,  // TODO: CONFIRM (inverse: semakin sedikit → makin perlu diprospek)
  },

  // ⚠️  TODO: CONFIRM threshold dengan stakeholder — NC1
  thresholds: {
    tinggi: 70,  // TODO: CONFIRM — PRD menyebut 90-100 sebagai contoh saja
    sedang: 40,  // TODO: CONFIRM — PRD menyebut 70-89 sebagai contoh saja
  },

  // Max values untuk normalisasi (disesuaikan dengan data actual)
  // TODO: CONFIRM max values berdasarkan data aktual wilayah
  normalization: {
    luasLahan: { max: 5000 },       // Hektar — TODO: CONFIRM
    jumlahGapoktan: { max: 100 },   // unit — TODO: CONFIRM
    produksi: { max: 10000 },       // ton — TODO: CONFIRM
    prospekExisting: {
      max: 20,
      inverse: true,  // Sedikit prospek = peluang lebih besar
    },
  },
}

export function getPriorityLevel(score: number): PriorityLevel {
  if (score >= PRIORITY_CONFIG.thresholds.tinggi) return 'TINGGI'
  if (score >= PRIORITY_CONFIG.thresholds.sedang) return 'SEDANG'
  return 'RENDAH'
}

export function getPriorityLevelLabel(level: PriorityLevel): string {
  const labels: Record<PriorityLevel, string> = {
    TINGGI: 'Prioritas Tinggi',
    SEDANG: 'Prioritas Sedang',
    RENDAH: 'Prioritas Rendah',
  }
  return labels[level]
}
