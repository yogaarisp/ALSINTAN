import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
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
  Pencil,
  Trash2,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react'
import { getProspek, createProspek, updateProspek, deleteProspek, restoreProspek } from '@/lib/api/prospek'
import { getWilayah } from '@/lib/api/wilayah'
import { getAnalis } from '@/lib/api/analis'
import { isGasConfigured } from '@/lib/api/gas'
import { useAuth } from '@/lib/auth/auth-context'
import type {
  StatusProspek,
  CreateProspekForm,
  DataProspek,
  MasterWilayah,
  MasterAnalis,
  PaginatedResponse,
} from '@/lib/types'
import {
  formatDate,
  formatRupiah,
  formatNumber,
  getStatusProspekInfo,
} from '@/lib/utils'

import { getLocalCache } from '@/lib/utils/cache'
import { MOCK_WILAYAH, MOCK_PROSPEK } from '@/lib/mock/mock-data'

const prospekSchema = z.object({
  idKecamatan: z.string().min(1, 'Pilih kecamatan'),
  namaProspek: z.string().min(3, 'Nama prospek minimal 3 karakter'),
  komoditas: z.string().min(1, 'Pilih komoditas'),
  estimasiKebutuhan: z.string().optional(),
  estimasiPlafon: z.coerce.number().min(0, 'Estimasi plafon tidak boleh negatif').optional(),
})

const editProspekSchema = z.object({
  namaProspek: z.string().min(3, 'Nama prospek minimal 3 karakter'),
  komoditas: z.string().min(1, 'Pilih komoditas'),
  status: z.string().min(1, 'Pilih status'),
  idAnalis: z.string().min(1, 'Pilih Analis penanggung jawab'),
  estimasiKebutuhan: z.string().optional(),
  estimasiPlafon: z.coerce.number().min(0, 'Estimasi plafon tidak boleh negatif').optional(),
})

type EditProspekFormData = z.infer<typeof editProspekSchema>

const STATUS_OPTIONS: StatusProspek[] = [
  'BARU',
  'DALAM_PROSPEK',
  'SURVEY',
  'POTENSIAL',
  'TIDAK_POTENSIAL',
  'CLOSING',
  'DISBURSE',
  'CAIR',
]

/**
 * Bedakan "sudah dinonaktifkan lewat tombol Hapus" dari status
 * TIDAK_POTENSIAL yang memang dipilih manual di pipeline. Penandanya
 * ditulis backend ke kolom CATATAN dengan awalan "Dinonaktifkan".
 */
function isDinonaktifkan(p: DataProspek): boolean {
  return /\|\s*Dinonaktifkan \d{4}-\d{2}-\d{2}/.test(p.catatan || '')
}

