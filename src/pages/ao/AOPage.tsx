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
import { getAO, createAO, updateAOStatus, type CreateAOForm } from '@/lib/api/ao'
import { getProspek } from '@/lib/api/prospek'
import { getWilayah } from '@/lib/api/wilayah'
import { rankWilayah } from '@/lib/services/priority-engine'
import { useAuth } from '@/lib/auth/auth-context'
import {
  formatDate,
  formatHektar,
  getPriorityLevelInfo,
  getStatusProspekInfo,
  getScoreColor,
} from '@/lib/utils'

const aoSchema = z.object({
  namaAO: z.string().min(3, 'Nama AO minimal 3 karakter'),
  email: z.string().email('Format email tidak valid'),
  wilayah: z.array(z.string()).min(1, 'Pilih minimal 1 wilayah penugasan'),
  status: z.enum(['AKTIF', 'TIDAK_AKTIF']),
})

export default function AOPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedWilayahList, setSelectedWilayahList] = useState<string[]>([])

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAJEMEN'

  const { data: aoList = [], isLoading: loadingAO } = useQuery({
    queryKey: ['ao'],
    queryFn: getAO,
  })

  const { data: wilayahList = [], isLoading: loadingWilayah } = useQuery({
    queryKey: ['wilayah'],
    queryFn: () => getWilayah(),
  })

  const { data: prospekData, isLoading: loadingProspek } = useQuery({
    queryKey: ['prospek'],
    queryFn: () => getProspek({ limit: 100 }),
  })

  // Priority ranking
  const rankedWilayah = rankWilayah(wilayahList, prospekData?.items || [])

  // Find active AO profile (if logged in as AO)
  const currentAO = aoList.find((a) => a.idAO === user?.id || a.namaAO === user?.nama) || aoList[0]

  // Prospek assigned to current AO
  const aoProspeks = (prospekData?.items || []).filter(
    (p) => p.idAO === currentAO?.idAO || p.namaAO === currentAO?.namaAO
  )

  const prospekSelesai = aoProspeks.filter((p) => p.status === 'CLOSING' || p.status === 'POTENSIAL').length
  const menungguSurvey = aoProspeks.filter((p) => p.status === 'BARU' || p.status === 'DALAM_PROSPEK').length

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateAOForm>({
    resolver: zodResolver(aoSchema),
    defaultValues: {
      status: 'AKTIF',
      wilayah: [],
    },
  })

  const createMutation = useMutation({
    mutationFn: (form: CreateAOForm) => createAO(form),
    onSuccess: (newAO) => {
      toast.success(`AO ${newAO.namaAO} berhasil ditambahkan!`)
      queryClient.invalidateQueries({ queryKey: ['ao'] })
      setIsAddModalOpen(false)
      setSelectedWilayahList([])
      reset()
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menambahkan AO')
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'AKTIF' | 'TIDAK_AKTIF' }) =>
      updateAOStatus(id, status),
    onSuccess: () => {
      toast.success('Status AO berhasil diperbarui')
      queryClient.invalidateQueries({ queryKey: ['ao'] })
    },
  })

  const handleToggleWilayah = (kecamatanName: string) => {
    const next = selectedWilayahList.includes(kecamatanName)
      ? selectedWilayahList.filter((w) => w !== kecamatanName)
      : [...selectedWilayahList, kecamatanName]

    setSelectedWilayahList(next)
    setValue('wilayah', next, { shouldValidate: true })
  }

  const onSubmit = (data: CreateAOForm) => {
    createMutation.mutate(data)
  }

  const isLoading = loadingAO || loadingWilayah || loadingProspek

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Dev only banner */}
      <div className="dev-banner">
        <Sparkles size={16} />
        <div>
          <strong>Manajemen & Portal Account Officer (AO):</strong> Admin dapat meregistrasikan AO baru dan memetakan wilayah penugasan kecamatan ke Google Spreadsheet (Sheet: `MASTER_AO`).
        </div>
      </div>

      {/* Admin / Manager Toolbar: Add AO Button */}
      {isAdminOrManager && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Manajemen Account Officer (AO)</h1>
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
              Tambah AO Baru
            </button>
          )}
        </div>
      )}

      {/* Master AO List Table (Visible to Admin & Manajemen) */}
      {isAdminOrManager && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                Daftar Master Account Officer ({aoList.length} Petugas)
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                Petugas AO yang terdaftar untuk penugasan prospek dan survey lapangan
              </p>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID AO</th>
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
                ) : aoList.map((ao) => {
                  const aoProspectsCount = (prospekData?.items || []).filter(
                    (p) => p.idAO === ao.idAO || p.namaAO === ao.namaAO
                  ).length

                  return (
                    <tr key={ao.idAO}>
                      <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#94a3b8' }}>
                        {ao.idAO}
                      </td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>
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
                            {ao.namaAO.charAt(0)}
                          </div>
                          <span>{ao.namaAO}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                        {ao.email || '-'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {ao.wilayah && ao.wilayah.length > 0 ? (
                            ao.wilayah.map((w) => (
                              <span key={w} className="badge" style={{ background: '#f8fafc', color: '#334155', borderColor: '#e2e8f0' }}>
                                {w}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Belum ada wilayah</span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: aoProspectsCount > 0 ? '#16a34a' : '#64748b' }}>
                        {aoProspectsCount} Prospek
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: ao.status === 'AKTIF' ? '#f0fdf4' : '#fef2f2',
                            color: ao.status === 'AKTIF' ? '#16a34a' : '#dc2626',
                            borderColor: ao.status === 'AKTIF' ? '#bbf7d0' : '#fecaca',
                          }}
                        >
                          {ao.status === 'AKTIF' ? 'Aktif' : 'Non-Aktif'}
                        </span>
                      </td>
                      {user?.role === 'ADMIN' && (
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() =>
                              statusMutation.mutate({
                                id: ao.idAO,
                                status: ao.status === 'AKTIF' ? 'TIDAK_AKTIF' : 'AKTIF',
                              })
                            }
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '0.75rem' }}
                          >
                            {ao.status === 'AKTIF' ? 'Nonaktifkan' : 'Aktifkan'}
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

      {/* AO Personalized Banner (Main view for AO role) */}
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
                {currentAO?.namaAO ? currentAO.namaAO.charAt(0) : 'A'}
              </div>
              <div>
                <div style={{ fontSize: '0.8125rem', color: '#bbf7d0', fontWeight: 600, textTransform: 'uppercase' }}>
                  Account Officer Portal
                </div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 4px' }}>
                  Halo, {currentAO?.namaAO || user?.nama || 'Petugas AO'}
                </h1>
                <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)' }}>
                  Wilayah Tugas: {currentAO?.wilayah?.join(', ') || 'Semua Wilayah'}
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

      {/* AO Quick Metrics Cards */}
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
            {isAdminOrManager ? 'Total Prospek Seluruh AO' : 'Prospek Saya'}
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: 6 }}>
            {isLoading ? <div className="skeleton" style={{ height: 32, width: 40 }} /> : isAdminOrManager ? (prospekData?.total || 0) : aoProspeks.length}
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

      {/* Top Rekomendasi Wilayah untuk AO (PRD Section 12) */}
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

      {/* Daftar Prospek Milik AO */}
      {!isAdminOrManager && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>
                Daftar Prospek Saya ({aoProspeks.length})
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                Kelompok tani yang sedang dalam penanganan Anda
              </p>
            </div>
            <Link to="/prospek" className="btn btn-primary btn-sm">
              Tambah Prospek
            </Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Gapoktan</th>
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
                ) : aoProspeks.length > 0 ? (
                  aoProspeks.map((p) => {
                    const statusInfo = getStatusProspekInfo(p.status)
                    return (
                      <tr key={p.idProspek}>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{p.namaGapoktan}</td>
                        <td>Kec. {p.kecamatan}</td>
                        <td>
                          <span className="badge" style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}>
                            {p.komoditas}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8125rem' }}>{p.estimasiKebutuhan || '-'}</td>
                        <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>{formatDate(p.tanggal)}</td>
                        <td>
                          <span className={`badge ${statusInfo.badge}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
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

      {/* Modal Tambah AO Baru (Admin Only) */}
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
                  Registrasi Account Officer (AO) Baru
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
                {/* Nama AO */}
                <div>
                  <label className="input-label">Nama Lengkap Petugas AO</label>
                  <input
                    type="text"
                    placeholder="Contoh: Rahmat Hidayat"
                    className={`input ${errors.namaAO ? 'error' : ''}`}
                    {...register('namaAO')}
                  />
                  {errors.namaAO && <p className="input-error">{errors.namaAO.message}</p>}
                </div>

                {/* Email AO */}
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
                  {createMutation.isPending ? 'Mendaftarkan...' : 'Daftarkan AO Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
