import { useEffect, useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  Database,
  ExternalLink,
  FolderOpen,
  Search,
  RefreshCw,
  FileSpreadsheet,
  AlertTriangle,
  Table2,
  LayoutGrid,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowLeft,
  Copy,
  Check,
} from 'lucide-react'
import { getSources, getSourceData } from '@/lib/api/sumber'
import { getLocalCache } from '@/lib/utils/cache'
import { DEFAULT_SOURCES, DEFAULT_POKTAN_BAGELEN } from '@/lib/mock/mock-sources'
import type { SourceInfo, SourceData } from '@/lib/types'

function fmtCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') {
    // ISO datetime dari Sheets → tampilkan bagian tanggal saja
    const m = v.match(/^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}/)
    if (m) return m[1]
    return v
  }
  return String(v)
}

export default function SumberDataPage() {
  const [activeKey, setActiveKey] = useState('')
  const [tab, setTab] = useState('')
  const [searchText, setSearchText] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [selectedRow, setSelectedRow] = useState<unknown[] | null>(null)
  const [selectedCell, setSelectedCell] = useState<{ header: string; value: string } | null>(null)
  const [copiedCell, setCopiedCell] = useState(false)

  const { data: sources = [], isFetching: isFetchingSources } = useQuery({
    queryKey: ['sources'],
    queryFn: getSources,
    initialData: () => getLocalCache<SourceInfo[]>('sources_list') ?? DEFAULT_SOURCES,
    initialDataUpdatedAt: 0,
  })

  const activeSource = sources.find((s) => s.key === activeKey) ?? sources[0]
  const activeTabName = activeSource?.tabs.some((t) => t.nama === tab)
    ? tab
    : activeSource?.tabs[0]?.nama ?? ''

  useEffect(() => {
    setPage(1)
  }, [activeSource?.key, activeTabName, q])

  // Lock body scroll saat modal detail baris/sel terbuka
  useEffect(() => {
    const isModalOpen = Boolean(selectedRow || selectedCell)
    if (isModalOpen) {
      const scrollY = window.scrollY
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
    } else {
      const top = document.body.style.top
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      if (top) window.scrollTo(0, -parseInt(top, 10))
    }
    return () => {
      const top = document.body.style.top
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      if (top) window.scrollTo(0, -parseInt(top, 10))
    }
  }, [selectedRow, selectedCell])

  const cacheKey = `source_data_${activeSource?.key}_${activeTabName}_${q || ''}_${page}`

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['sourceData', activeSource?.key, activeTabName, q, page],
    queryFn: () =>
      getSourceData({
        key: activeSource!.key,
        tab: activeTabName,
        q: q || undefined,
        page,
        limit: 200,
      }),
    enabled: Boolean(activeSource && activeTabName),
    initialData: () => {
      const cached = getLocalCache<SourceData>(cacheKey)
      if (cached) return cached
      if (activeSource?.key === 'poktan' && activeTabName === 'Bagelen' && !q && page === 1) {
        return DEFAULT_POKTAN_BAGELEN
      }
      return undefined
    },
    placeholderData: keepPreviousData,
  })

  const handleSearch = () => {
    setQ(searchText.trim())
    setPage(1)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCell(true)
    setTimeout(() => setCopiedCell(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Dev Banner */}
      <div className="dev-banner" style={{ padding: '8px 12px' }}>
        <Database size={15} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: '0.775rem', lineHeight: 1.4 }}>
          <strong>Sumber Data Live:</strong> Semua spreadsheet sumber di folder ALSINTAN
          dibaca langsung (live) dari Google Sheets — setiap edit karyawan langsung
          tampil di sini.
        </div>
      </div>

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="sumber-header-wrap">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1 className="page-title" style={{ margin: 0, fontSize: '1.25rem' }}>Sumber Data</h1>
              {(isFetchingSources || isFetching) && (
                <span className="sumber-sync-pill">
                  <span className="sumber-sync-dot" />
                  Menyinkronkan...
                </span>
              )}
            </div>
            <p className="page-subtitle" style={{ marginTop: 2, fontSize: '0.8rem', color: '#64748b' }}>
              Telusuri data mentah dari spreadsheet sumber tanpa perlu buka Google Sheets.
            </p>
          </div>

          <div className="sumber-header-actions">
            {activeSource?.url && (
              <a
                className="btn btn-secondary btn-sm"
                href={activeSource.url}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={13} />
                <span>Buka Spreadsheet</span>
              </a>
            )}
            <a
              className="btn btn-secondary btn-sm"
              href="https://drive.google.com/drive/folders/1SSz9RlEF4AGuspbiRfy55xsxS3xQS_Dy"
              target="_blank"
              rel="noreferrer"
              title="Buka folder ALSINTAN di Google Drive"
            >
              <FolderOpen size={13} />
              <span>Folder Drive</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Layout: Sidebar Sources (Desktop) + Content Table */}
      <div className="sumber-data-layout">
        {/* Pilihan sumber (Desktop: vertical list of cards; Hidden on mobile) */}
        <div className="sumber-sidebar">
          {sources.length === 0 &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 56, borderRadius: 10 }} />
            ))}
          {sources.map((s) => {
            const isActive = activeSource?.key === s.key
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  setActiveKey(s.key)
                  setTab('')
                  setSearchText('')
                  setQ('')
                  setPage(1)
                }}
                className={`card sumber-source-card ${isActive ? 'active' : ''}`}
              >
                <FileSpreadsheet
                  size={18}
                  style={{ color: isActive ? '#16a34a' : '#94a3b8', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: isActive ? '#15803d' : '#0f172a',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.nama}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {s.kategori} · {s.tabs.length} tab
                  </div>
                </div>
                {s.status !== 'OK' && <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0 }} />}
              </button>
            )
          })}
        </div>

        {/* Tabel Data & Controls */}
        <div className="card sumber-content">
          {/* 1. DESKTOP TOOLBAR (Displayed on screens >= 901px) */}
          <div className="sumber-desktop-toolbar">
            {/* Tab dropdown */}
            <div className="sumber-desktop-tab">
              <select
                className="input input-sm"
                style={{ width: '100%', fontWeight: 500 }}
                value={activeTabName}
                onChange={(e) => setTab(e.target.value)}
                disabled={!activeSource}
              >
                {activeSource?.tabs.map((t) => (
                  <option key={t.nama} value={t.nama}>
                    Tab: {t.nama} ({t.baris - 1 > 0 ? t.baris - 1 : 0} baris)
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh button */}
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-icon"
              title="Muat ulang data"
              onClick={() => setPage((p) => p)}
              disabled={isFetching}
              style={{ height: 36, width: 36, flexShrink: 0 }}
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            </button>

            {/* Search box */}
            <div className="sumber-desktop-search">
              <Search size={14} className="sumber-search-icon-left" />
              <input
                className="input input-sm"
                placeholder="Cari data..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              {searchText && (
                <button
                  type="button"
                  className="sumber-search-clear"
                  onClick={() => {
                    setSearchText('')
                    setQ('')
                    setPage(1)
                  }}
                  title="Hapus pencarian"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSearch}
              style={{ height: 36, padding: '0 16px', flexShrink: 0 }}
            >
              Cari
            </button>

            {/* Segmented view mode on Desktop */}
            <div className="sumber-segmented" style={{ marginLeft: 'auto' }}>
              <button
                type="button"
                className={`sumber-seg-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Tampilan Tabel Spreadsheet"
              >
                <Table2 size={13} />
                <span>Tabel</span>
              </button>
              <button
                type="button"
                className={`sumber-seg-btn ${viewMode === 'card' ? 'active' : ''}`}
                onClick={() => setViewMode('card')}
                title="Tampilan Kartu"
              >
                <LayoutGrid size={13} />
                <span>Kartu</span>
              </button>
            </div>
          </div>

          {/* 2. MOBILE TOOLBAR (Displayed on screens <= 900px) */}
          <div className="sumber-mobile-toolbar">
            {/* Mobile Row 1: Source Spreadsheet */}
            <div className="sumber-mobile-row">
              <div className="sumber-mobile-input-group">
                <span className="sumber-mobile-input-icon">
                  <FileSpreadsheet size={15} color="#16a34a" />
                </span>
                <select
                  className="input input-sm sumber-mobile-select"
                  value={activeSource?.key || ''}
                  onChange={(e) => {
                    setActiveKey(e.target.value)
                    setTab('')
                    setSearchText('')
                    setQ('')
                    setPage(1)
                  }}
                >
                  {sources.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.nama} ({s.tabs.length} tab)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mobile Row 2: Tab Selector + Reload button */}
            <div className="sumber-mobile-row">
              <select
                className="input input-sm"
                style={{ flex: 1, minWidth: 0, height: 38, fontWeight: 500 }}
                value={activeTabName}
                onChange={(e) => setTab(e.target.value)}
                disabled={!activeSource}
              >
                {activeSource?.tabs.map((t) => (
                  <option key={t.nama} value={t.nama}>
                    Tab: {t.nama} ({t.baris - 1 > 0 ? t.baris - 1 : 0} baris)
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary btn-sm sumber-btn-refresh"
                title="Muat ulang data"
                onClick={() => setPage((p) => p)}
                disabled={isFetching}
              >
                <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Mobile Row 3: Search input + Cari button */}
            <div className="sumber-mobile-row">
              <div className="sumber-mobile-search-input">
                <Search size={14} className="sumber-search-icon-left" />
                <input
                  className="input input-sm"
                  placeholder="Cari di semua kolom..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                {searchText && (
                  <button
                    type="button"
                    className="sumber-search-clear"
                    onClick={() => {
                      setSearchText('')
                      setQ('')
                      setPage(1)
                    }}
                    title="Hapus pencarian"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm sumber-btn-search"
                onClick={handleSearch}
              >
                Cari
              </button>
            </div>

            {/* Mobile Row 4: Total counter (left) + Segmented View Mode (right) */}
            <div className="sumber-mobile-row" style={{ justifyContent: 'space-between', paddingTop: 2 }}>
              <div className="sumber-count-badge">
                <strong>{data?.total ?? 0}</strong> baris {q ? `("${q}")` : ''}
              </div>
              <div className="sumber-segmented">
                <button
                  type="button"
                  className={`sumber-seg-btn ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setViewMode('table')}
                >
                  <Table2 size={13} />
                  <span>Tabel</span>
                </button>
                <button
                  type="button"
                  className={`sumber-seg-btn ${viewMode === 'card' ? 'active' : ''}`}
                  onClick={() => setViewMode('card')}
                >
                  <LayoutGrid size={13} />
                  <span>Kartu</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table or Card Content Body */}
          <div className="card-body" style={{ padding: 0 }}>
            {isError ? (
              <div style={{ padding: 20 }}>
                <p style={{ color: '#dc2626', fontSize: '0.875rem' }}>
                  {(error as Error)?.message || 'Gagal memuat data.'}
                </p>
              </div>
            ) : isLoading || !data ? (
              <div style={{ padding: 20 }}>
                <div className="skeleton" style={{ height: 260, width: '100%', borderRadius: 8 }} />
              </div>
            ) : data.header.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
                  Tab ini tidak memiliki data kolom.
                </p>
              </div>
            ) : (
              <>
                {/* Mode 1: SPREADSHEET TABLE MODE */}
                {viewMode === 'table' && (
                  <>
                    <div className="sumber-scroll-hint hide-desktop">
                      <SlidersHorizontal size={13} color="#16a34a" />
                      <span>
                        Geser tabel untuk melihat seluruh <strong>{data.header.length}</strong> kolom (klik sel untuk detail)
                      </span>
                    </div>

                    <div className="sumber-table-container">
                      <table className="sumber-spreadsheet-table">
                        <thead>
                          <tr>
                            <th style={{ width: 44, textAlign: 'center' }}>#</th>
                            {data.header.map((h, i) => (
                              <th key={i} title={h}>
                                {h || `Kolom ${i + 1}`}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.rows.map((row, ri) => (
                            <tr key={ri}>
                              <td
                                style={{
                                  textAlign: 'center',
                                  fontSize: '0.75rem',
                                  color: '#94a3b8',
                                  fontWeight: 600,
                                  background: '#f8fafc',
                                  userSelect: 'none',
                                }}
                              >
                                {(data.page - 1) * data.limit + ri + 1}
                              </td>
                              {row.map((cell, ci) => {
                                const formatted = fmtCell(cell)
                                return (
                                  <td
                                    key={ci}
                                    title={formatted}
                                    onClick={() => {
                                      if (formatted.length > 15) {
                                        setSelectedCell({
                                          header: data.header[ci] || `Kolom ${ci + 1}`,
                                          value: formatted,
                                        })
                                      }
                                    }}
                                  >
                                    {formatted || <span style={{ color: '#cbd5e1' }}>-</span>}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                          {data.rows.length === 0 && (
                            <tr>
                              <td
                                colSpan={data.header.length + 1}
                                style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b' }}
                              >
                                Tidak ada baris yang cocok dengan kriteria pencarian.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Mode 2: CARD MODE (Optimized Clean Spec Format) */}
                {viewMode === 'card' && (
                  <div className="sumber-cards-list">
                    {data.rows.map((row, ri) => {
                      const rowNum = (data.page - 1) * data.limit + ri + 1

                      // Find primary title column (e.g. Nama Poktan, index 1 or first text)
                      const titleIdx = row.findIndex(
                        (c, idx) => idx > 0 && typeof c === 'string' && c.trim().length > 0
                      )
                      const rowTitle = titleIdx > -1 ? String(row[titleIdx]) : `Baris #${rowNum}`

                      // Get key entries excluding rowNum and duplicate title
                      const validEntries = row
                        .map((cell, ci) => ({
                          ci,
                          header: data.header[ci] || `Kolom ${ci + 1}`,
                          value: fmtCell(cell),
                        }))
                        .filter(
                          (entry) =>
                            entry.value !== '' &&
                            entry.ci !== 0 && // skip first column if it's just 'No'
                            entry.ci !== titleIdx // skip duplicate title
                        )

                      return (
                        <div key={ri} className="sumber-row-card">
                          <div className="sumber-row-card-header">
                            <span className="sumber-row-index">#{rowNum}</span>
                            <span className="sumber-row-title" title={rowTitle}>
                              {rowTitle}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedRow(row)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 8px', fontSize: '0.75rem', flexShrink: 0 }}
                            >
                              Semua Kolom
                            </button>
                          </div>

                          <div className="sumber-card-specs">
                            {validEntries.slice(0, 5).map((entry, ei) => (
                              <div key={ei} className="sumber-card-spec-row">
                                <span className="sumber-spec-label">{entry.header}</span>
                                <span className="sumber-spec-value">{entry.value}</span>
                              </div>
                            ))}
                          </div>

                          {validEntries.length > 5 && (
                            <button
                              type="button"
                              onClick={() => setSelectedRow(row)}
                              className="sumber-card-more-btn"
                            >
                              + Lihat {validEntries.length - 5} kolom lainnya...
                            </button>
                          )}
                        </div>
                      )
                    })}

                    {data.rows.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b' }}>
                        Tidak ada baris yang cocok dengan kriteria pencarian.
                      </div>
                    )}
                  </div>
                )}

                {/* Pagination Controls */}
                <div className="sumber-pagination">
                  <div className="sumber-pagination-info">
                    <span>
                      Total <strong>{data.total}</strong> baris
                      {q ? ` (pencarian "${q}")` : ''} · Halaman <strong>{data.page}</strong> dari{' '}
                      <strong>{data.totalPages}</strong>
                    </span>
                    <span className="sumber-pagination-time">
                      · Diperbarui {new Date(data.updatedAt).toLocaleTimeString('id-ID')}
                    </span>
                  </div>

                  <div className="sumber-pagination-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={data.page <= 1 || isFetching}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={14} />
                      <span>Sebelumnya</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={data.page >= data.totalPages || isFetching}
                      onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    >
                      <span>Berikutnya</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal / Bottom Sheet: Detail Seluruh Kolom Baris */}
      {selectedRow && data && (
        <div className="bottom-sheet-overlay" onClick={() => setSelectedRow(null)}>
          <div
            className="card bottom-sheet-panel animate-slide-from-bottom"
            style={{ width: '100%', maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="btn btn-ghost btn-icon btn-sm bs-header-back-mobile"
                style={{ color: '#64748b' }}
                title="Tutup"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="bs-header-title">
                <FileSpreadsheet size={18} color="#16a34a" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Detail Seluruh Kolom
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="btn btn-ghost btn-icon btn-sm"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <div
              className="card-body"
              style={{
                maxHeight: '68vh',
                overflowY: 'auto',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: 10,
                }}
              >
                {selectedRow.map((cell, ci) => {
                  const headerName = data.header[ci] || `Kolom ${ci + 1}`
                  const val = fmtCell(cell)
                  return (
                    <div
                      key={ci}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          color: '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {headerName}
                      </span>
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          color: val ? '#0f172a' : '#94a3b8',
                          wordBreak: 'break-word',
                        }}
                      >
                        {val || '(Kosong)'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div
              className="card-footer"
              style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end' }}
            >
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="btn btn-secondary btn-sm"
                style={{ minWidth: 100, justifyContent: 'center' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Bottom Sheet: Preview Nilai Sel Tunggal */}
      {selectedCell && (
        <div className="bottom-sheet-overlay" onClick={() => setSelectedCell(null)}>
          <div
            className="card bottom-sheet-panel animate-slide-from-bottom"
            style={{ width: '100%', maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="btn btn-ghost btn-icon btn-sm bs-header-back-mobile"
                style={{ color: '#64748b' }}
                title="Tutup"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="bs-header-title">
                <FileSpreadsheet size={18} color="#16a34a" />
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {selectedCell.header}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="btn btn-ghost btn-icon btn-sm"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <div className="card-body" style={{ padding: 20 }}>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 14,
                  fontSize: '0.875rem',
                  color: '#0f172a',
                  lineHeight: 1.6,
                  wordBreak: 'break-word',
                  maxHeight: '50vh',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedCell.value}
              </div>
            </div>

            <div
              className="card-footer"
              style={{
                padding: '12px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => handleCopy(selectedCell.value)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {copiedCell ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                <span>{copiedCell ? 'Tersalin!' : 'Salin Teks'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="btn btn-primary btn-sm"
                style={{ minWidth: 80, justifyContent: 'center' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
