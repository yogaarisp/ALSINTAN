import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  MapPin,
  Filter,
  Trees,
  Users2,
  TrendingUp,
  Search,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { getWilayah } from '@/lib/api/wilayah'
import { getProspek } from '@/lib/api/prospek'
import { rankWilayah } from '@/lib/services/priority-engine'
import { MAP_CONFIG } from '@/lib/config/app-config'
import type { PriorityLevel } from '@/lib/types'
import {
  formatHektar,
  formatNumber,
  getPriorityLevelInfo,
  getScoreColor,
} from '@/lib/utils'

// Helper component to smoothly center map
function MapCenterController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  map.setView(center, zoom)
  return null
}

// Function to create color-coded HTML DivIcon based on priority score
function createCustomMarkerIcon(score: number, level: PriorityLevel) {
  let bgColor = '#2563eb' // Low (Blue)
  if (level === 'TINGGI') bgColor = '#dc2626' // High (Red)
  else if (level === 'SEDANG') bgColor = '#d97706' // Medium (Amber)

  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        background: ${bgColor};
        color: white;
        font-weight: 700;
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 20px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        border: 2px solid white;
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
        transform: translate(-50%, -100%);
      ">
        <span>${score}</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

export default function PetaPage() {
  const [selectedWilayahId, setSelectedWilayahId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL')
  const [selectedKomoditas, setSelectedKomoditas] = useState<string>('ALL')

  const { data: wilayahList = [], isLoading: loadingWilayah } = useQuery({
    queryKey: ['wilayah'],
    queryFn: () => getWilayah(),
  })

  const { data: prospekData, isLoading: loadingProspek } = useQuery({
    queryKey: ['prospek'],
    queryFn: () => getProspek({ limit: 100 }),
  })

  // Calculate priority rankings
  const rankedWilayah = rankWilayah(wilayahList, prospekData?.items || [])

  // Merge ranked data back into MasterWilayah objects
  const enrichedWilayah = wilayahList.map((w) => {
    const rankInfo = rankedWilayah.find((rw) => rw.idKecamatan === w.idKecamatan)
    const wilayahProspeks = prospekData?.items.filter((p) => p.idKecamatan === w.idKecamatan) || []
    return {
      ...w,
      priorityScore: rankInfo?.score || 0,
      priorityLevel: rankInfo?.level || 'RENDAH',
      priorityRank: rankInfo?.rank || 99,
      prospekCount: wilayahProspeks.length,
    }
  })

  // Extract all unique komoditas for filter
  const allKomoditas = Array.from(
    new Set(wilayahList.flatMap((w) => w.komoditas))
  )

  // Filtered wilayah
  const filteredWilayah = enrichedWilayah.filter((w) => {
    const matchSearch = w.kecamatan.toLowerCase().includes(searchQuery.toLowerCase())
    const matchPriority = selectedPriority === 'ALL' || w.priorityLevel === selectedPriority
    const matchKomoditas = selectedKomoditas === 'ALL' || w.komoditas.includes(selectedKomoditas)
    return matchSearch && matchPriority && matchKomoditas
  })

  const selectedWilayah = enrichedWilayah.find((w) => w.idKecamatan === selectedWilayahId) || null

  const mapCenter: [number, number] = selectedWilayah && selectedWilayah.koordinatLat && selectedWilayah.koordinatLng
    ? [selectedWilayah.koordinatLat, selectedWilayah.koordinatLng]
    : MAP_CONFIG.defaultCenter

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Dev only note */}
      <div className="dev-banner">
        <Sparkles size={16} />
        <div>
          <strong>Peta Potensi Fase 1:</strong> Visualisasi marker interaktif per kecamatan dengan skor prioritas. Data dapat difilter berdasarkan level prioritas dan komoditas.
        </div>
      </div>

      {/* Header & Filter Bar */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Cari nama kecamatan..."
              className="input"
              style={{ paddingLeft: 36 }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Priority */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={16} color="#64748b" />
            <select
              className="input"
              style={{ width: 'auto', paddingRight: 32 }}
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
            >
              <option value="ALL">Semua Prioritas</option>
              <option value="TINGGI">Prioritas Tinggi</option>
              <option value="SEDANG">Prioritas Sedang</option>
              <option value="RENDAH">Prioritas Rendah</option>
            </select>
          </div>

          {/* Filter Komoditas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={16} color="#64748b" />
            <select
              className="input"
              style={{ width: 'auto', paddingRight: 32 }}
              value={selectedKomoditas}
              onChange={(e) => setSelectedKomoditas(e.target.value)}
            >
              <option value="ALL">Semua Komoditas</option>
              {allKomoditas.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          {/* Count Badge */}
          <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>
            Menampilkan: <span style={{ color: '#16a34a' }}>{filteredWilayah.length} Kecamatan</span>
          </div>
        </div>
      </div>

      {/* Map + Detail Panel Container */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: selectedWilayah ? '1fr 340px' : '1fr',
          gap: 20,
          minHeight: 520,
          transition: 'all 0.3s ease',
        }}
      >
        {/* Leaflet Map Box */}
        <div
          className="card"
          style={{
            height: 520,
            overflow: 'hidden',
            position: 'relative',
            borderRadius: 14,
          }}
        >
          {loadingWilayah || loadingProspek ? (
            <div className="skeleton" style={{ height: '100%', width: '100%' }} />
          ) : (
            <MapContainer
              center={mapCenter}
              zoom={MAP_CONFIG.defaultZoom}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution={MAP_CONFIG.tileAttribution}
                url={MAP_CONFIG.tileUrl}
              />
              <MapCenterController center={mapCenter} zoom={selectedWilayah ? 11 : MAP_CONFIG.defaultZoom} />

              {filteredWilayah.map((w) => {
                if (!w.koordinatLat || !w.koordinatLng) return null
                const levelInfo = getPriorityLevelInfo(w.priorityLevel as PriorityLevel)

                return (
                  <Marker
                    key={w.idKecamatan}
                    position={[w.koordinatLat, w.koordinatLng]}
                    icon={createCustomMarkerIcon(w.priorityScore, w.priorityLevel as PriorityLevel)}
                    eventHandlers={{
                      click: () => setSelectedWilayahId(w.idKecamatan),
                    }}
                  >
                    <Popup>
                      <div style={{ fontFamily: 'Inter, sans-serif', padding: 4 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}>
                          Kec. {w.kecamatan}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 6 }}>
                          Kab. {w.kabupaten}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                          <span className={`badge ${levelInfo.badge}`}>
                            {levelInfo.label}
                          </span>
                          <span className="badge" style={{ background: '#f8fafc', color: '#0f172a', borderColor: '#e2e8f0' }}>
                            Skor: {w.priorityScore}
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedWilayahId(w.idKecamatan)}
                          className="btn btn-primary btn-sm"
                          style={{ width: '100%', marginTop: 6 }}
                        >
                          Lihat Detail Wilayah
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
          )}

          {/* Map Legend Floating on Bottom Left */}
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              zIndex: 1000,
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(8px)',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              fontSize: '0.75rem',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6, color: '#0f172a' }}>Keterangan Prioritas</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626' }} />
                <span>Prioritas Tinggi (Skor &gt;= 70)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d97706' }} />
                <span>Prioritas Sedang (40 - 69)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563eb' }} />
                <span>Prioritas Rendah (&lt; 40)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Wilayah Detail Panel */}
        {selectedWilayah && (
          <div className="card animate-slide-left" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ background: '#f8fafc' }}>
              <div>
                <span className={`rank-badge rank-${selectedWilayah.priorityRank <= 3 ? selectedWilayah.priorityRank : 'other'}`} style={{ marginRight: 8 }}>
                  #{selectedWilayah.priorityRank}
                </span>
                <span style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#0f172a' }}>
                  Kec. {selectedWilayah.kecamatan}
                </span>
              </div>
              <button
                onClick={() => setSelectedWilayahId(null)}
                className="btn btn-ghost btn-icon btn-sm"
                title="Tutup Panel"
              >
                ✕
              </button>
            </div>

            <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Priority Status Box */}
              {(() => {
                const levelInfo = getPriorityLevelInfo(selectedWilayah.priorityLevel as PriorityLevel)
                return (
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      background: levelInfo.bg,
                      border: '1px solid',
                      borderColor: levelInfo.badge.includes('red') ? '#fecaca' : levelInfo.badge.includes('amber') ? '#fde68a' : '#bfdbfe',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>Priority Score</span>
                      <span className={`badge ${levelInfo.badge}`}>{levelInfo.label}</span>
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 4 }} className={getScoreColor(selectedWilayah.priorityScore)}>
                      {selectedWilayah.priorityScore}<span style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#64748b' }}>/100</span>
                    </div>
                  </div>
                )
              })()}

              {/* Baseline Metrics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: '0.8125rem' }}>
                    <Trees size={16} /> Luas Lahan
                  </div>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatHektar(selectedWilayah.luasLahan)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: '0.8125rem' }}>
                    <TrendingUp size={16} /> Data Panen/Produksi
                  </div>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>
                    {selectedWilayah.dataPanen ? `${formatNumber(selectedWilayah.dataPanen)} Ton` : '-'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: '0.8125rem' }}>
                    <Users2 size={16} /> Jumlah Gapoktan
                  </div>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedWilayah.jumlahGapoktan} Kelompok</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: '0.8125rem' }}>
                    <MapPin size={16} /> Prospek Berjalan
                  </div>
                  <span style={{ fontWeight: 600, color: '#16a34a' }}>{selectedWilayah.prospekCount} Prospek</span>
                </div>
              </div>

              {/* Komoditas Badges */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>
                  Komoditas Utama
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedWilayah.komoditas.map((k) => (
                    <span key={k} className="badge" style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}>
                      {k}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 16 }}>
                <Link
                  to={`/prospek?kecamatan=${selectedWilayah.kecamatan}`}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Buka Prospek Wilayah Ini
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
