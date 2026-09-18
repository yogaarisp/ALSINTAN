import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Building2,
  Users2,
  Trees,
  TrendingUp,
  MapPin,
  ArrowUpRight,
  UserCheck,
  AlertCircle,
  Clock,
  Sparkles,
  X,
  Trophy,
  Medal,
  ChevronRight,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { getDashboardKPI } from '@/lib/api/dashboard'
import { getWilayah } from '@/lib/api/wilayah'
import { getProspek } from '@/lib/api/prospek'
import { rankWilayah } from '@/lib/services/priority-engine'
import {
  formatHektar,
  formatNumber,
  formatDate,
  getPriorityLevelInfo,
  getStatusProspekInfo,
} from '@/lib/utils'

import { getLocalCache } from '@/lib/utils/cache'
import { MOCK_DASHBOARD_KPI, MOCK_WILAYAH, MOCK_PROSPEK } from '@/lib/mock/mock-data'
import type { DashboardKPI, MasterWilayah } from '@/lib/types'

const PIE_COLORS = ['#16a34a', '#0284c7', '#8b5cf6', '#f59e0b', '#ef4444']

export default function DashboardPage() {
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const {
    data: kpi,
    isFetching: fetchingKpi,
    error: errorKpi,
  } = useQuery({
    queryKey: ['dashboard', 'kpi'],
    queryFn: getDashboardKPI,
    initialData: () => getLocalCache<DashboardKPI>('dashboard_kpi') ?? MOCK_DASHBOARD_KPI,
    initialDataUpdatedAt: 0,
  })

  const {
    data: wilayahList = [],
    isFetching: fetchingWilayah,
  } = useQuery({
    queryKey: ['wilayah'],
    queryFn: () => getWilayah(),
    initialData: () => getLocalCache<MasterWilayah[]>('wilayah_all') ?? MOCK_WILAYAH,
    initialDataUpdatedAt: 0,
  })

  const {
    data: prospekData,
    isFetching: fetchingProspek,
  } = useQuery({
    queryKey: ['prospek', { limit: 5 }],
    queryFn: () => getProspek({ limit: 5 }),
    initialData: () =>
      getLocalCache('prospek_dashboard') ?? {
        items: MOCK_PROSPEK.slice(0, 5),
        total: MOCK_PROSPEK.length,
        page: 1,
        limit: 5,
        totalPages: Math.ceil(MOCK_PROSPEK.length / 5),
      },
    initialDataUpdatedAt: 0,
  })

  const isRefreshing = fetchingKpi || fetchingWilayah || fetchingProspek

  // Calculate priority ranking from all wilayah and prospek
  const rankedWilayah = rankWilayah(wilayahList, prospekData?.items || []).slice(0, 4)

  // Chart data: Luas Lahan per Kecamatan
  const chartLahan = wilayahList.map((w) => ({
    name: w.kecamatan,
    luas: w.luasLahan,
    gapoktan: w.jumlahGapoktan,
  }))

  // Chart data: Prospek status breakdown
  const statusCounts: Record<string, number> = {}
  prospekData?.items?.forEach((p) => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
  })
  const chartStatus = Object.entries(statusCounts).map(([status, count]) => ({
    name: getStatusProspekInfo(status as any).label,
    value: count,
  }))

  const totalProspekCount = prospekData?.total || prospekData?.items?.length || 0
  const isLoading = !kpi && wilayahList.length === 0

  if (errorKpi) {
    return (
      <div className="error-state card">
        <AlertCircle size={40} style={{ marginBottom: 12, color: '#dc2626' }} />
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Gagal Memuat Data Dashboard</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>
          {errorKpi instanceof Error ? errorKpi.message : 'Terjadi kesalahan sistem'}
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Dev preview alert banner (Dismissible) */}
      {!bannerDismissed && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.7) 0%, rgba(254, 240, 138, 0.4) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 12,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: '#fef3c7',
                border: '1px solid #fde68a',
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles size={15} />
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#92400e', lineHeight: 1.4 }}>
              <strong>Fase 1 Development Preview:</strong> Data terhubung dengan simulasi Google Spreadsheet & Priority Engine. Bobot skor simulasi <em>[DEVELOPMENT ONLY]</em>.
            </div>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#92400e',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.7,
            }}
            aria-label="Tutup pemberitahuan"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Hero Page Header */}
      <div className="dashboard-hero">
        <div style={{ maxWidth: 680 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#15803d',
                background: '#dcfce7',
                padding: '2px 8px',
                borderRadius: 999,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Activity size={12} /> Executive Overview
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Kabupaten Purworejo
            </span>
            {isRefreshing && (
              <span
                style={{
                  fontSize: '0.725rem',
                  fontWeight: 600,
                  color: '#059669',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  padding: '2px 8px',
                  borderRadius: 999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.25)',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
                Menyinkronkan spreadsheet...
              </span>
            )}
          </div>

          <h1
            style={{
              fontSize: '1.625rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
            }}
          >
            Executive Dashboard Alsintan
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: 6, lineHeight: 1.5 }}>
            Pemetaan potensi wilayah pertanian, integrasi data LBS 2024, dan sistem rekomendasi prioritas prospek alsintan untuk optimalisasi operasional tim lapangan.
          </p>
        </div>

        {/* Action CTA Buttons */}
        <div className="dashboard-hero-actions">
          <Link
            to="/prioritas"
            className="btn btn-primary"
            style={{
              boxShadow: '0 4px 12px 0 rgba(22, 163, 74, 0.25)',
              padding: '10px 18px',
              borderRadius: 10,
              fontWeight: 600,
            }}
          >
            <TrendingUp size={16} />
            Lihat Ranking Wilayah
          </Link>
          <Link
            to="/peta"
            className="btn btn-secondary"
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              fontWeight: 600,
            }}
          >
            <MapPin size={16} color="#16a34a" />
            Buka Peta Potensi
          </Link>
        </div>
      </div>

      {/* KPI Cards Responsive Grid */}
      <div className="dashboard-kpi-grid">
        {/* Total Wilayah / Kecamatan */}
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>
                Total Kecamatan
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: 6, letterSpacing: '-0.02em' }}>
                {isLoading ? <div className="skeleton" style={{ height: 32, width: 60 }} /> : kpi?.totalKecamatan || 16}
              </div>
            </div>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Building2 size={20} />
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Purworejo, Jateng</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#15803d', background: '#f0fdf4', padding: '1px 6px', borderRadius: 4 }}>
              100% Terdata
            </span>
          </div>
        </div>

        {/* Total Gapoktan */}
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>
                Total Gapoktan
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: 6, letterSpacing: '-0.02em' }}>
                {isLoading ? <div className="skeleton" style={{ height: 32, width: 80 }} /> : formatNumber(kpi?.totalGapoktan || 0)}
              </div>
            </div>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #ccfbf1, #99f6e4)',
                color: '#0f766e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Users2 size={20} />
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Kelompok Tani</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#0f766e', background: '#f0fdfa', padding: '1px 6px', borderRadius: 4 }}>
              Distan Purworejo
            </span>
          </div>
        </div>

        {/* Total Luas Lahan */}
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>
                Total Luas Lahan
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: 6, letterSpacing: '-0.02em' }}>
                {isLoading ? <div className="skeleton" style={{ height: 32, width: 110 }} /> : formatHektar(kpi?.totalLuasLahan || 0)}
              </div>
            </div>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Trees size={20} />
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Potensi Sawah & Lahan</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#1d4ed8', background: '#eff6ff', padding: '1px 6px', borderRadius: 4 }}>
              LBS 2024
            </span>
          </div>
        </div>

        {/* Prospek Aktif */}
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>
                Prospek Aktif
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: 6, letterSpacing: '-0.02em' }}>
                {isLoading ? <div className="skeleton" style={{ height: 32, width: 50 }} /> : kpi?.prospekBaru || 0}
              </div>
            </div>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
                color: '#6d28d9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Pipeline Alsintan</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6d28d9', background: '#f5f3ff', padding: '1px 6px', borderRadius: 4 }}>
              Berjalan
            </span>
          </div>
        </div>

        {/* AO Aktif */}
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>
                AO Lapangan
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: 6, letterSpacing: '-0.02em' }}>
                {isLoading ? <div className="skeleton" style={{ height: 32, width: 50 }} /> : kpi?.aoAktif || 1}
              </div>
            </div>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #fce7f3, #fbcfe8)',
                color: '#be185d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <UserCheck size={20} />
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Account Officer</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#be185d', background: '#fdf2f8', padding: '1px 6px', borderRadius: 4 }}>
              Aktif Budi Santoso
            </span>
          </div>
        </div>
      </div>

      {/* Top Rekomendasi Wilayah Prioritas (Decision Support) */}
      <div className="card">
        <div className="card-header" style={{ padding: '18px 24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#0f172a' }}>
                Rekomendasi Wilayah Prioritas Prospek
              </h2>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: '#15803d',
                  background: '#dcfce7',
                  padding: '2px 8px',
                  borderRadius: 999,
                }}
              >
                Algoritma AI
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 2 }}>
              Dihitung berdasarkan pembobotan luas lahan sawah, estimasi produksi panen, dan kepadatan gapoktan.
            </p>
          </div>
          <Link
            to="/prioritas"
            className="btn btn-ghost btn-sm"
            style={{ color: '#16a34a', fontWeight: 600, gap: 4 }}
          >
            Lihat Semua 16 Wilayah <ArrowUpRight size={15} />
          </Link>
        </div>

        <div className="card-body" style={{ padding: 24 }}>
          <div className="dashboard-priority-grid">
            {isLoading
              ? [1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton" style={{ height: 160, borderRadius: 12 }} />
                ))
              : rankedWilayah.map((rw) => {
                  const levelInfo = getPriorityLevelInfo(rw.level)
                  const isTop1 = rw.rank === 1
                  const isTop2 = rw.rank === 2
                  const isTop3 = rw.rank === 3

                  // Medal info
                  const medalBadge = isTop1
                    ? { bg: '#fef3c7', border: '#fde68a', text: '#b45309', label: '#1', icon: Trophy }
                    : isTop2
                    ? { bg: '#f1f5f9', border: '#e2e8f0', text: '#475569', label: '#2', icon: Medal }
                    : isTop3
                    ? { bg: '#ffedd5', border: '#fed7aa', text: '#c2410c', label: '#3', icon: Medal }
                    : { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', label: `#${rw.rank}`, icon: Layers }

                  const IconComp = medalBadge.icon

                  return (
                    <div
                      key={rw.idKecamatan}
                      style={{
                        padding: 18,
                        borderRadius: 14,
                        border: isTop1 ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                        background: isTop1
                          ? 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)'
                          : '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: isTop1
                          ? '0 4px 12px 0 rgba(22, 163, 74, 0.08)'
                          : '0 1px 2px 0 rgba(0,0,0,0.02)',
                        transition: 'all 200ms ease',
                      }}
                    >
                      <div>
                        {/* Top Badge & Level */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 10,
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: medalBadge.bg,
                              color: medalBadge.text,
                              border: `1px solid ${medalBadge.border}`,
                              padding: '2px 8px',
                              borderRadius: 999,
                            }}
                          >
                            <IconComp size={13} /> {medalBadge.label}
                          </span>
                          <span className={`badge ${levelInfo.badge}`} style={{ fontSize: '0.7rem' }}>
                            {levelInfo.label}
                          </span>
                        </div>

                        {/* Kecamatan Name */}
                        <div
                          style={{
                            fontSize: '1.125rem',
                            fontWeight: 700,
                            color: '#0f172a',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          Kec. {rw.kecamatan}
                        </div>

                        {/* Score progress meter */}
                        <div style={{ marginTop: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Skor Potensi</span>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#15803d' }}>
                              {rw.score}/100
                            </span>
                          </div>
                          <div
                            style={{
                              height: 6,
                              borderRadius: 999,
                              background: '#e2e8f0',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${rw.score}%`,
                                background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                                borderRadius: 999,
                                transition: 'width 0.6s ease',
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* CTA Link */}
                      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                        <Link
                          to={`/prospek?kecamatan=${encodeURIComponent(rw.kecamatan)}`}
                          className="btn btn-secondary btn-sm"
                          style={{
                            width: '100%',
                            justifyContent: 'center',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            gap: 6,
                          }}
                        >
                          Lihat Prospek Wilayah <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>
                  )
                })}
          </div>
        </div>
      </div>

      {/* Analytics Charts Responsive Grid */}
      <div className="dashboard-charts-grid">
        {/* Chart 1: Luas Lahan per Kecamatan */}
        <div className="card">
          <div className="card-header" style={{ padding: '16px 20px' }}>
            <div>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
                Potensi Luas Lahan per Kecamatan (Ha)
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Data LBS Kementerian Pertanian 2024
              </p>
            </div>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#15803d',
                background: '#f0fdf4',
                padding: '2px 8px',
                borderRadius: 999,
                border: '1px solid #bbf7d0',
              }}
            >
              16 Kecamatan
            </span>
          </div>
          <div className="card-body" style={{ height: 300, padding: '16px 12px 12px' }}>
            {isLoading ? (
              <div className="skeleton" style={{ height: '100%' }} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartLahan} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                  <XAxis
                    dataKey="name"
                    angle={-28}
                    textAnchor="end"
                    interval={0}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val: any) => [`${formatNumber(Number(val) || 0)} Ha`, 'Luas Lahan']}
                    contentStyle={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: '0.8125rem',
                    }}
                  />
                  <Bar
                    dataKey="luas"
                    fill="#16a34a"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Status Pipeline Prospek */}
        <div className="card">
          <div className="card-header" style={{ padding: '16px 20px' }}>
            <div>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
                Distribusi Status Pipeline
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Prospek alsintan aktif
              </p>
            </div>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#2563eb',
                background: '#eff6ff',
                padding: '2px 8px',
                borderRadius: 999,
                border: '1px solid #bfdbfe',
              }}
            >
              {totalProspekCount} Prospek
            </span>
          </div>

          <div
            className="card-body"
            style={{
              height: 300,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            {isLoading ? (
              <div className="skeleton" style={{ height: '100%', width: '100%' }} />
            ) : chartStatus.length > 0 ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ flex: 1, width: '100%', minHeight: 180, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartStatus.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          borderRadius: 10,
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          fontSize: '0.8125rem',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Centered label inside donut hole */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                      {totalProspekCount}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
                      Prospek
                    </div>
                  </div>
                </div>

                {/* Legend list */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: 12,
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px solid #f1f5f9',
                    width: '100%',
                  }}
                >
                  {chartStatus.map((item, idx) => (
                    <div
                      key={item.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '0.75rem',
                        color: '#334155',
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: PIE_COLORS[idx % PIE_COLORS.length],
                        }}
                      />
                      <span>{item.name}:</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 20 }}>
                <Clock size={32} />
                <p style={{ fontSize: '0.875rem' }}>Belum ada data prospek tercatat</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prospek Terbaru Table */}
      <div className="card">
        <div className="card-header" style={{ padding: '18px 24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#0f172a' }}>
                Aktivitas Prospek & Pipeline Terbaru
              </h2>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: '#64748b',
                  background: '#f1f5f9',
                  padding: '2px 8px',
                  borderRadius: 999,
                }}
              >
                5 Terkini
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 2 }}>
              Daftar prospek terakhir yang didaftarkan oleh AO di lapangan
            </p>
          </div>
          <Link
            to="/prospek"
            className="btn btn-ghost btn-sm"
            style={{ color: '#16a34a', fontWeight: 600, gap: 4 }}
          >
            Lihat Semua Prospek <ArrowRight size={14} />
          </Link>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Gapoktan</th>
                <th>Kecamatan</th>
                <th>Komoditas</th>
                <th>AO Lapangan</th>
                <th>Estimasi Alsintan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td colSpan={7}>
                      <div className="skeleton" style={{ height: 24, width: '100%' }} />
                    </td>
                  </tr>
                ))
              ) : prospekData?.items && prospekData.items.length > 0 ? (
                prospekData.items.map((p) => {
                  const statusInfo = getStatusProspekInfo(p.status)
                  return (
                    <tr key={p.idProspek}>
                      <td style={{ fontSize: '0.8125rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {formatDate(p.tanggal)}
                      </td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{p.namaGapoktan}</td>
                      <td style={{ color: '#334155' }}>{p.kecamatan}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: '#f0fdf4',
                            color: '#16a34a',
                            borderColor: '#bbf7d0',
                            fontWeight: 600,
                          }}
                        >
                          {p.komoditas}
                        </span>
                      </td>
                      <td style={{ color: '#475569' }}>{p.namaAO}</td>
                      <td style={{ fontSize: '0.8125rem', color: '#334155' }}>
                        {p.estimasiKebutuhan || '-'}
                      </td>
                      <td>
                        <span className={`badge ${statusInfo.badge}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8' }}
                  >
                    Belum ada data prospek tercatat
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
