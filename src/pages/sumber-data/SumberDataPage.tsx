import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Database,
  ExternalLink,
  Search,
  RefreshCw,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react'
import { getSources, getSourceData } from '@/lib/api/sumber'

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

  const { data: sources = [], isLoading: loadingSources } = useQuery({
    queryKey: ['sources'],
    queryFn: getSources,
  })

  const activeSource = sources.find((s) => s.key === activeKey) ?? sources[0]
  const activeTabName = activeSource?.tabs.some((t) => t.nama === tab)
    ? tab
    : activeSource?.tabs[0]?.nama ?? ''

  useEffect(() => {
    setPage(1)
  }, [activeSource?.key, activeTabName, q])

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
  })

  const handleSearch = () => {
    setQ(searchText.trim())
    setPage(1)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="dev-banner">
        <Database size={16} />
        <div>
          <strong>Sumber Data Live:</strong> Semua spreadsheet sumber di folder ALSINTAN
          dibaca langsung (live) dari Google Sheets — setiap edit karyawan langsung
          tampil di sini.
        </div>
      </div>

      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Sumber Data</h1>
          <p className="page-subtitle">
            Telusuri data mentah dari semua spreadsheet sumber (Poktan, Produksi,
            Rekap) tanpa perlu buka Google Sheets.
          </p>
        </div>
        {activeSource?.url && (
          <a
            className="btn btn-secondary btn-sm"
            href={activeSource.url}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <ExternalLink size={14} />
            Buka Spreadsheet
          </a>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Pilihan sumber */}
        <div style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loadingSources &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 56, borderRadius: 10 }} />
            ))}
          {sources.map((s) => {
            const isActive = activeSource?.key === s.key
            return (
              <button
                key={s.key}
                onClick={() => {
                  setActiveKey(s.key)
                  setTab('')
                  setSearchText('')
                  setQ('')
                }}
                className="card"
                style={{
                  padding: '10px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: `1px solid ${isActive ? '#16a34a' : '#e2e8f0'}`,
                  background: isActive ? '#f0fdf4' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                }}
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
                      color: '#0f172a',
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
                {s.status !== 'OK' && <AlertTriangle size={16} color="#dc2626" />}
              </button>
            )
          })}
        </div>

        {/* Tabel data */}
        <div className="card" style={{ flex: 1, minWidth: 320 }}>
          <div
            className="card-header"
            style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}
          >
            <select
              className="input"
              style={{ maxWidth: 220 }}
              value={activeTabName}
              onChange={(e) => setTab(e.target.value)}
              disabled={!activeSource}
            >
              {activeSource?.tabs.map((t) => (
                <option key={t.nama} value={t.nama}>
                  {t.nama} ({t.baris - 1 > 0 ? t.baris - 1 : 0} baris)
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 6, flex: 1, minWidth: 200 }}>
              <input
                className="input"
                placeholder="Cari di semua kolom..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary btn-sm" onClick={handleSearch}>
                <Search size={14} style={{ marginRight: 4 }} />
                Cari
              </button>
            </div>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              title="Muat ulang"
              onClick={() => setPage((p) => p)}
              disabled={isFetching}
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="card-body" style={{ overflowX: 'auto' }}>
            {isError ? (
              <p style={{ color: '#dc2626', fontSize: '0.875rem' }}>
                {(error as Error)?.message || 'Gagal memuat data.'}
              </p>
            ) : isLoading || !data ? (
              <div className="skeleton" style={{ height: 300, width: '100%' }} />
            ) : data.header.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                Tab ini kosong.
              </p>
            ) : (
              <>
                <table className="data-table">
                  <thead>
                    <tr>
                      {data.header.map((h, i) => (
                        <th key={i} style={{ whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} style={{ whiteSpace: 'nowrap', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {fmtCell(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {data.rows.length === 0 && (
                      <tr>
                        <td colSpan={data.header.length} style={{ textAlign: 'center', color: '#64748b' }}>
                          Tidak ada baris yang cocok.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 12,
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {data.total} baris
                    {q ? ` (hasil pencarian "${q}")` : ''} · Halaman {data.page} dari{' '}
                    {data.totalPages} · Diperbarui{' '}
                    {new Date(data.updatedAt).toLocaleTimeString('id-ID')}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={data.page <= 1 || isFetching}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Sebelumnya
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={data.page >= data.totalPages || isFetching}
                      onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
