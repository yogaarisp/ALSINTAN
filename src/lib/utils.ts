// ============================================================
// SIAP ALSINTAN — Utility Functions
// ============================================================

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { PriorityLevel, StatusProspek, StatusSurvey, UserRole } from '@/lib/types'

// ─────────────────────────────────────────
// Tailwind class utility
// ─────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─────────────────────────────────────────
// Format currency (Rupiah)
// ─────────────────────────────────────────
export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// ─────────────────────────────────────────
// Format angka dengan separator
// ─────────────────────────────────────────
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value)
}

// ─────────────────────────────────────────
// Format Hektar
// ─────────────────────────────────────────
export function formatHektar(value: number): string {
  return `${formatNumber(value)} Ha`
}

// ─────────────────────────────────────────
// Format tanggal
// ─────────────────────────────────────────
export function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

// ─────────────────────────────────────────
// Priority Level display
// ─────────────────────────────────────────
export function getPriorityLevelInfo(level: PriorityLevel) {
  const map = {
    TINGGI: {
      label: 'Prioritas Tinggi',
      color: 'text-red-600',
      bg: 'bg-red-50',
      badge: 'bg-red-100 text-red-700 border-red-200',
      dot: 'bg-red-500',
    },
    SEDANG: {
      label: 'Prioritas Sedang',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      badge: 'bg-amber-100 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
    },
    RENDAH: {
      label: 'Prioritas Rendah',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      badge: 'bg-blue-100 text-blue-700 border-blue-200',
      dot: 'bg-blue-400',
    },
  }
  return map[level]
}

// ─────────────────────────────────────────
// Status Prospek display
// ─────────────────────────────────────────
export function getStatusProspekInfo(status: StatusProspek) {
  const map = {
    BARU: { label: 'Baru', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
    DALAM_PROSPEK: { label: 'Dalam Prospek', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
    SURVEY: { label: 'Survey', badge: 'bg-purple-100 text-purple-700 border-purple-200' },
    POTENSIAL: { label: 'Potensial', badge: 'bg-green-100 text-green-700 border-green-200' },
    TIDAK_POTENSIAL: { label: 'Tidak Potensial', badge: 'bg-red-100 text-red-700 border-red-200' },
    CLOSING: { label: 'Closing', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  }
  return map[status]
}

// ─────────────────────────────────────────
// Status Survey display
// ─────────────────────────────────────────
export function getStatusSurveyInfo(status: StatusSurvey) {
  const map = {
    BELUM_SURVEY: { label: 'Belum Survey', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
    SURVEY_BERJALAN: { label: 'Berjalan', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
    SURVEY_SELESAI: { label: 'Selesai', badge: 'bg-green-100 text-green-700 border-green-200' },
    DIVERIFIKASI: { label: 'Diverifikasi', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  }
  return map[status]
}

// ─────────────────────────────────────────
// Role display
// ─────────────────────────────────────────
export function getRoleInfo(role: UserRole) {
  const map = {
    ADMIN: { label: 'Admin', badge: 'bg-purple-100 text-purple-700' },
    AO: { label: 'Account Officer', badge: 'bg-blue-100 text-blue-700' },
    MANAJEMEN: { label: 'Manajemen', badge: 'bg-green-100 text-green-700' },
  }
  return map[role]
}

// ─────────────────────────────────────────
// Debounce
// ─────────────────────────────────────────
export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}

// ─────────────────────────────────────────
// Score color gradient
// ─────────────────────────────────────────
export function getScoreColor(score: number): string {
  if (score >= 70) return 'text-red-600'
  if (score >= 40) return 'text-amber-600'
  return 'text-blue-600'
}

export function getScoreBarColor(score: number): string {
  if (score >= 70) return 'bg-red-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-blue-400'
}
