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
  Users,
} from 'lucide-react'
import { getProspek, createProspek } from '@/lib/api/prospek'
import { getWilayah } from '@/lib/api/wilayah'
import { getPoktan } from '@/lib/api/poktan'
import type { StatusProspek, CreateProspekForm, DataProspek, MasterWilayah, MasterPoktan } from '@/lib/types'
import {
  formatDate,
  getStatusProspekInfo,
} from '@/lib/utils'

import { getLocalCache } from '@/lib/utils/cache'
import { MOCK_WILAYAH, MOCK_PROSPEK } from '@/lib/mock/mock-data'

const prospekSchema = z.object({
  idKecamatan: z.string().min(1, 'Pilih kecamatan'),
  namaGapoktan: z.string().min(3, 'Pilih poktan terlebih dahulu'),
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
  // state untuk form tambah prospek
  const [formKecamatan, setFormKecamatan] = useState('')
  const [poktanSearch, setPoktanSearch] = useState('')
  const [selectedPoktan, setSelectedPoktan] = useState<MasterPoktan | null>(null)

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

  // Load poktan saat kecamatan di form dipilih
  const { data: poktanData, isFetching: loadingPoktan } = useQuery({
    queryKey: ['poktan', formKecamatan],
    queryFn: () => getPoktan({ kecamatan: formKecamatan, limit: 1000 }),
    enabled: formKecamatan !== '',
    staleTime: 60 * 60 * 1000,
    retry: 1,
  })

  const poktanList = poktanData?.items ?? []
  const filteredPoktan = poktanSearch
    ? poktanList.filter(p =>
        p.namaPoktan.toLowerCase().includes(poktanSearch.toLowerCase()) ||
        p.desa.toLowerCase().includes(poktanSearch.toLowerCase())
      )
    : poktanList

  const {
    register,
    handleSubmit,
    reset,
    setValue,
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

  const handleCloseCreate = () => {
    setIsCreateOpen(false)
    setFormKecamatan('')
    setPoktanSearch('')
    setSelectedPoktan(null)
    reset()
  }

  const createMutation = useMutation({
    mutationFn: (form: CreateProspekForm) => createProspek(form),
    onSuccess: (newProspek) => {
      toast.success(`Prospek ${newProspek.namaGapoktan} berhasil dicatat`)
      queryClient.invalidateQueries({ queryKey: ['prospek'] })
      handleCloseCreate()
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
      (p.namaAnalis ?? '').toLowerCase().includes(searchQuery.toLowerCase())

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
          <strong>Pipeline Prospek Fase 1:</strong> Terintegrasi ke Google Spreadsheet. Prospek baru dapat dibuat dan di-assign ke Analis untuk tindak lanjut survey lapangan.
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
              placeholder="Cari Gapoktan, Analis, atau kecamatan..."
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
              <option value="DISBURSE">Disburse</option>
              <option value="CAIR">Cair</option>
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
                <th>Analis Penanggung Jawab</th>
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
                      <td data-label="ID" style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#94a3b8' }}>
                        {p.idProspek}
                      </td>
                      <td data-label="Gapoktan" style={{ fontWeight: 700, color: '#0f172a' }}>
                        {p.namaGapoktan}
                      </td>
                      <td data-label="Kecamatan">Kec. {p.kecamatan}</td>
                      <td data-label="Komoditas">
                        <span className="badge" style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}>
                          {p.komoditas}
                        </span>
                      </td>
                      <td data-label="Analis Penanggung Jawab">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <User size={14} color="#64748b" />
                          <span>{p.namaAnalis}</span>
                        </div>
                      </td>
                      <td data-label="Estimasi Alsintan" style={{ fontSize: '0.8125rem' }}>{p.estimasiKebutuhan || '-'}</td>
                      <td data-label="Tanggal" style={{ fontSize: '0.8125rem', color: '#64748b' }}>{formatDate(p.tanggal)}</td>
                      <td data-label="Status">
                        <span className={`badge ${statusInfo.badge}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td data-label="Aksi" style={{ textAlign: 'right' }}>
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
          onClick={handleCloseCreate}
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
              <button onClick={handleCloseCreate} className="btn btn-ghost btn-icon btn-sm">✕</button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Step 1 — Pilih Kecamatan */}
                <div>
                  <label className="input-label">1. Wilayah Kecamatan</label>
                  <select
                    className={`input ${errors.idKecamatan ? 'error' : ''}`}
                    {...register('idKecamatan')}
                    onChange={(e) => {
                      register('idKecamatan').onChange(e)
                      const wil = wilayahList.find(w => w.idKecamatan === e.target.value)
                      setFormKecamatan(wil?.kecamatan || '')
                      setSelectedPoktan(null)
                      setPoktanSearch('')
                      setValue('namaGapoktan', '')
                    }}
                  >
                    <option value="">-- Pilih Kecamatan --</option>
                    {wilayahList.map((w) => (
                      <option key={w.idKecamatan} value={w.idKecamatan}>
                        Kec. {w.kecamatan}
                      </option>
                    ))}
                  </select>
                  {errors.idKecamatan && <p className="input-error">{errors.idKecamatan.message}</p>}
                </div>

                {/* Step 2 — Pilih Poktan */}
                <div>
                  <label className="input-label">
                    2. Pilih Poktan
                    {formKecamatan && (
                      <span style={{ color: '#64748b', fontWeight: 400, marginLeft: 6 }}>
                        — Kec. {formKecamatan} ({poktanList.length} poktan)
                      </span>
                    )}
                  </label>

                  {!formKecamatan ? (
                    <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 8, fontSize: '0.8125rem', color: '#94a3b8', border: '1px dashed #e2e8f0' }}>
                      Pilih kecamatan dulu untuk menampilkan daftar poktan
                    </div>
                  ) : loadingPoktan ? (
                    <div className="skeleton" style={{ height: 40, borderRadius: 8 }} />
                  ) : (
                    <>
                      {/* Search poktan */}
                      <div style={{ position: 'relative', marginBottom: 6 }}>
                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                          className="input"
                          style={{ paddingLeft: 30, fontSize: '0.8125rem' }}
                          placeholder="Cari nama poktan atau desa..."
                          value={poktanSearch}
                          onChange={(e) => setPoktanSearch(e.target.value)}
                        />
                      </div>
                      {/* Dropdown poktan */}
                      <select
                        className={`input ${errors.namaGapoktan ? 'error' : ''}`}
                        size={5}
                        style={{ height: 'auto' }}
                        value={selectedPoktan?.idPoktan || ''}
                        onChange={(e) => {
                          const pok = poktanList.find(p => p.idPoktan === e.target.value)
                          if (pok) {
                            setSelectedPoktan(pok)
                            setValue('namaGapoktan', pok.namaPoktan, { shouldValidate: true })
                          }
                        }}
                      >
                        <option value="">-- Pilih Poktan --</option>
                        {filteredPoktan.map((p) => (
                          <option key={p.idPoktan} value={p.idPoktan}>
                            {p.namaPoktan} — {p.desa}
                          </option>
                        ))}
                      </select>
                      {/* Poktan terpilih */}
                      {selectedPoktan && (
                        <div style={{ marginTop: 6, padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: '0.8125rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Users size={14} color="#16a34a" />
                            <strong style={{ color: '#15803d' }}>{selectedPoktan.namaPoktan}</strong>
                          </div>
                          <div style={{ color: '#64748b', marginTop: 2 }}>
                            Ketua: {selectedPoktan.ketua || '-'} · Desa {selectedPoktan.desa} · {selectedPoktan.jumlahAnggota} anggota
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {/* hidden field namaGapoktan untuk validasi */}
                  <input type="hidden" {...register('namaGapoktan')} />
                  {errors.namaGapoktan && <p className="input-error">Pilih poktan terlebih dahulu</p>}
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
                    rows={2}
                    placeholder="Keterangan akses lahan, kontak ketua, dll..."
                    className="input"
                    {...register('catatan')}
                  />
                </div>
              </div>

              <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={handleCloseCreate} className="btn btn-secondary btn-sm">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !selectedPoktan}
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
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Analis</span>
                <strong>{selectedProspek.namaAnalis}</strong>
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
