import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  UserPlus,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { getAnalis, createAnalis, updateAnalisStatus, type CreateAnalisForm } from '@/lib/api/analis'
import { getProspek } from '@/lib/api/prospek'
import { getWilayah } from '@/lib/api/wilayah'
import { rankWilayah } from '@/lib/services/priority-engine'
import { useAuth } from '@/lib/auth/auth-context'
import type { MasterAnalis, MasterWilayah } from '@/lib/types'
import {
  formatDate,
  formatHektar,
  getPriorityLevelInfo,
  getStatusProspekInfo,
  getScoreColor,
} from '@/lib/utils'
import { getLocalCache } from '@/lib/utils/cache'
import { MOCK_ANALIS, MOCK_WILAYAH, MOCK_PROSPEK } from '@/lib/mock/mock-data'

const analisSchema = z.object({
  namaAnalis: z.string().min(3, 'Nama Analis minimal 3 karakter'),
  email: z.string().email('Format email tidak valid'),
  wilayah: z.array(z.string()).min(1, 'Pilih minimal 1 wilayah penugasan'),
  status: z.enum(['AKTIF', 'TIDAK_AKTIF']),
})

export default function AnalisPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedWilayahList, setSelectedWilayahList] = useState<string[]>([])

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAJEMEN'

  const { data: analisList = [] } = useQuery({
    queryKey: ['analis'],
    queryFn: getAnalis,
    initialData: () => getLocalCache<MasterAnalis[]>('analis_all') ?? MOCK_ANALIS,
    initialDataUpdatedAt: 0,
  })

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

  // Priority ranking
  const rankedWilayah = rankWilayah(wilayahList, prospekData?.items || [])

  // Find active Analis profile (if logged in as Analis)
  const currentAnalis = analisList.find((a) => a.idAnalis === user?.id || a.namaAnalis === user?.nama) || analisList[0]

  // Prospek assigned to current Analis
  const analisProspeks = (prospekData?.items || []).filter(
    (p) => p.idAnalis === currentAnalis?.idAnalis || p.namaAnalis === currentAnalis?.namaAnalis
  )

  const prospekSelesai = analisProspeks.filter((p) => p.status === 'CLOSING' || p.status === 'POTENSIAL').length
  const menungguSurvey = analisProspeks.filter((p) => p.status === 'BARU' || p.status === 'DALAM_PROSPEK').length

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateAnalisForm>({
    resolver: zodResolver(analisSchema),
    defaultValues: {
      status: 'AKTIF',
      wilayah: [],
    },
  })

  const createMutation = useMutation({
    mutationFn: (form: CreateAnalisForm) => createAnalis(form),
    onSuccess: (newAnalis) => {
      toast.success(`Analis ${newAnalis.namaAnalis} berhasil ditambahkan!`)
      queryClient.invalidateQueries({ queryKey: ['analis'] })
      setIsAddModalOpen(false)
      setSelectedWilayahList([])
      reset()
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menambahkan Analis')
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'AKTIF' | 'TIDAK_AKTIF' }) =>
      updateAnalisStatus(id, status),
    onSuccess: () => {
      toast.success('Status Analis berhasil diperbarui')
      queryClient.invalidateQueries({ queryKey: ['analis'] })
    },
  })

  const handleToggleWilayah = (kecamatanName: string) => {
    const next = selectedWilayahList.includes(kecamatanName)
      ? selectedWilayahList.filter((w) => w !== kecamatanName)
      : [...selectedWilayahList, kecamatanName]

    setSelectedWilayahList(next)
    setValue('wilayah', next, { shouldValidate: true })
  }

  const onSubmit = (data: CreateAnalisForm) => {
    createMutation.mutate(data)
  }

  const isLoading = analisList.length === 0 && wilayahList.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Dev only banner */}
      <div className="dev-banner">
        <Sparkles size={16} />
        <div>
          <strong>Manajemen & Portal Analis:</strong> Admin dapat meregistrasikan Analis baru dan memetakan wilayah penugasan kecamatan ke Google Spreadsheet (Sheet: `MASTER_ANALIS`).
        </div>
      </div>

      {/* Admin / Manager Toolbar: Add Analis Button */}
      {isAdminOrManager && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Manajemen Analis</h1>
            <p className="page-subtitle">
              Kelola data master petugas lapangan dan alokasi wilayah kerja kecamatan
            </p>
          </div>
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => {
                setSelectedWilayahList([])
                reset()
                setIsAddModalOpen(true)
              }}
              className="btn btn-primary"
            >
              <UserPlus size={16} />
              Tambah Analis Baru
            </button>
          )}
        </div>
      )}

      {/* Master Analis List Table (Visible to Admin & Manajemen) */}
      {isAdminOrManager && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                Daftar Master Analis ({analisList.length} Petugas)
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                Petugas Analis yang terdaftar untuk penugasan prospek dan survey lapangan
              </p>
            </div>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID Analis</th>
                  <th>Nama Petugas</th>
                  <th>Email</th>
                  <th>Wilayah Penugasan</th>
                  <th>Prospek Aktif</th>
                  <th>Status</th>
                  {user?.role === 'ADMIN' && <th style={{ textAlign: 'right' }}>Aksi</th>}
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
                ) : analisList.map((analis) => {
                  const analisProspectsCount = (prospekData?.items || []).filter(
                    (p) => p.idAnalis === analis.idAnalis || p.namaAnalis === analis.namaAnalis
                  ).length

                  return (
                    <tr key={analis.idAnalis}>
                      <td data-label="ID Analis" style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#94a3b8' }}>
                        {analis.idAnalis}
                      </td>
                      <td data-label="Nama Petugas" style={{ fontWeight: 700, color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: '#dcfce7',
                            color: '#15803d',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}>
                            {analis.namaAnalis.charAt(0)}
                          </div>
                          <span>{analis.namaAnalis}</span>
                        </div>
                      </td>
                      <td data-label="Email" style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                        {analis.email || '-'}
                      </td>
                      <td data-label="Wilayah Penugasan">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {analis.wilayah && analis.wilayah.length > 0 ? (
                            analis.wilayah.map((w: string) => (
                              <span key={w} className="badge" style={{ background: '#f8fafc', color: '#334155', borderColor: '#e2e8f0' }}>
                                {w}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Belum ada wilayah</span>
                          )}
                        </div>
                      </td>
                      <td data-label="Prospek Aktif" style={{ fontWeight: 600, color: analisProspectsCount > 0 ? '#16a34a' : '#64748b' }}>
                        {analisProspectsCount} Prospek
                      </td>
                      <td data-label="Status">
                        <span
                          className="badge"
                          style={{
                            background: analis.status === 'AKTIF' ? '#f0fdf4' : '#fef2f2',
                            color: analis.status === 'AKTIF' ? '#16a34a' : '#dc2626',
                            borderColor: analis.status === 'AKTIF' ? '#bbf7d0' : '#fecaca',
                          }}
                        >
                          {analis.status === 'AKTIF' ? 'Aktif' : 'Non-Aktif'}
                        </span>
                      </td>
                      {user?.role === 'ADMIN' && (
                        <td data-label="Aksi" style={{ textAlign: 'right' }}>
                          <button
                            onClick={() =>
                              statusMutation.mutate({
                                id: analis.idAnalis,
                                status: analis.status === 'AKTIF' ? 'TIDAK_AKTIF' : 'AKTIF',
                              })
                            }
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '0.75rem' }}
                          >
                            {analis.status === 'AKTIF' ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analis Personalized Banner (Main view for Analis role) */}
      {!isAdminOrManager && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #15803d, #166534)',
            color: 'white',
            padding: '24px 28px',
            border: 'none',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  border: '2px solid rgba(255,255,255,0.4)',
                }}
              >
                {currentAnalis?.namaAnalis ? currentAnalis.namaAnalis.charAt(0) : 'A'}
              </div>
              <div>
                <div style={{ fontSize: '0.8125rem', color: '#bbf7d0', fontWeight: 600, textTransform: 'uppercase' }}>
                  Portal Analis
                </div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 4px' }}>
                  Halo, {currentAnalis?.namaAnalis || user?.nama || 'Petugas Analis'}
                </h1>
                <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)' }}>
                  Wilayah Tugas: {currentAnalis?.wilayah?.join(', ') || 'Semua Wilayah'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <Link to="/survey" className="btn btn-secondary btn-sm" style={{ background: 'white', color: '#15803d', fontWeight: 700 }}>
                Form Survey Lapangan
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Analis Quick Metrics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}
      >
        <div className="kpi-card">
          <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Wilayah Prioritas Tinggi</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#dc2626', marginTop: 6 }}>
            {isLoading ? <div className="skeleton" style={{ height: 32, width: 40 }} /> : rankedWilayah.filter((w) => w.level === 'TINGGI').length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>Kecamatan Siap Prospek</div>
        </div>

        <div className="kpi-card">
          <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>
            {isAdminOrManager ? 'Total Prospek Seluruh Analis' : 'Prospek Saya'}
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: 6 }}>
            {isLoading ? <div className="skeleton" style={{ height: 32, width: 40 }} /> : isAdminOrManager ? (prospekData?.total || 0) : analisProspeks.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>Total Gapoktan Diproses</div>
        </div>

        <div className="kpi-card">
          <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Survey / Prospek Selesai</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a', marginTop: 6 }}>
            {isLoading ? <div className="skeleton" style={{ height: 32, width: 40 }} /> : prospekSelesai}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: 4 }}>Potensial & Closing</div>
        </div>

        <div className="kpi-card">
          <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Menunggu Tindak Lanjut</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#d97706', marginTop: 6 }}>
            {isLoading ? <div className="skeleton" style={{ height: 32, width: 40 }} /> : menungguSurvey}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: 4 }}>Perlu Survey / Follow-up</div>
        </div>
      </div>

      {/* Top Rekomendasi Wilayah untuk Analis (PRD Section 12) */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
              Rekomendasi Wilayah Prospek Teratas
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              Wilayah dengan potensi alsintan terbesar berdasarkan analisis data pertanian
            </p>
          </div>
          <Link to="/prioritas" className="btn btn-ghost btn-sm" style={{ color: '#16a34a' }}>
            Lihat Semua Ranking
          </Link>
        </div>
        <div className="card-body">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 16,
            }}
          >
            {isLoading
              ? [1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 140 }} />)
              : rankedWilayah.slice(0, 3).map((rw) => {
                  const raw = wilayahList.find((w) => w.idKecamatan === rw.idKecamatan)
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
                          <span className={`rank-badge rank-${rw.rank}`}>#{rw.rank}</span>
                          <span className={`badge ${levelInfo.badge}`}>{levelInfo.label}</span>
                        </div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                          Kecamatan {rw.kecamatan}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 4 }}>
                          Priority Score: <strong className={getScoreColor(rw.score)}>{rw.score}/100</strong>
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#475569', marginTop: 6 }}>
                          • Gapoktan: <strong>{raw?.jumlahGapoktan || 0} unit</strong><br />
                          • Luas Lahan: <strong>{formatHektar(raw?.luasLahan || 0)}</strong>
                        </div>
                      </div>

                      <div style={{ marginTop: 16 }}>
                        <Link
                          to={`/prospek?kecamatan=${rw.kecamatan}`}
                          className="btn btn-primary btn-sm"
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          Lihat Wilayah & Prospek
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  )
                })}
          </div>
        </div>
      </div>

      {/* Daftar Prospek Milik Analis */}
      {!isAdminOrManager && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>
                Daftar Prospek Saya ({analisProspeks.length})
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                Kelompok tani yang sedang dalam penanganan Anda
              </p>
            </div>
            <Link to="/prospek" className="btn btn-primary btn-sm">
              Tambah Prospek
            </Link>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nama Prospek</th>
                  <th>Kecamatan</th>
                  <th>Komoditas</th>
                  <th>Estimasi Alsintan</th>
                  <th>Tanggal</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [1, 2].map((i) => (
                    <tr key={i}>
                      <td colSpan={7}>
                        <div className="skeleton" style={{ height: 28, width: '100%' }} />
                      </td>
                    </tr>
                  ))
                ) : analisProspeks.length > 0 ? (
                  analisProspeks.map((p) => {
                    const statusInfo = getStatusProspekInfo(p.status)
                    return (
                      <tr key={p.idProspek}>
                        <td data-label="Nama Prospek" style={{ fontWeight: 700, color: '#0f172a' }}>{p.namaProspek || p.namaGapoktan}</td>
                        <td data-label="Kecamatan">Kec. {p.kecamatan}</td>
                        <td data-label="Komoditas">
                          <span className="badge" style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}>
                            {p.komoditas}
                          </span>
                        </td>
                        <td data-label="Estimasi Alsintan" style={{ fontSize: '0.8125rem' }}>{p.estimasiKebutuhan || '-'}</td>
                        <td data-label="Tanggal" style={{ fontSize: '0.8125rem', color: '#64748b' }}>{formatDate(p.tanggal)}</td>
                        <td data-label="Status">
                          <span className={`badge ${statusInfo.badge}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td data-label="Aksi" style={{ textAlign: 'right' }}>
                          <Link
                            to={`/survey?prospekId=${p.idProspek}`}
                            className="btn btn-secondary btn-sm"
                          >
                            Survey
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}>
                      Belum ada prospek yang tercatat atas nama Anda
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Tambah Analis Baru (Admin Only) */}
      {isAddModalOpen && (
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
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="card animate-slide-up"
            style={{ width: '100%', maxWidth: 520 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserPlus size={18} color="#16a34a" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  Registrasi Analis Baru
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="btn btn-ghost btn-icon btn-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Nama Analis */}
                <div>
                  <label className="input-label">Nama Lengkap Petugas Analis</label>
                  <input
                    type="text"
                    placeholder="Contoh: Rahmat Hidayat"
                    className={`input ${errors.namaAnalis ? 'error' : ''}`}
                    {...register('namaAnalis')}
                  />
                  {errors.namaAnalis && <p className="input-error">{errors.namaAnalis.message}</p>}
                </div>

                {/* Email Analis */}
                <div>
                  <label className="input-label">Email Petugas (Akun Login)</label>
                  <input
                    type="email"
                    placeholder="nama@siap-alsintan.id"
                    className={`input ${errors.email ? 'error' : ''}`}
                    {...register('email')}
                  />
                  {errors.email && <p className="input-error">{errors.email.message}</p>}
                </div>

                {/* Status */}
                <div>
                  <label className="input-label">Status Keaktifan</label>
                  <select className="input" {...register('status')}>
                    <option value="AKTIF">Aktif</option>
                    <option value="TIDAK_AKTIF">Tidak Aktif</option>
                  </select>
                </div>

                {/* Penugasan Wilayah Kecamatan */}
                <div>
                  <label className="input-label">Alokasi Penugasan Wilayah Kecamatan</label>
                  <div style={{
                    maxHeight: 150,
                    overflowY: 'auto',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    background: '#f8fafc',
                  }}>
                    {wilayahList.map((w) => {
                      const isSelected = selectedWilayahList.includes(`Kec. ${w.kecamatan}`)
                      return (
                        <label
                          key={w.idKecamatan}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: '0.875rem',
                            color: '#334155',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleWilayah(`Kec. ${w.kecamatan}`)}
                            style={{ accentColor: '#16a34a' }}
                          />
                          <span>Kec. {w.kecamatan} (Kab. {w.kabupaten})</span>
                        </label>
                      )
                    })}
                  </div>
                  {errors.wilayah && <p className="input-error">{errors.wilayah.message}</p>}
                </div>
              </div>

              <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn btn-primary btn-sm"
                >
                  {createMutation.isPending ? 'Mendaftarkan...' : 'Daftarkan Analis Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