export default function ProspekPage() {
  const [searchParams] = useSearchParams()
  const initialKecamatan = searchParams.get('kecamatan') || ''

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [kecamatanFilter, setKecamatanFilter] = useState<string>(initialKecamatan)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedProspek, setSelectedProspek] = useState<DataProspek | null>(null)
  const [editingProspek, setEditingProspek] = useState<DataProspek | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DataProspek | null>(null)
  const [alasanNonaktif, setAlasanNonaktif] = useState('')

  const { user } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (initialKecamatan) {
      setKecamatanFilter(initialKecamatan)
    }
  }, [initialKecamatan])

  const { data: prospekData, isLoading: isProspekLoading } = useQuery({
    queryKey: ['prospek'],
    queryFn: () => getProspek({ limit: 100 }),
    // Jangan pernah tampilkan MOCK_PROSPEK sebagai data nyata: ID-nya (P001,
    // P002) sama persis dengan baris asli di DATA_PROSPEK, jadi tabel akan
    // terlihat seperti ada 5 prospek padahal di spreadsheet hanya 2. Mock
    // hanya dipakai kalau GAS memang belum dikonfigurasi; selain itu tunggu
    // respons asli atau tampilkan skeleton.
    initialData: () => {
      const cached = getLocalCache<PaginatedResponse<DataProspek>>('prospek_all')
      if (cached) return cached
      if (!isGasConfigured()) {
        return {
          items: MOCK_PROSPEK,
          total: MOCK_PROSPEK.length,
          page: 1,
          limit: 100,
          totalPages: 1,
        }
      }
      return undefined
    },
    initialDataUpdatedAt: 0,
  })

  const { data: wilayahList = [] } = useQuery({
    queryKey: ['wilayah'],
    queryFn: () => getWilayah(),
    initialData: () => getLocalCache<MasterWilayah[]>('wilayah_all') ?? MOCK_WILAYAH,
    initialDataUpdatedAt: 0,
  })

  const { data: analisList = [] } = useQuery({
    queryKey: ['analis'],
    queryFn: () => getAnalis(),
    initialData: () => getLocalCache<MasterAnalis[]>('analis_all'),
    initialDataUpdatedAt: 0,
  })

  // Hanya Analis AKTIF yang boleh jadi penanggung jawab. Analis yang sedang
  // ditugaskan tetap ditampilkan walau nonaktif, supaya nilainya tidak hilang
  // dari dropdown saat prospek diedit.
  const analisAktif = analisList.filter((a) => a.status === 'AKTIF')
  const opsiAnalis = (() => {
    if (!editingProspek?.idAnalis) return analisAktif
    if (analisAktif.some((a) => a.idAnalis === editingProspek.idAnalis)) return analisAktif
    const sekarang = analisList.find((a) => a.idAnalis === editingProspek.idAnalis)
    return sekarang ? [sekarang, ...analisAktif] : analisAktif
  })()

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateProspekForm>({
    resolver: zodResolver(prospekSchema),
    defaultValues: {
      idKecamatan: initialKecamatan
        ? wilayahList.find((w) => w.kecamatan === initialKecamatan)?.idKecamatan || ''
        : '',
      namaProspek: '',
      komoditas: 'Padi',
      estimasiKebutuhan: '',
      estimasiPlafon: undefined,
    },
  })

  const createMutation = useMutation({
    mutationFn: (form: CreateProspekForm) => createProspek(form),
    onSuccess: (newProspek) => {
      toast.success(`Prospek ${newProspek.namaProspek || newProspek.namaGapoktan} berhasil dicatat`)
      queryClient.invalidateQueries({ queryKey: ['prospek'] })
      setIsCreateOpen(false)
      reset()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal menyimpan prospek')
    },
  })

  const onSubmit = (data: CreateProspekForm) => {
    // Analis penanggung jawab = pengguna yang sedang login (kalau dia Analis).
    // Tanpa ini backend jatuh ke default AN001 dan semua prospek manual
    // menumpuk ke satu orang.
    const isAnalis = user?.role === 'ANALIS'
    createMutation.mutate({
      ...data,
      ...(isAnalis ? { idAnalis: user!.id, namaAnalis: user!.nama } : {}),
    })
  }

  // ── Form edit ────────────────────────────────────────────
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    control: controlEdit,
    formState: { errors: editErrors },
  } = useForm<EditProspekFormData>({
    resolver: zodResolver(editProspekSchema),
    defaultValues: {
      namaProspek: '',
      komoditas: 'Padi',
      status: 'BARU',
      idAnalis: '',
      estimasiKebutuhan: '',
      estimasiPlafon: undefined,
    },
  })

  const openEdit = (p: DataProspek) => {
    resetEdit({
      namaProspek: p.namaProspek || p.namaGapoktan,
      komoditas: p.komoditas || 'Padi',
      status: p.status,
      idAnalis: p.idAnalis || '',
      estimasiKebutuhan: p.estimasiKebutuhan || '',
      estimasiPlafon: p.estimasiPlafon,
    })
    setSelectedProspek(null)
    setEditingProspek(p)
  }

  const updateMutation = useMutation({
    mutationFn: (form: EditProspekFormData) =>
      updateProspek({
        idProspek: editingProspek!.idProspek,
        namaProspek: form.namaProspek,
        komoditas: form.komoditas,
        status: form.status as StatusProspek,
        // Hanya kirim idAnalis kalau benar-benar diganti. Kalau tidak, backend
        // akan menolak karena analis lama mungkin sudah TIDAK_AKTIF.
        ...(form.idAnalis !== editingProspek!.idAnalis ? { idAnalis: form.idAnalis } : {}),
        estimasiKebutuhan: form.estimasiKebutuhan,
        estimasiPlafon: form.estimasiPlafon,
      }),
    onSuccess: (updated) => {
      toast.success(`Prospek ${updated.namaProspek || updated.namaGapoktan} diperbarui`)
      queryClient.invalidateQueries({ queryKey: ['prospek'] })
      setEditingProspek(null)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal memperbarui prospek')
    },
  })

  // ── Nonaktifkan (soft delete) ─────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (p: DataProspek) => deleteProspek(p.idProspek, alasanNonaktif.trim() || undefined),
    onSuccess: (res) => {
      if (res.sudahNonaktif) {
        toast('Prospek ini sudah nonaktif sebelumnya', { icon: 'ℹ️' })
      } else {
        const info = res.jumlahSurvey > 0
          ? ` (${res.jumlahSurvey} data survey tetap tersimpan)`
          : ''
        toast.success(`Prospek dinonaktifkan${info}`)
      }
      queryClient.invalidateQueries({ queryKey: ['prospek'] })
      setDeleteTarget(null)
      setAlasanNonaktif('')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal menonaktifkan prospek')
    },
  })

  const restoreMutation = useMutation({
    mutationFn: (p: DataProspek) => restoreProspek(p.idProspek, 'BARU'),
    onSuccess: (restored) => {
      toast.success(`Prospek ${restored.namaProspek || restored.namaGapoktan} diaktifkan kembali`)
      queryClient.invalidateQueries({ queryKey: ['prospek'] })
      setSelectedProspek(null)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal mengaktifkan kembali prospek')
    },
  })

  // Filter items
  const items = prospekData?.items || []
  const filteredItems = items.filter((p) => {
    const nama = (p.namaProspek || p.namaGapoktan || '').toLowerCase()
    const matchSearch =
      nama.includes(searchQuery.toLowerCase()) ||
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
              placeholder="Cari nama prospek, Analis, atau kecamatan..."
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
                <th>Nama Prospek</th>
                <th>Kecamatan</th>
                <th>Komoditas</th>
                <th>Analis Penanggung Jawab</th>
                <th>Kebutuhan Alat</th>
                <th>Estimasi Plafon</th>
                <th>Tanggal</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {!prospekData || isProspekLoading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td colSpan={10}>
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
                      <td data-label="Nama Prospek" style={{ fontWeight: 700, color: '#0f172a' }}>
                        {p.namaProspek || p.namaGapoktan}
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
                      <td data-label="Kebutuhan Alat" style={{ fontSize: '0.8125rem' }}>{p.estimasiKebutuhan || '-'}</td>
                      <td data-label="Estimasi Plafon" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#16a34a' }}>
                        {p.estimasiPlafon ? formatRupiah(p.estimasiPlafon) : '-'}
                      </td>
                      <td data-label="Tanggal" style={{ fontSize: '0.8125rem', color: '#64748b' }}>{formatDate(p.tanggal)}</td>
                      <td data-label="Status">
                        <span className={`badge ${statusInfo.badge}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td data-label="Aksi" style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setSelectedProspek(p)}
                            className="btn btn-secondary btn-sm"
                          >
                            Detail
                          </button>
                          <button
                            onClick={() => openEdit(p)}
                            className="btn btn-secondary btn-sm"
                            title="Ubah isi prospek"
                          >
                            <Pencil size={14} />
                          </button>
                          {isDinonaktifkan(p) ? (
                            <button
                              onClick={() => restoreMutation.mutate(p)}
                              disabled={restoreMutation.isPending}
                              className="btn btn-secondary btn-sm"
                              title="Aktifkan kembali (status kembali ke Baru)"
                            >
                              <RotateCcw size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => { setDeleteTarget(p); setAlasanNonaktif('') }}
                              className="btn btn-secondary btn-sm"
                              title="Nonaktifkan prospek ini"
                              style={{ color: '#dc2626' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8' }}>
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

                {/* Nama Prospek */}
                <div>
                  <label className="input-label">Nama Prospek (Perorangan)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Bpk. Slamet Riyadi"
                    className={`input ${errors.namaProspek ? 'error' : ''}`}
                    {...register('namaProspek')}
                  />
                  {errors.namaProspek && <p className="input-error">{errors.namaProspek.message}</p>}
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

                {/* Kebutuhan Alat */}
                <div>
                  <label className="input-label">Kebutuhan Alat / Alsintan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Combine Harvester 1 unit / Traktor Roda 4"
                    className="input"
                    {...register('estimasiKebutuhan')}
                  />
                </div>

                {/* Estimasi Plafon */}
                <div>
                  <label className="input-label">Estimasi Plafon (Rp)</label>
                  <Controller
                    name="estimasiPlafon"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Contoh: 45.000.000"
                        className={`input ${errors.estimasiPlafon ? 'error' : ''}`}
                        value={field.value ? formatNumber(field.value) : ''}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '')
                          field.onChange(digits ? Number(digits) : undefined)
                        }}
                      />
                    )}
                  />
                  {errors.estimasiPlafon && <p className="input-error">{errors.estimasiPlafon.message}</p>}
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
                  {selectedProspek.namaProspek || selectedProspek.namaGapoktan}
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
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Kebutuhan Alat</span>
                <strong>{selectedProspek.estimasiKebutuhan || '-'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Estimasi Plafon</span>
                <strong style={{ color: '#16a34a' }}>
                  {selectedProspek.estimasiPlafon ? formatRupiah(selectedProspek.estimasiPlafon) : '-'}
                </strong>
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
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => setSelectedProspek(null)} className="btn btn-secondary btn-sm">
                Tutup
              </button>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {isDinonaktifkan(selectedProspek) ? (
                  <button
                    onClick={() => restoreMutation.mutate(selectedProspek)}
                    disabled={restoreMutation.isPending}
                    className="btn btn-secondary btn-sm"
                  >
                    <RotateCcw size={14} />
                    Aktifkan Kembali
                  </button>
                ) : (
                  <button
                    onClick={() => { setDeleteTarget(selectedProspek); setAlasanNonaktif('') }}
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#dc2626' }}
                  >
                    <Trash2 size={14} />
                    Nonaktifkan
                  </button>
                )}
                <button onClick={() => openEdit(selectedProspek)} className="btn btn-secondary btn-sm">
                  <Pencil size={14} />
                  Ubah
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
        </div>
      )}

      {/* Modal Ubah Prospek */}
      {editingProspek && (
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
          onClick={() => setEditingProspek(null)}
        >
          <div
            className="card animate-slide-up"
            style={{ width: '100%', maxWidth: 500 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pencil size={18} color="#16a34a" />
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                    Ubah Prospek
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                    {editingProspek.idProspek} · Kec. {editingProspek.kecamatan}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setEditingProspek(null)}
                className="btn btn-ghost btn-icon btn-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEdit((v) => updateMutation.mutate(v))}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', background: '#f8fafc', padding: '8px 10px', borderRadius: 8 }}>
                  ID, Kecamatan, dan Tanggal registrasi dikunci — ID dipakai sebagai kunci relasi ke data survey lapangan.
                </div>

                <div>
                  <label className="input-label">Nama Prospek (Perorangan)</label>
                  <input
                    type="text"
                    className={`input ${editErrors.namaProspek ? 'error' : ''}`}
                    {...registerEdit('namaProspek')}
                  />
                  {editErrors.namaProspek && <p className="input-error">{editErrors.namaProspek.message}</p>}
                </div>

                <div>
                  <label className="input-label">Status Prospek</label>
                  <select className="input" {...registerEdit('status')}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {getStatusProspekInfo(s).label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="input-label">Analis Penanggung Jawab</label>
                  <select
                    className={`input ${editErrors.idAnalis ? 'error' : ''}`}
                    {...registerEdit('idAnalis')}
                  >
                    <option value="">-- Pilih Analis --</option>
                    {opsiAnalis.map((a) => (
                      <option key={a.idAnalis} value={a.idAnalis}>
                        {a.namaAnalis} ({a.idAnalis}){a.status !== 'AKTIF' ? ' — nonaktif' : ''}
                      </option>
                    ))}
                  </select>
                  {editErrors.idAnalis && <p className="input-error">{editErrors.idAnalis.message}</p>}
                  {opsiAnalis.length === 0 && (
                    <p className="input-error">Belum ada Analis aktif di MASTER_ANALIS.</p>
                  )}
                </div>

                <div>
                  <label className="input-label">Komoditas Utama</label>
                  <select className="input" {...registerEdit('komoditas')}>
                    <option value="Padi">Padi</option>
                    <option value="Jagung">Jagung</option>
                    <option value="Kedelai">Kedelai</option>
                    <option value="Hortikultura">Hortikultura</option>
                    <option value="Tebu">Tebu</option>
                  </select>
                </div>

                <div>
                  <label className="input-label">Kebutuhan Alat / Alsintan</label>
                  <input
                    type="text"
                    className="input"
                    {...registerEdit('estimasiKebutuhan')}
                  />
                </div>

                <div>
                  <label className="input-label">Estimasi Plafon (Rp)</label>
                  <Controller
                    name="estimasiPlafon"
                    control={controlEdit}
                    render={({ field }) => (
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Contoh: 45.000.000"
                        className={`input ${editErrors.estimasiPlafon ? 'error' : ''}`}
                        value={field.value ? formatNumber(field.value) : ''}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '')
                          field.onChange(digits ? Number(digits) : undefined)
                        }}
                      />
                    )}
                  />
                  {editErrors.estimasiPlafon && <p className="input-error">{editErrors.estimasiPlafon.message}</p>}
                </div>
              </div>

              <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setEditingProspek(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="btn btn-primary btn-sm"
                >
                  {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Nonaktifkan (soft delete) */}
      {deleteTarget && (
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
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="card animate-slide-up"
            style={{ width: '100%', maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} color="#dc2626" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  Nonaktifkan Prospek?
                </h3>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="btn btn-ghost btn-icon btn-sm">
                ✕
              </button>
            </div>

            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: '0.875rem', color: '#334155' }}>
                <strong>{deleteTarget.namaProspek || deleteTarget.namaGapoktan}</strong>{' '}
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8' }}>
                  ({deleteTarget.idProspek})
                </span>{' '}
                akan diubah statusnya menjadi <strong>Tidak Potensial</strong>.
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#475569', background: '#f8fafc', padding: '10px 12px', borderRadius: 8, display: 'flex', gap: 8 }}>
                <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  Barisnya <strong>tidak dihapus</strong> dari spreadsheet. Data survey lapangan yang
                  sudah tercatat tetap terhubung dan tidak kehilangan induknya. Tindakan ini
                  bisa dibatalkan lewat tombol <RotateCcw size={12} style={{ verticalAlign: 'middle' }} /> Aktifkan Kembali.
                </span>
              </div>
              <div>
                <label className="input-label">Alasan (opsional, disimpan di Catatan)</label>
                <input
                  type="text"
                  placeholder="Contoh: lahan tidak bisa dikunjungi, ketua tidak ditemukan, dll..."
                  className="input"
                  value={alasanNonaktif}
                  onChange={(e) => setAlasanNonaktif(e.target.value)}
                />
              </div>
            </div>

            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setDeleteTarget(null)} className="btn btn-secondary btn-sm">
                Batal
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget)}
                disabled={deleteMutation.isPending}
                className="btn btn-primary btn-sm"
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
              >
                {deleteMutation.isPending ? 'Menyimpan...' : 'Ya, Nonaktifkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
