import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  MapPin,
  Camera,
  Navigation,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getProspek } from '@/lib/api/prospek'
import { createSurvey, getSurvey } from '@/lib/api/survey'
import { useAuth } from '@/lib/auth/auth-context'
import { formatRupiah, formatDateTime, getStatusSurveyInfo } from '@/lib/utils'
import type { StatusSurvey } from '@/lib/types'

const surveySchema = z.object({
  idProspek: z.string().min(1, 'Pilih data prospek / gapoktan'),
  namaGapoktan: z.string().min(3, 'Nama Gapoktan harus diisi'),
  jumlahAnggota: z.number().min(1, 'Jumlah anggota minimal 1'),
  luasSawah: z.number().min(0.1, 'Luas sawah minimal 0.1 Ha'),
  jenisAlsintan: z.string().min(2, 'Jenis alsintan harus diisi'),
  estimasiHarga: z.number().min(0, 'Estimasi harga tidak boleh negatif'),
  catatan: z.string().optional(),
})

type SurveyFormData = z.infer<typeof surveySchema>

export default function SurveyPage() {
  const [searchParams] = useSearchParams()
  const initialProspekId = searchParams.get('prospekId') || ''

  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [isGettingGps, setIsGettingGps] = useState(false)
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form')

  const { data: prospekData } = useQuery({
    queryKey: ['prospek'],
    queryFn: () => getProspek({ limit: 100 }),
  })

  const { data: surveyData, isLoading: loadingSurvey } = useQuery({
    queryKey: ['survey'],
    queryFn: () => getSurvey({ limit: 100 }),
  })
  const surveyList = surveyData?.items ?? []

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      idProspek: initialProspekId,
      namaGapoktan: prospekData?.items.find((p) => p.idProspek === initialProspekId)?.namaGapoktan || '',
      jumlahAnggota: 30,
      luasSawah: 50,
      jenisAlsintan: 'Combine Harvester',
      estimasiHarga: 450000000,
    },
  })

  // Geolocation Handler
  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Browser tidak mendukung Geolocation')
      return
    }

    setIsGettingGps(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        })
        setIsGettingGps(false)
        toast.success('Lokasi GPS berhasil diambil')
      },
      (err) => {
        setIsGettingGps(false)
        toast.error(`Gagal mendapatkan GPS: ${err.message}`)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSelectProspek = (id: string) => {
    setValue('idProspek', id)
    const selected = prospekData?.items.find((p) => p.idProspek === id)
    if (selected) {
      setValue('namaGapoktan', selected.namaGapoktan)
      if (selected.estimasiKebutuhan) {
        setValue('jenisAlsintan', selected.estimasiKebutuhan)
      }
    }
  }

  const onSubmit = async (data: SurveyFormData) => {
    // AO login → pakai identitas AO; selain itu biarkan backend memakai AO milik prospek
    const isAO = user?.role === 'AO'
    await createSurvey({
      idProspek: data.idProspek,
      namaGapoktan: data.namaGapoktan,
      jumlahAnggota: data.jumlahAnggota,
      luasSawah: data.luasSawah,
      jenisAlsintan: data.jenisAlsintan,
      estimasiHarga: data.estimasiHarga,
      latitude: gpsLocation?.lat,
      longitude: gpsLocation?.lng,
      accuracy: gpsLocation?.accuracy,
      catatan: data.catatan,
      ...(isAO ? { idAO: user!.id, namaAO: user!.nama } : {}),
    })
    await queryClient.invalidateQueries({ queryKey: ['survey'] })
    toast.success(`Data survey untuk ${data.namaGapoktan} tersimpan ke Spreadsheet!`)
    reset()
    setGpsLocation(null)
    setActiveTab('history')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900, margin: '0 auto', width: '100%' }}>
      {/* Dev only banner */}
      <div className="dev-banner">
        <Sparkles size={16} />
        <div>
          <strong>Survey Lapangan Mobile-First (Fase 1):</strong> Mendukung pengambilan titik koordinat GPS langsung dari perangkat serta pencatatan spesifikasi kebutuhan alsintan ke Google Spreadsheet.
        </div>
      </div>

      {/* Header with Form Mode Info */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Form Survey Lapangan</h1>
            <p className="page-subtitle">
              Pencatatan data aktual kondisi lapangan, verifikasi luas sawah, dan kebutuhan alsintan Gapoktan
            </p>
          </div>
          {/* Bridge option (Google Form) per PRD Section 6G */}
          <a
            href="https://forms.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            <ExternalLink size={14} />
            Buka Google Form Existing
          </a>
        </div>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', gap: 16 }}>
        <button
          onClick={() => setActiveTab('form')}
          style={{
            padding: '10px 16px',
            fontWeight: 600,
            fontSize: '0.875rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'form' ? '2px solid #16a34a' : '2px solid transparent',
            color: activeTab === 'form' ? '#16a34a' : '#64748b',
          }}
        >
          Isi Form Survey Baru
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '10px 16px',
            fontWeight: 600,
            fontSize: '0.875rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'history' ? '2px solid #16a34a' : '2px solid transparent',
            color: activeTab === 'history' ? '#16a34a' : '#64748b',
          }}
        >
          Riwayat Hasil Survey ({surveyData?.total ?? 0})
        </button>
      </div>

      {activeTab === 'form' ? (
        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Reference Prospek */}
              <div>
                <label className="input-label">Pilih Data Prospek Terkait</label>
                <select
                  className={`input ${errors.idProspek ? 'error' : ''}`}
                  {...register('idProspek')}
                  onChange={(e) => handleSelectProspek(e.target.value)}
                >
                  <option value="">-- Pilih Prospek --</option>
                  {prospekData?.items.map((p) => (
                    <option key={p.idProspek} value={p.idProspek}>
                      {p.namaGapoktan} (Kec. {p.kecamatan}) — {p.komoditas}
                    </option>
                  ))}
                </select>
                {errors.idProspek && <p className="input-error">{errors.idProspek.message}</p>}
              </div>

              {/* Nama Gapoktan */}
              <div>
                <label className="input-label">Nama Gapoktan / Kelompok Tani</label>
                <input
                  type="text"
                  placeholder="Nama Gapoktan"
                  className={`input ${errors.namaGapoktan ? 'error' : ''}`}
                  {...register('namaGapoktan')}
                />
                {errors.namaGapoktan && <p className="input-error">{errors.namaGapoktan.message}</p>}
              </div>

              {/* Grid 2 Cols: Anggota & Luas Sawah */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <label className="input-label">Jumlah Anggota Petani</label>
                  <input
                    type="number"
                    placeholder="Contoh: 45"
                    className={`input ${errors.jumlahAnggota ? 'error' : ''}`}
                    {...register('jumlahAnggota', { valueAsNumber: true })}
                  />
                  {errors.jumlahAnggota && <p className="input-error">{errors.jumlahAnggota.message}</p>}
                </div>
                <div>
                  <label className="input-label">Luas Sawah Aktual (Ha)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Contoh: 120.5"
                    className={`input ${errors.luasSawah ? 'error' : ''}`}
                    {...register('luasSawah', { valueAsNumber: true })}
                  />
                  {errors.luasSawah && <p className="input-error">{errors.luasSawah.message}</p>}
                </div>
              </div>

              {/* Grid 2 Cols: Jenis Alsintan & Estimasi Harga */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <label className="input-label">Jenis Alsintan yang Dibutuhkan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Combine Harvester / Traktor 4WD"
                    className={`input ${errors.jenisAlsintan ? 'error' : ''}`}
                    {...register('jenisAlsintan')}
                  />
                  {errors.jenisAlsintan && <p className="input-error">{errors.jenisAlsintan.message}</p>}
                </div>
                <div>
                  <label className="input-label">Estimasi Nilai / Harga (Rp)</label>
                  <input
                    type="number"
                    placeholder="Contoh: 500000000"
                    className={`input ${errors.estimasiHarga ? 'error' : ''}`}
                    {...register('estimasiHarga', { valueAsNumber: true })}
                  />
                  {errors.estimasiHarga && <p className="input-error">{errors.estimasiHarga.message}</p>}
                </div>
              </div>

              {/* Geolocation Section */}
              <div style={{ padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Navigation size={16} color="#16a34a" />
                      Koordinat GPS Lapangan
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                      {gpsLocation
                        ? `Lat: ${gpsLocation.lat.toFixed(6)}, Lng: ${gpsLocation.lng.toFixed(6)} (Akurasi ±${gpsLocation.accuracy}m)`
                        : 'Belum ada titik koordinat GPS yang diambil'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGetGPS}
                    disabled={isGettingGps}
                    className="btn btn-secondary btn-sm"
                  >
                    <MapPin size={14} />
                    {isGettingGps ? 'Mencari GPS...' : 'Ambil Titik GPS'}
                  </button>
                </div>
              </div>

              {/* Photo Upload Section */}
              <div>
                <label className="input-label">Foto Dokumentasi Lapangan</label>
                <div
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: 12,
                    padding: '24px 16px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    cursor: 'pointer',
                  }}
                >
                  <Camera size={28} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                    Ambil Foto Kamera / Upload
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                    Format JPG, PNG (Maksimal 5MB)
                  </div>
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="input-label">Catatan Hasil Verifikasi Survey</label>
                <textarea
                  rows={3}
                  placeholder="Kondisi akses jalan, jenis irigasi, kesiapan DP/pembiayaan..."
                  className="input"
                  {...register('catatan')}
                />
              </div>
            </div>

            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary btn-lg"
                style={{ width: '100%', maxWidth: 280, justifyContent: 'center' }}
              >
                <CheckCircle2 size={18} />
                {isSubmitting ? 'Menyimpan ke Spreadsheet...' : 'Kirim Hasil Survey'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Riwayat Survey */
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Gapoktan</th>
                  <th>Alsintan</th>
                  <th>Estimasi Harga</th>
                  <th>Luas Sawah</th>
                  <th>AO</th>
                  <th>Koordinat GPS</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loadingSurvey ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="skeleton" style={{ height: 24 }} />
                    </td>
                  </tr>
                ) : surveyList.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: '#64748b' }}>
                      Belum ada survey tersimpan — isi form di tab sebelah, hasilnya masuk ke sini dan ke sheet DATA_SURVEY.
                    </td>
                  </tr>
                ) : (
                  surveyList.map((s) => {
                  const statusInfo = getStatusSurveyInfo(s.status as StatusSurvey)
                  return (
                    <tr key={s.idSurvey}>
                      <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                        {formatDateTime(s.timestamp)}
                      </td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>
                        {s.namaGapoktan}
                      </td>
                      <td>{s.jenisAlsintan || '-'}</td>
                      <td>{s.estimasiHarga ? formatRupiah(s.estimasiHarga) : '-'}</td>
                      <td>{s.luasSawah ? `${s.luasSawah} Ha` : '-'}</td>
                      <td>{s.namaAO}</td>
                      <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        {s.latitude ? `${s.latitude.toFixed(4)}, ${s.longitude?.toFixed(4)}` : '-'}
                      </td>
                      <td>
                        <span className={`badge ${statusInfo.badge}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
