import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  Activity,
  ExternalLink,
  Target,
  Sparkles,
  Award,
} from 'lucide-react'
import { getWilayah } from '@/lib/api/wilayah'
import { getProspek } from '@/lib/api/prospek'
import { getAO } from '@/lib/api/ao'
import { rankWilayah } from '@/lib/services/priority-engine'
import { getLocalCache } from '@/lib/utils/cache'
import { MOCK_WILAYAH, MOCK_PROSPEK, MOCK_AO } from '@/lib/mock/mock-data'
import type { MasterWilayah, MasterAO } from '@/lib/types'

export default function MonitoringPage() {
  const { data: wilayahList = [] } = useQuery({
    queryKey: ['wilayah'],
    queryFn: () => getWilayah(),
    initialData: () => getLocalCache<MasterWilayah[]>('wilayah_all') ?? MOCK_WILAYAH,
    initialDataUpdatedAt: 0,
  })

  const { data: prospekData } = useQuery({
    queryKey: ['prospek'],
    queryFn: () => getProspek({ limit: 100 }),
    initialData: () =>
      getLocalCache('prospek_all') ?? {
        items: MOCK_PROSPEK,
        total: MOCK_PROSPEK.length,
        page: 1,
        limit: 100,
        totalPages: 1,
      },
    initialDataUpdatedAt: 0,
  })

  const { data: aoList = [] } = useQuery({
    queryKey: ['ao'],
    queryFn: getAO,
    initialData: () => getLocalCache<MasterAO[]>('ao_all') ?? MOCK_AO,
    initialDataUpdatedAt: 0,
  })

  const rankedWilayah = rankWilayah(wilayahList, prospekData?.items || [])

  // Comparison Data: Baseline (Dinas) vs Actual Field Prospek
  const comparisonData = wilayahList.slice(0, 6).map((w) => {
    const prospekCount = prospekData?.items.filter((p) => p.idKecamatan === w.idKecamatan).length || 0
    return {
      kecamatan: w.kecamatan,
      baselineGapoktan: w.jumlahGapoktan,
      actualProspek: prospekCount,
      potensiLahan: Math.round(w.luasLahan / 100), // Scaled for chart
    }
  })

  // AO Performance table data
  const aoStats = aoList.map((ao) => {
    const prospeks = (prospekData?.items || []).filter(
      (p) => p.idAO === ao.idAO || p.namaAO === ao.namaAO
    )
    const closing = prospeks.filter((p) => p.status === 'CLOSING').length
    const survey = prospeks.filter((p) => p.status === 'SURVEY' || p.status === 'POTENSIAL').length
    return {
      ...ao,
      totalProspek: prospeks.length,
      surveyCount: survey,
      closingCount: closing,
      conversionRate: prospeks.length > 0 ? Math.round((closing / prospeks.length) * 100) : 0,
    }
  })

  const isLoading = wilayahList.length === 0 && aoList.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Dev only banner */}
      <div className="dev-banner">
        <Sparkles size={16} />
        <div>
          <strong>Dashboard Monitoring & Evaluasi Manajemen (Fase 1):</strong> Membandingkan data potensi awal wilayah (Dinas Pertanian) dengan realisasi prospek/survey aktual lapangan oleh AO.
        </div>
      </div>

      {/* Page Header with Looker Studio Bridge */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Monitoring & Evaluasi Manajemen</h1>
            <p className="page-subtitle">
              Evaluasi kinerja AO, perbandingan potensi baseline vs data lapangan, dan ringkasan eksekutif
            </p>
          </div>
          {/* Looker Studio integration per PRD Section 19 */}
          <a
            href="https://lookerstudio.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            <ExternalLink size={14} />
            Buka Looker Studio Existing
          </a>
        </div>
      </div>

      {/* Management Target Highlights */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Wilayah Penetrasi</span>
            <Target size={18} color="#16a34a" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
            {isLoading ? <div className="skeleton" style={{ height: 32, width: 60 }} /> : `${rankedWilayah.filter(w => (prospekData?.items || []).some(p => p.idKecamatan === w.idKecamatan)).length} / ${wilayahList.length}`}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: 4 }}>Kecamatan telah terjamah prospek</div>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Total Prospek Lapangan</span>
            <Activity size={18} color="#2563eb" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
            {isLoading ? <div className="skeleton" style={{ height: 32, width: 40 }} /> : prospekData?.total || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: 4 }}>Kelompok Tani dalam Pipeline</div>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Prospek Closing Deal</span>
            <Award size={18} color="#d97706" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a', marginTop: 8 }}>
            {isLoading ? <div className="skeleton" style={{ height: 32, width: 40 }} /> : (prospekData?.items || []).filter(p => p.status === 'CLOSING').length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: 4 }}>Realisasi Pengadaan Alsintan</div>
        </div>
      </div>

      {/* Comparison Chart: Baseline Dinas Pertanian vs Aktual Prospek AO (PRD Section 4.3 & 6H) */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
              Evaluasi: Potensi Wilayah (Dinas) vs Realisasi Prospek (AO)
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              Membandingkan total jumlah Gapoktan terdaftar di Dinas dengan jumlah Gapoktan yang telah diprospek
            </p>
          </div>
        </div>
        <div className="card-body" style={{ height: 320 }}>
          {isLoading ? (
            <div className="skeleton" style={{ height: '100%' }} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                <XAxis dataKey="kecamatan" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Legend wrapperStyle={{ paddingTop: 10 }} />
                <Bar name="Total Gapoktan Baseline (Dinas)" dataKey="baselineGapoktan" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar name="Prospek Aktif Lapangan (AO)" dataKey="actualProspek" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Monitoring Kinerja AO */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
              Monitoring Kinerja Account Officer (AO)
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              Statistik prospek, survey lapangan, dan tingkat konversi per petugas
            </p>
          </div>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama AO</th>
                <th>Wilayah Penugasan</th>
                <th>Status AO</th>
                <th>Total Prospek</th>
                <th>Survey / Potensial</th>
                <th>Closing</th>
                <th>Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td colSpan={7}>
                      <div className="skeleton" style={{ height: 28, width: '100%' }} />
                    </td>
                  </tr>
                ))
              ) : aoStats.map((ao) => (
                <tr key={ao.idAO}>
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>{ao.namaAO}</td>
                  <td style={{ fontSize: '0.8125rem' }}>{ao.wilayah?.join(', ')}</td>
                  <td>
                    <span className="badge" style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}>
                      {ao.status}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{ao.totalProspek}</td>
                  <td>{ao.surveyCount}</td>
                  <td style={{ fontWeight: 700, color: '#16a34a' }}>{ao.closingCount}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{ao.conversionRate}%</span>
                      <div className="score-bar" style={{ width: 60 }}>
                        <div className="score-bar-fill bg-green-500" style={{ width: `${ao.conversionRate}%` }} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
