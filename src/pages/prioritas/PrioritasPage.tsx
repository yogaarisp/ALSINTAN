import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Search,
  Filter,
  ArrowUpDown,
  MapPin,
  Sparkles,
  Info,
  Sliders,
} from 'lucide-react'
import { getWilayah } from '@/lib/api/wilayah'
import { getProspek } from '@/lib/api/prospek'
import { rankWilayah } from '@/lib/services/priority-engine'
import { PRIORITY_CONFIG } from '@/lib/config/priority-config'
import type { PriorityLevel, PriorityScoreResult } from '@/lib/types'
import {
  formatHektar,
  formatNumber,
  getPriorityLevelInfo,
  getScoreColor,
  getScoreBarColor,
} from '@/lib/utils'

export default function PrioritasPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL')
  const [sortField, setSortField] = useState<'score' | 'luas' | 'gapoktan' | 'produksi'>('score')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedResult, setSelectedResult] = useState<PriorityScoreResult | null>(null)

  const { data: wilayahList = [], isLoading: loadingWilayah } = useQuery({
    queryKey: ['wilayah'],
    queryFn: () => getWilayah(),
  })

  const { data: prospekData, isLoading: loadingProspek } = useQuery({
    queryKey: ['prospek'],
    queryFn: () => getProspek({ limit: 100 }),
  })

  const rankedResults = rankWilayah(wilayahList, prospekData?.items || [])

  // Join full wilayah details
  const fullData = rankedResults.map((r) => {
    const rawWilayah = wilayahList.find((w) => w.idKecamatan === r.idKecamatan)
    const prospekCount = prospekData?.items.filter((p) => p.idKecamatan === r.idKecamatan).length || 0
    return {
      ...r,
      kabupaten: rawWilayah?.kabupaten || '',
      luasLahan: rawWilayah?.luasLahan || 0,
      dataPanen: rawWilayah?.dataPanen || 0,
      jumlahGapoktan: rawWilayah?.jumlahGapoktan || 0,
      komoditas: rawWilayah?.komoditas || [],
      prospekCount,
    }
  })

  // Filter
  const filteredData = fullData.filter((item) => {
    const matchSearch = item.kecamatan.toLowerCase().includes(searchQuery.toLowerCase())
    const matchPriority = priorityFilter === 'ALL' || item.level === priorityFilter
    return matchSearch && matchPriority
  })

  // Sort
  filteredData.sort((a, b) => {
    let diff = 0
    if (sortField === 'score') diff = a.score - b.score
    else if (sortField === 'luas') diff = a.luasLahan - b.luasLahan
    else if (sortField === 'gapoktan') diff = a.jumlahGapoktan - b.jumlahGapoktan
    else if (sortField === 'produksi') diff = a.dataPanen - b.dataPanen

    return sortDirection === 'desc' ? -diff : diff
  })

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const isLoading = loadingWilayah || loadingProspek

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Dev only banner */}
      <div className="dev-banner">
        <Sparkles size={16} />
        <div>
          <strong>Priority Analysis Engine [DEVELOPMENT ONLY]:</strong> Formula pembobotan (Luas Lahan {PRIORITY_CONFIG.weights.luasLahan * 100}%, Gapoktan {PRIORITY_CONFIG.weights.jumlahGapoktan * 100}%, Produksi {PRIORITY_CONFIG.weights.produksi * 100}%, Pipeline Prospek {PRIORITY_CONFIG.weights.prospekExisting * 100}%) adalah simulasi dan dapat disesuaikan kembali dengan kesepakatan stakeholder.
        </div>
      </div>

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Ranking Prioritas Wilayah</h1>
            <p className="page-subtitle">
              Urutan wilayah kecamatan yang paling direkomendasikan untuk penetrasi prospek alsintan
            </p>
          </div>
          <Link to="/peta" className="btn btn-secondary">
            <MapPin size={16} />
            Lihat pada Peta
          </Link>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Cari kecamatan..."
              className="input"
              style={{ paddingLeft: 36 }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Priority filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={16} color="#64748b" />
            <select
              className="input"
              style={{ width: 'auto', paddingRight: 32 }}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="ALL">Semua Level Prioritas</option>
              <option value="TINGGI">Prioritas Tinggi</option>
              <option value="SEDANG">Prioritas Sedang</option>
              <option value="RENDAH">Prioritas Rendah</option>
            </select>
          </div>

          <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>
            Total Wilayah: <span style={{ color: '#16a34a' }}>{filteredData.length}</span>
          </div>
        </div>
      </div>

      {/* Main Ranking Table */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Rank</th>
                <th>Kecamatan</th>
                <th
                  onClick={() => toggleSort('luas')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Luas Lahan <ArrowUpDown size={13} />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('gapoktan')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Gapoktan <ArrowUpDown size={13} />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('produksi')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Produksi <ArrowUpDown size={13} />
                  </div>
                </th>
                <th>Komoditas</th>
                <th
                  onClick={() => toggleSort('score')}
                  style={{ cursor: 'pointer', userSelect: 'none', width: 140 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Priority Score <ArrowUpDown size={13} />
                  </div>
                </th>
                <th>Level Prioritas</th>
                <th>Pipeline AO</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td colSpan={10}>
                      <div className="skeleton" style={{ height: 28, width: '100%' }} />
                    </td>
                  </tr>
                ))
              ) : filteredData.length > 0 ? (
                filteredData.map((item) => {
                  const levelInfo = getPriorityLevelInfo(item.level as PriorityLevel)
                  return (
                    <tr key={item.idKecamatan}>
                      <td>
                        <span className={`rank-badge rank-${item.rank <= 3 ? item.rank : 'other'}`}>
                          {item.rank}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>Kec. {item.kecamatan}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Kab. {item.kabupaten}</div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{formatHektar(item.luasLahan)}</td>
                      <td>{item.jumlahGapoktan} unit</td>
                      <td>{item.dataPanen ? `${formatNumber(item.dataPanen)} Ton` : '-'}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {item.komoditas.map((k) => (
                            <span key={k} className="badge" style={{ background: '#f8fafc', color: '#334155', borderColor: '#e2e8f0' }}>
                              {k}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 800, fontSize: '0.9375rem' }} className={getScoreColor(item.score)}>
                            {item.score}
                          </span>
                          <div className="score-bar" style={{ flex: 1, minWidth: 45 }}>
                            <div className={`score-bar-fill ${getScoreBarColor(item.score)}`} style={{ width: `${item.score}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${levelInfo.badge}`}>
                          {levelInfo.label}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: item.prospekCount > 0 ? '#16a34a' : '#94a3b8' }}>
                          {item.prospekCount} Prospek
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            onClick={() => setSelectedResult(item)}
                            className="btn btn-secondary btn-sm"
                            title="Detail Breakdown Skor"
                          >
                            <Info size={14} />
                          </button>
                          <Link
                            to={`/prospek?kecamatan=${item.kecamatan}`}
                            className="btn btn-primary btn-sm"
                          >
                            Prospek
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8' }}>
                    Tidak ada wilayah yang sesuai dengan filter pencarian
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Breakdown Skor */}
      {selectedResult && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setSelectedResult(null)}
        >
          <div
            className="card animate-slide-up"
            style={{ width: '100%', maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sliders size={18} color="#16a34a" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  Breakdown Skor: Kec. {selectedResult.kecamatan}
                </h3>
              </div>
              <button
                onClick={() => setSelectedResult(null)}
                className="btn btn-ghost btn-icon btn-sm"
              >
                ✕
              </button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ textAlign: 'center', padding: '12px 0', background: '#f8fafc', borderRadius: 10 }}>
                <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Total Priority Score</div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800 }} className={getScoreColor(selectedResult.score)}>
                  {selectedResult.score} <span style={{ fontSize: '1rem', color: '#94a3b8' }}>/100</span>
                </div>
                <span className={`badge ${getPriorityLevelInfo(selectedResult.level).badge}`}>
                  {getPriorityLevelInfo(selectedResult.level).label}
                </span>
              </div>

              {/* Components breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Komponen Analisis Potensi:
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 4 }}>
                    <span>Potensi Luas Lahan (Bobot 30%)</span>
                    <strong>{selectedResult.components.luasLahan}/100</strong>
                  </div>
                  <div className="score-bar">
                    <div className="score-bar-fill bg-green-500" style={{ width: `${selectedResult.components.luasLahan}%` }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 4 }}>
                    <span>Kepadatan Gapoktan (Bobot 25%)</span>
                    <strong>{selectedResult.components.jumlahGapoktan}/100</strong>
                  </div>
                  <div className="score-bar">
                    <div className="score-bar-fill bg-emerald-500" style={{ width: `${selectedResult.components.jumlahGapoktan}%` }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 4 }}>
                    <span>Estimasi Panen / Produksi (Bobot 25%)</span>
                    <strong>{selectedResult.components.produksi}/100</strong>
                  </div>
                  <div className="score-bar">
                    <div className="score-bar-fill bg-blue-500" style={{ width: `${selectedResult.components.produksi}%` }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 4 }}>
                    <span>Kebutuhan Penetrasi Baru (Bobot 20%)</span>
                    <strong>{selectedResult.components.prospekExisting}/100</strong>
                  </div>
                  <div className="score-bar">
                    <div className="score-bar-fill bg-amber-500" style={{ width: `${selectedResult.components.prospekExisting}%` }} />
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                * Catatan: Formula ini bertindak sebagai decision-support engine dan dapat dikonfigurasi melalui priority-config.ts
              </div>
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedResult(null)} className="btn btn-secondary btn-sm">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
