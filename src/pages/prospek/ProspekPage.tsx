import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  Plus,
  Search,
  Filter,
  ClipboardList,
  Building,
  User,
  Sparkles,
} from 'lucide-react'
import { getProspek, createProspek } from '@/lib/api/prospek'
import { getWilayah } from '@/lib/api/wilayah'
import type { StatusProspek, CreateProspekForm, DataProspek, MasterWilayah } from '@/lib/types'
import {
  formatDate,
  getStatusProspekInfo,
} from '@/lib/utils'

import { getLocalCache } from '@/lib/utils/cache'
import { MOCK_WILAYAH, MOCK_PROSPEK } from '@/lib/mock/mock-data'

const prospekSchema = z.object({
  idKecamatan: z.string().min(1, 'Pilih kecamatan'),
  namaGapoktan: z.string().min(3, 'Nama Gapoktan minimal 3 karakter'),
  komoditas: z.string().min(1, 'Pilih komoditas'),
  estimasiKebutuhan: z.string().optional(),
  catatan: z.string().optional(),
})

export default function ProspekPage() {
  const [searchParams] = useSearchParams()
  const initialKecamatan = searchParams.get('kecamatan') || ''

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [kecamatanFilter, setKecamatanFilter] = useState<string>(initialKecamatan)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedProspek, setSelectedProspek] = useState<DataProspek | null>(null)

  const queryClient = useQueryClient()

  useEffect(() => {
    if (initialKecamatan) {
      setKecamatanFilter(initialKecamatan)
    }
  }, [initialKecamatan])

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

  const { data: wilayahList = [] } = useQuery({
    queryKey: ['wilayah'],
    queryFn: () => getWilayah(),
    initialData: () => getLocalCache<MasterWilayah[]>('wilayah_all') ?? MOCK_WILAYAH,
    initialDataUpdatedAt: 0,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProspekForm>({
    resolver: zodResolver(prospekSchema),
    defaultValues: {
      idKecamatan: initialKecamatan
        ? wilayahList.find((w) => w.kecamatan === initialKecamatan)?.idKecamatan || ''
        : '',
      komoditas: 'Padi',
    },
  })

  const createMutation = useMutation({
    mutationFn: (form: CreateProspekForm) => createProspek(form),
    onSuccess: (newProspek) => {
      toast.success(`Prospek ${newProspek.namaGapoktan} berhasil dicatat`)
      queryClient.invalidateQueries({ queryKey: ['prospek'] })
      setIsCreateOpen(false)
      reset()
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan prospek')
    },
  })

  const onSubmit = (data: CreateProspekForm) => {
    createMutation.mutate(data)
  }

  // Filter items
  const items = prospekData?.items || []
  const filteredItems = items.filter((p) => {
    const matchSearch =
      p.namaGapoktan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.kecamatan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.namaAO.toLowerCase().includes(searchQuery.toLowerCase())

    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter
    const matchKecamatan =
      !kecamatanFilter || p.kecamatan.toLowerCase().includes(kecamatanFilter.toLowerCase())

    return matchSearch && matchStatus && matchKecamatan
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Dev only banner */}
      <div className="dev-banner">
        <Sparkles size={16} />
        <div>
          <strong>Pipeline Prospek Fase 1:</strong> Terintegrasi ke Google Spreadsheet. Prospek baru dapat dibuat dan di-assign ke AO untuk tindak lanjut survey lapangan.
        </div>
      </div>

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Data Prospek Alsintan</h1>
            <p className="page-subtitle">
              Pencatatan dan pemantauan pipeline prospek kelompok tani (Gapoktan)
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn btn-primary"
          >
            <Plus size={16} />
            Tambah Prospek Baru
          </button>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="card" style={{ padding: 14 }}>
        <div className="filter-bar-responsive" style={{ justifyContent: 'space-between' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Cari Gapoktan, AO, atau kecamatan..."
              className="input"
              style={{ paddingLeft: 36 }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 auto' }}>
            <Filter size={16} color="#64748b" style={{ flexShrink: 0 }} />
            <select
              className="input"
              style={{ width: '100%', minWidth: 140 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Semua Status</option>
              <option value="BARU">Baru</option>
              <option value="DALAM_PROSPEK">Dalam Prospek</option>
              <option value="SURVEY">Survey</option>
              <option value="POTENSIAL">Potensial</option>
              <option value="TIDAK_POTENSIAL">Tidak Potensial</option>
              <option value="CLOSING">Closing</option>
            </select>
          </div>

          {/* Kecamatan Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 auto' }}>
            <Building size={16} color="#64748b" style={{ flexShrink: 0 }} />
            <select
              className="input"
              style={{ width: '100%', minWidth: 140 }}
              value={kecamatanFilter}
              onChange={(e) => setKecamatanFilter(e.target.value)}
            >
              <option value="">Semua Kecamatan</option>
              {wilayahList.map((w) => (
                <option key={w.idKecamatan} value={w.kecamatan}>{w.kecamatan}</option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600, paddingLeft: 4 }}>
            Total: <span style={{ color: '#16a34a' }}>{filteredItems.length} Prospek</span>
          </div>
        </div>
      </div>

      {/* Prospek List Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Gapoktan</th>
                <th>Kecamatan</th>
                <th>Komoditas</th>
                <th>AO Penanggung Jawab</th>
                <th>Estimasi Alsintan</th>
                <th>Tanggal</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {!prospekData ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td colSpan={9}>
                      <div className="skeleton" style={{ height: 28, width: '100%' }} />
                    </td>
                  </tr>
                ))
              ) : filteredItems.length > 0 ? (
                filteredItems.map((p) => {
                  const statusInfo = getStatusProspekInfo(p.status as StatusProspek)
                  return (
                    <tr key={p.idProspek}>
                      <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#94a3b8' }}>
                        {p.idProspek}
                      </td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>
                        {p.namaGapoktan}
                      </td>
                      <td>Kec. {p.kecamatan}</td>
                      <td>
                        <span className="badge" style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}>
                          {p.komoditas}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <User size={14} color="#64748b" />
                          <span>{p.namaAO}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8125rem' }}>{p.estimasiKebutuhan || '-'}</td>
                      <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>{formatDate(p.tanggal)}</td>
                      <td>
                        <span className={`badge ${statusInfo.badge}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedProspek(p)}
                          className="btn btn-secondary btn-sm"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8' }}>
                    Belum ada data prospek yang sesuai filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Prospek Baru */}
      {isCreateOpen && (
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
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            className="card animate-slide-up"
            style={{ width: '100%', maxWidth: 500 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardList size={18} color="#16a34a" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  Tambah Prospek Alsintan Baru
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="btn btn-ghost btn-icon btn-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Kecamatan */}
                <div>
                  <label className="input-label">Wilayah Kecamatan</label>
                  <select className={`input ${errors.idKecamatan ? 'error' : ''}`} {...register('idKecamatan')}>
                    <option value="">-- Pilih Kecamatan --</option>
                    {wilayahList.map((w) => (
                      <option key={w.idKecamatan} value={w.idKecamatan}>
                        Kec. {w.kecamatan} (Luas: {w.luasLahan} Ha)
                      </option>
                    ))}
                  </select>
                  {errors.idKecamatan && <p className="input-error">{errors.idKecamatan.message}</p>}
                </div>

                {/* Nama Gapoktan */}
                <div>
                  <label className="input-label">Nama Gapoktan / Kelompok Tani</label>
                  <input
                    type="text"
                    placeholder="Contoh: Gapoktan Tani Makmur"
                    className={`input ${errors.namaGapoktan ? 'error' : ''}`}
                    {...register('namaGapoktan')}
                  />
                  {errors.namaGapoktan && <p className="input-error">{errors.namaGapoktan.message}</p>}
                </div>

                {/* Komoditas */}
                <div>
                  <label className="input-label">Komoditas Utama</label>
                  <select className="input" {...register('komoditas')}>
                    <option value="Padi">Padi</option>
                    <option value="Jagung">Jagung</option>
                    <option value="Kedelai">Kedelai</option>
                    <option value="Hortikultura">Hortikultura</option>
                    <option value="Tebu">Tebu</option>
                  </select>
                </div>

                {/* Estimasi Alsintan */}
                <div>
                  <label className="input-label">Estimasi Kebutuhan Alsintan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Combine Harvester 2 unit / Traktor Roda 4"
                    className="input"
                    {...register('estimasiKebutuhan')}
                  />
                </div>

                {/* Catatan */}
                <div>
                  <label className="input-label">Catatan Lapangan</label>
                  <textarea
                    rows={3}
                    placeholder="Keterangan akses lahan, kontak ketua gapoktan, dll..."
                    className="input"
                    {...register('catatan')}
                  />
                </div>
              </div>

              <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn btn-primary btn-sm"
                >
                  {createMutation.isPending ? 'Menyimpan...' : 'Simpan Prospek'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Prospek */}
      {selectedProspek && (
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
          onClick={() => setSelectedProspek(null)}
        >
          <div
            className="card animate-slide-up"
            style={{ width: '100%', maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                  {selectedProspek.idProspek}
                </span>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                  {selectedProspek.namaGapoktan}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProspek(null)}
                className="btn btn-ghost btn-icon btn-sm"
              >
                ✕
              </button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Status Prospek</span>
                <span className={`badge ${getStatusProspekInfo(selectedProspek.status).badge}`}>
                  {getStatusProspekInfo(selectedProspek.status).label}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Kecamatan</span>
                <strong style={{ color: '#0f172a' }}>Kec. {selectedProspek.kecamatan}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Komoditas</span>
                <strong style={{ color: '#16a34a' }}>{selectedProspek.komoditas}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Account Officer</span>
                <strong>{selectedProspek.namaAO}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Kebutuhan Alsintan</span>
                <strong>{selectedProspek.estimasiKebutuhan || '-'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Tanggal Registrasi</span>
                <span>{formatDate(selectedProspek.tanggal)}</span>
              </div>
              {selectedProspek.catatan && (
                <div style={{ padding: 10, background: '#f8fafc', borderRadius: 8, fontSize: '0.8125rem', color: '#475569' }}>
                  <strong>Catatan:</strong> {selectedProspek.catatan}
                </div>
              )}
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setSelectedProspek(null)} className="btn btn-secondary btn-sm">
                Tutup
              </button>
              <a
                href={`/survey?prospekId=${selectedProspek.idProspek}`}
                className="btn btn-primary btn-sm"
              >
                Lakukan Survey Lapangan
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
