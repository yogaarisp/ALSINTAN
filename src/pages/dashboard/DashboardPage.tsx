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
  getScoreColor,
} from '@/lib/utils'

const PIE_COLORS = ['#16a34a', '#0284c7', '#8b5cf6', '#f59e0b', '#ef4444']

export default function DashboardPage() {
  const {
    data: kpi,
    isLoading: loadingKpi,
    error: errorKpi,
  } = useQuery({
    queryKey: ['dashboard', 'kpi'],
    queryFn: getDashboardKPI,
  })

  const {
    data: wilayahList = [],
    isLoading: loadingWilayah,
  } = useQuery({
    queryKey: ['wilayah'],
    queryFn: () => getWilayah(),
  })

  const {
    data: prospekData,
    isLoading: loadingProspek,
  } = useQuery({
    queryKey: ['prospek', { limit: 5 }],
    queryFn: () => getProspek({ limit: 5 }),
  })

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
  prospekData?.items.forEach((p) => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
  })
  const chartStatus = Object.entries(statusCounts).map(([status, count]) => ({
    name: getStatusProspekInfo(status as any).label,
    value: count,
  }))

  const isLoading = loadingKpi || loadingWilayah || loadingProspek

  if (errorKpi) {
    return (
      <div className="error-state card">
        <AlertCircle size={40} style={{ marginBottom: 12 }} />
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Gagal Memuat Data Dashboard</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>
          {errorKpi instanceof Error ? errorKpi.message : 'Terjadi kesalahan sistem'}
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Dev only banner */}
      <div className="dev-banner">
        <Sparkles size={16} />
        <div>
          <strong>Fase 1 Development Preview:</strong> Data bersumber dari simulasi Google Spreadsheet & Priority Engine. Bobot skor bersifat <em>[DEVELOPMENT ONLY]</em>.
        </div>
      </div>

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Executive Dashboard</h1>
            <p className="page-subtitle">
              Pemetaan potensi wilayah dan rekomendasi prioritas prospek alsintan
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/prioritas" className="btn btn-primary">
              <TrendingUp size={16} />
              Lihat Ranking Wilayah
            </Link>
            <Link to="/peta" className="btn btn-secondary">
              <MapPin size={16} />
              Buka Peta Potensi
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {/* Total Wilayah */}
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>Total Kecamatan</span>
            <div style={{ padding: 8, background: '#f0fdf4', borderRadius: 8, color: '#16a34a' }}>
              <Building2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginTop: 10 }}>
            {isLoading ? <div className="skeleton" style={{ height: 32, width: 80 }} /> : kpi?.totalKecamatan || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>Baseline Dinas Pertanian</div>
        </div>

        {/* Total Gapoktan */}
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>Total Gapoktan</span>
            <div style={{ padding: 8, background: '#f0fdf4', borderRadius: 8, color: '#16a34a' }}>
              <Users2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginTop: 10 }}>
            {isLoading ? <div className="skeleton" style={{ height: 32, width: 90 }} /> : formatNumber(kpi?.totalGapoktan || 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>Kelompok Tani Terdaftar</div>
        </div>

        {/* Total Luas Lahan */}
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>Total Luas Lahan</span>
            <div style={{ padding: 8, background: '#f0fdf4', borderRadius: 8, color: '#16a34a' }}>
              <Trees size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginTop: 10 }}>
            {isLoading ? <div className="skeleton" style={{ height: 32, width: 120 }} /> : formatHektar(kpi?.totalLuasLahan || 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>Potensi Area Pertanian</div>
        </div>

        {/* Prospek Baru */}
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>Prospek Aktif</span>
            <div style={{ padding: 8, background: '#eff6ff', borderRadius: 8, color: '#2563eb' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginTop: 10 }}>
            {isLoading ? <div className="skeleton" style={{ height: 32, width: 60 }} /> : kpi?.prospekBaru || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: 4 }}>Pipeline AO Berjalan</div>
        </div>

        {/* AO Aktif */}
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>AO Lapangan</span>
            <div style={{ padding: 8, background: '#faf5ff', borderRadius: 8, color: '#9333ea' }}>
              <UserCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginTop: 10 }}>
            {isLoading ? <div className="skeleton" style={{ height: 32, width: 50 }} /> : kpi?.aoAktif || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>Account Officer Aktif</div>
        </div>
      </div>

      {/* Top Rekomendasi Wilayah Prioritas (Decision Support Card) */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
              Rekomendasi Wilayah Prioritas Prospek
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              Berdasarkan analisis luas lahan, estimasi produksi, dan jumlah gapoktan
            </p>
          </div>
          <Link to="/prioritas" className="btn btn-ghost btn-sm" style={{ color: '#16a34a', gap: 4 }}>
            Lihat Semua <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="card-body">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
            }}
          >
            {isLoading
              ? [1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton" style={{ height: 130 }} />
                ))
              : rankedWilayah.map((rw) => {
                  const levelInfo = getPriorityLevelInfo(rw.level)
                  return (
                    <div
                      key={rw.idKecamatan}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span className={`rank-badge rank-${rw.rank <= 3 ? rw.rank : 'other'}`}>
                            #{rw.rank}
                          </span>
                          <span className={`badge ${levelInfo.badge}`}>
                            {levelInfo.label}
                          </span>
                        </div>
                        <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#0f172a' }}>
                          Kec. {rw.kecamatan}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 4 }}>
                          Score: <strong className={getScoreColor(rw.score)}>{rw.score}/100</strong>
                        </div>
                      </div>

                      <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Link
                          to={`/prospek?kecamatan=${rw.kecamatan}`}
                          className="btn btn-secondary btn-sm"
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          Lihat Prospek Wilayah
                        </Link>
                      </div>
                    </div>
                  )
                })}
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 20,
        }}
      >
        {/* Chart 1: Luas Lahan per Kecamatan */}
        <div className="card">
          <div className="card-header">
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>
              Potensi Luas Lahan per Kecamatan (Ha)
            </h2>
          </div>
          <div className="card-body" style={{ height: 280 }}>
            {isLoading ? (
              <div className="skeleton" style={{ height: '100%' }} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartLahan} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any) => [`${formatNumber(Number(val) || 0)} Ha`, 'Luas Lahan']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="luas" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Status Pipeline Prospek */}
        <div className="card">
          <div className="card-header">
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>
              Distribusi Status Prospek Alsintan
            </h2>
          </div>
          <div className="card-body" style={{ height: 280, display: 'flex', alignItems: 'center' }}>
            {isLoading ? (
              <div className="skeleton" style={{ height: '100%', width: '100%' }} />
            ) : chartStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name || ''} (${((percent || 0) * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {chartStatus.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: 20, width: '100%' }}>
                <Clock size={32} />
                <p style={{ fontSize: '0.875rem' }}>Belum ada data prospek tercatat</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prospek Terbaru Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>
              Aktivitas Prospek & Pipeline Terbaru
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              Daftar prospek terakhir yang didaftarkan oleh AO di lapangan
            </p>
          </div>
          <Link to="/prospek" className="btn btn-ghost btn-sm" style={{ color: '#16a34a' }}>
            Lihat Semua Prospek
          </Link>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Gapoktan</th>
                <th>Kecamatan</th>
                <th>Komoditas</th>
                <th>AO</th>
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
                      <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>{formatDate(p.tanggal)}</td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{p.namaGapoktan}</td>
                      <td>{p.kecamatan}</td>
                      <td>
                        <span className="badge" style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}>
                          {p.komoditas}
                        </span>
                      </td>
                      <td>{p.namaAO}</td>
                      <td style={{ fontSize: '0.8125rem' }}>{p.estimasiKebutuhan || '-'}</td>
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
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}>
                    Belum ada data prospek
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
