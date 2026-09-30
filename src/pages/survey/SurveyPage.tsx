import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
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
  Search,
  DollarSign,
  AlertCircle,
  FileSpreadsheet,
  X,
  Filter,
  Building,
  ClipboardList,
  Pencil,
  User,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getProspek } from '@/lib/api/prospek'
import { getWilayah } from '@/lib/api/wilayah'
import { createSurvey, getSurvey, updateSurvey, getRekapPencairan } from '@/lib/api/survey'
import { useAuth } from '@/lib/auth/auth-context'
import { formatRupiah, formatNumber, formatDate, formatDateTime, getStatusSurveyInfo } from '@/lib/utils'
import type { DataSurvey, StatusSurvey } from '@/lib/types'

const surveySchema = z.object({
  idProspek: z.string().optional(),
  kecamatan: z.string().min(2, 'Pilih kecamatan terlebih dahulu'),
  namaProspek: z.string().min(3, 'Nama prospek minimal 3 karakter'),
  jenisAlsintan: z.string().min(2, 'Kebutuhan alsintan harus diisi'),
  estimasiHarga: z.number().min(0, 'Estimasi plafon tidak boleh negatif'),
  status: z.enum(['SURVEY', 'ANALISA', 'DISBURSE']),
  catatan: z.string().optional(),
})

type SurveyFormData = z.infer<typeof surveySchema>

const editSurveySchema = z.object({
  namaProspek: z.string().min(3, 'Nama prospek minimal 3 karakter'),
  jenisAlsintan: z.string().min(2, 'Kebutuhan alsintan harus diisi'),
  estimasiHarga: z.number().min(0, 'Estimasi plafon tidak boleh negatif'),
  status: z.enum(['SURVEY', 'ANALISA', 'DISBURSE']),
  catatan: z.string().optional(),
})

type EditSurveyFormData = z.infer<typeof editSurveySchema>

export default function SurveyPage() {
  const [searchParams] = useSearchParams()
  const initialProspekId = searchParams.get('prospekId') || ''

  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [isGettingGps, setIsGettingGps] = useState(false)
  const [foto, setFoto] = useState<{ base64: string; name: string; preview: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'form' | 'history' | 'rekap'>('form')

  // Search & Filter state for Riwayat Survey
  const [cariRiwayat, setCariRiwayat] = useState('')
  const [filterStatusRiwayat, setFilterStatusRiwayat] = useState<string>('ALL')
  const [filterKecamatanRiwayat, setFilterKecamatanRiwayat] = useState<string>('')

  // Search & Filter state for Rekap Pencairan
  const [cariRekap, setCariRekap] = useState('')
  const [filterKecamatanRekap, setFilterKecamatanRekap] = useState<string>('')

  // Modal States
  const [selectedSurvey, setSelectedSurvey] = useState<DataSurvey | null>(null)
  const [editingSurvey, setEditingSurvey] = useState<DataSurvey | null>(null)
  const [isUpdatingSurvey, setIsUpdatingSurvey] = useState(false)

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Format harus JPG atau PNG')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 5MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      setFoto({ base64: dataUrl.split(',')[1] ?? '', name: file.name, preview: dataUrl })
    }
    reader.readAsDataURL(file)
  }

  // Master wilayah (16 kecamatan Purworejo)
  const { data: wilayahData } = useQuery({
    queryKey: ['wilayah'],
    queryFn: () => getWilayah(),
    staleTime: 24 * 60 * 60 * 1000,
  })

  // Data Prospek untuk referensi autocomplete
  const { data: prospekData } = useQuery({
    queryKey: ['prospek'],
    queryFn: () => getProspek({ limit: 100 }),
  })

  // Lookup map Prospek untuk mencari nama kecamatan & analis berdasarkan idProspek
  const prospekMap = useMemo(() => {
    const map = new Map<string, { kecamatan: string; namaAnalis: string }>()
    ;(prospekData?.items ?? []).forEach((p) => {
      map.set(p.idProspek, {
        kecamatan: p.kecamatan || '',
        namaAnalis: p.namaAnalis || '',
      })
    })
    return map
  }, [prospekData])

  const getSurveyKecamatan = (s: DataSurvey): string => {
    if (s.idProspek && prospekMap.has(s.idProspek)) {
      return prospekMap.get(s.idProspek)!.kecamatan
    }
    return (s as unknown as { kecamatan?: string }).kecamatan || ''
  }

  // Data Survey
  const { data: surveyData, isLoading: loadingSurvey } = useQuery({
    queryKey: ['survey'],
    queryFn: () => getSurvey({ limit: 100 }),
  })
  const surveyList = surveyData?.items ?? []

  // Data Rekap Pencairan
  const { data: rekapData, isLoading: loadingRekap } = useQuery({
    queryKey: ['rekapPencairan'],
    queryFn: () => getRekapPencairan({ limit: 100 }),
  })
  const rekapList = rekapData?.items ?? []

  // Form Tambah Survey Baru
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      idProspek: '',
      kecamatan: '',
      namaProspek: '',
      jenisAlsintan: '',
      estimasiHarga: 0,
      status: 'SURVEY',
      catatan: '',
    },
  })

  const currentStatus = watch('status')
  const selectedIdProspek = watch('idProspek')

  // Form Ubah / Edit Survey
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    control: controlEdit,
    reset: resetEdit,
    watch: watchEdit,
    formState: { errors: editErrors },
  } = useForm<EditSurveyFormData>({
    resolver: zodResolver(editSurveySchema),
    defaultValues: {
      namaProspek: '',
      jenisAlsintan: '',
      estimasiHarga: 0,
      status: 'SURVEY',
      catatan: '',
    },
  })

  const currentEditStatus = watchEdit('status')

  // Auto-populate form when selecting an existing prospect
  const handleSelectExistingProspek = (id: string) => {
    setValue('idProspek', id)
    if (!id) {
      setValue('namaProspek', '')
      setValue('kecamatan', '')
      setValue('jenisAlsintan', '')
      setValue('estimasiHarga', 0)
      return
    }
    const found = (prospekData?.items ?? []).find((p) => p.idProspek === id)
    if (found) {
      setValue('namaProspek', found.namaProspek || found.namaGapoktan || '')
      setValue('kecamatan', found.kecamatan || '')
      setValue('jenisAlsintan', found.estimasiKebutuhan || '')
      setValue('estimasiHarga', found.estimasiPlafon || 0)
      toast.success(`Data prospek ${found.namaProspek || found.namaGapoktan} terisi otomatis`)
    }
  }

  // Handle URL Param ?prospekId=P001
  useEffect(() => {
    if (!initialProspekId || !prospekData?.items) return
    const found = prospekData.items.find((p) => p.idProspek === initialProspekId)
    if (found) {
      setValue('idProspek', found.idProspek)
      setValue('namaProspek', found.namaProspek || found.namaGapoktan || '')
      setValue('kecamatan', found.kecamatan || '')
      setValue('jenisAlsintan', found.estimasiKebutuhan || '')
      setValue('estimasiHarga', found.estimasiPlafon || 0)
    }
  }, [initialProspekId, prospekData, setValue])

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

  const onSubmit = async (data: SurveyFormData) => {
    const isAnalis = user?.role === 'ANALIS'
    try {
      await createSurvey({
        idProspek: data.idProspek || undefined,
        kecamatan: data.kecamatan,
        namaProspek: data.namaProspek,
        namaGapoktan: data.namaProspek,
        jenisAlsintan: data.jenisAlsintan,
        estimasiHarga: data.estimasiHarga,
        estimasiPlafon: data.estimasiHarga,
        status: data.status,
        catatan: data.catatan,
        latitude: gpsLocation?.lat,
        longitude: gpsLocation?.lng,
        accuracy: gpsLocation?.accuracy,
        ...(isAnalis ? { idAnalis: user!.id, namaAnalis: user!.nama } : {}),
        ...(foto ? { fotoBase64: foto.base64, fotoName: foto.name } : {}),
      })

      await queryClient.invalidateQueries({ queryKey: ['survey'] })
      await queryClient.invalidateQueries({ queryKey: ['prospek'] })
      await queryClient.invalidateQueries({ queryKey: ['rekapPencairan'] })

      if (data.status === 'DISBURSE') {
        toast.success(`Survey ${data.namaProspek} tersimpan & masuk ke REKAP PENCAIRAN!`, {
          duration: 5000,
          icon: '💰',
        })
      } else {
        toast.success(`Data survey untuk ${data.namaProspek} berhasil disimpan!`)
      }

      reset()
      setGpsLocation(null)
      setFoto(null)
      setActiveTab(data.status === 'DISBURSE' ? 'rekap' : 'history')
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Gagal menyimpan data survey')
    }
  }

  // Handle Open Edit Survey Modal
  const handleOpenEdit = (survey: DataSurvey) => {
    const statusVal: 'SURVEY' | 'ANALISA' | 'DISBURSE' =
      survey.status === 'DISBURSE'
        ? 'DISBURSE'
        : survey.status === 'ANALISA'
          ? 'ANALISA'
          : 'SURVEY'

    resetEdit({
      namaProspek: survey.namaProspek || survey.namaGapoktan || '',
      jenisAlsintan: survey.jenisAlsintan || '',
      estimasiHarga: survey.estimasiHarga || survey.estimasiPlafon || 0,
      status: statusVal,
      catatan: survey.catatan || '',
    })
    setSelectedSurvey(null)
    setEditingSurvey(survey)
  }

  // Handle Save Edit Survey
  const onSubmitEdit = async (data: EditSurveyFormData) => {
    if (!editingSurvey) return
    setIsUpdatingSurvey(true)
    try {
      await updateSurvey({
        idSurvey: editingSurvey.idSurvey,
        namaProspek: data.namaProspek,
        namaGapoktan: data.namaProspek,
        jenisAlsintan: data.jenisAlsintan,
        estimasiHarga: data.estimasiHarga,
        status: data.status,
        catatan: data.catatan,
      })
      await queryClient.invalidateQueries({ queryKey: ['survey'] })
      await queryClient.invalidateQueries({ queryKey: ['prospek'] })
      await queryClient.invalidateQueries({ queryKey: ['rekapPencairan'] })

      if (data.status === 'DISBURSE') {
        toast.success(`Status ${data.namaProspek} diubah ke DISBURSE & dicatat ke Rekap Pencairan!`, {
          icon: '🎉',
        })
      } else {
        toast.success(`Data survey ${data.namaProspek} berhasil diperbarui`)
      }
      setEditingSurvey(null)
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Gagal memperbarui survey')
    } finally {
      setIsUpdatingSurvey(false)
    }
  }

  // Filtered lists
  const filteredSurveyList = useMemo(() => {
    const q = cariRiwayat.toLowerCase().trim()
    return surveyList.filter((s) => {
      const nama = (s.namaProspek || s.namaGapoktan || '').toLowerCase()
      const alsintan = (s.jenisAlsintan || '').toLowerCase()
      const analis = (s.namaAnalis || '').toLowerCase()
      const kec = getSurveyKecamatan(s).toLowerCase()

      const matchSearch =
        !q ||
        nama.includes(q) ||
        alsintan.includes(q) ||
        analis.includes(q) ||
        kec.includes(q)

      const matchStatus = filterStatusRiwayat === 'ALL' || s.status === filterStatusRiwayat
      const matchKecamatan =
        !filterKecamatanRiwayat || kec === filterKecamatanRiwayat.toLowerCase()

      return matchSearch && matchStatus && matchKecamatan
    })
  }, [surveyList, cariRiwayat, filterStatusRiwayat, filterKecamatanRiwayat, prospekMap])

  const filteredRekapList = useMemo(() => {
    const q = cariRekap.toLowerCase().trim()
    return rekapList.filter((r) => {
      const nama = (r.namaProspek || '').toLowerCase()
      const alsintan = (r.jenisAlsintan || '').toLowerCase()
      const analis = (r.namaAnalis || '').toLowerCase()
      const kec = (r.kecamatan || '').toLowerCase()

      const matchSearch =
        !q ||
        nama.includes(q) ||
        alsintan.includes(q) ||
        analis.includes(q) ||
        kec.includes(q)

      const matchKecamatan =
        !filterKecamatanRekap || kec === filterKecamatanRekap.toLowerCase()

      return matchSearch && matchKecamatan
    })
  }, [rekapList, cariRekap, filterKecamatanRekap])

  const totalPlafonCair = useMemo(() => {
    return rekapList.reduce((acc, curr) => acc + (curr.plafonPencairan || 0), 0)
  }, [rekapList])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Dev / System Banner */}
      <div className="dev-banner">
        <Sparkles size={16} />
        <div>
          <strong>Survey & Pencairan Alsintan:</strong> Verifikasi perorangan, koordinat GPS, foto lapangan, dan pencatatan otomatis ke <strong>REKAP PENCAIRAN</strong> saat status diset ke <strong>DISBURSE</strong>.
        </div>
      </div>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Survey Lapangan & Pencairan</h1>
            <p className="page-subtitle">
              Pencatatan data survey debitur alsintan (perorangan), verifikasi GPS/foto, dan otomatisasi rekap disburse.
            </p>
          </div>
          <a
            href="https://forms.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            <ExternalLink size={14} />
            Buka Form Eksternal
          </a>
        </div>
      </div>

      {/* Tab Switcher */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          gap: 8,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
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
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <ClipboardList size={15} />
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
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <CheckCircle2 size={15} />
          Riwayat Survey ({surveyList.length})
        </button>
        <button
          onClick={() => setActiveTab('rekap')}
          style={{
            padding: '10px 16px',
            fontWeight: 600,
            fontSize: '0.875rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'rekap' ? '2px solid #16a34a' : '2px solid transparent',
            color: activeTab === 'rekap' ? '#16a34a' : '#64748b',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <FileSpreadsheet size={15} />
          Rekap Pencairan ({rekapList.length})
        </button>
      </div>

      {/* TAB 1: FORM SURVEY */}
      {activeTab === 'form' && (
        <div className="card" style={{ maxWidth: 900, width: '100%', margin: '0 auto' }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Optional Quick Link with Existing Prospect */}
              <div style={{ padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                <label className="input-label" style={{ marginBottom: 6 }}>
                  Pilih dari Daftar Prospek (Opsional)
                </label>
                <select
                  className="input"
                  value={selectedIdProspek || ''}
                  onChange={(e) => handleSelectExistingProspek(e.target.value)}
                >
                  <option value="">-- Input Prospek Baru (Manual) --</option>
                  {(prospekData?.items ?? []).map((p) => (
                    <option key={p.idProspek} value={p.idProspek}>
                      {p.namaProspek || p.namaGapoktan} (Kec. {p.kecamatan}) — {p.estimasiKebutuhan || 'Alsintan'} [Status: {p.status}]
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                  Pilih prospek yang sudah terdaftar untuk mengisi data otomatis, atau isi manual formulir di bawah.
                </p>
              </div>

              {/* Grid 2 Cols: Kecamatan & Nama Prospek */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                <div>
                  <label className="input-label">
                    Kecamatan <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    className={`input ${errors.kecamatan ? 'error' : ''}`}
                    {...register('kecamatan')}
                  >
                    <option value="">-- Pilih Kecamatan --</option>
                    {(wilayahData ?? []).map((w) => (
                      <option key={w.idKecamatan} value={w.kecamatan}>
                        {w.kecamatan}
                      </option>
                    ))}
                  </select>
                  {errors.kecamatan && <p className="input-error">{errors.kecamatan.message}</p>}
                </div>

                <div>
                  <label className="input-label">
                    Nama Prospek (Perorangan) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Bpk. Slamet Widodo"
                    className={`input ${errors.namaProspek ? 'error' : ''}`}
                    {...register('namaProspek')}
                  />
                  {errors.namaProspek && <p className="input-error">{errors.namaProspek.message}</p>}
                </div>
              </div>

              {/* Grid 2 Cols: Kebutuhan Alat & Estimasi Plafon */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                <div>
                  <label className="input-label">
                    Kebutuhan Alat / Alsintan <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Combine Harvester Maxxi Bromo"
                    className={`input ${errors.jenisAlsintan ? 'error' : ''}`}
                    {...register('jenisAlsintan')}
                  />
                  {errors.jenisAlsintan && <p className="input-error">{errors.jenisAlsintan.message}</p>}
                </div>

                <div>
                  <label className="input-label">
                    Estimasi Plafon (Rp) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <Controller
                    name="estimasiHarga"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Contoh: 450.000.000"
                        className={`input ${errors.estimasiHarga ? 'error' : ''}`}
                        value={field.value ? formatNumber(field.value) : ''}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '')
                          field.onChange(digits ? Number(digits) : 0)
                        }}
                      />
                    )}
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
                      Titik Lokasi GPS Lapangan
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                      {gpsLocation ? (
                        <span>
                          Lat: <strong>{gpsLocation.lat.toFixed(6)}</strong>, Lng: <strong>{gpsLocation.lng.toFixed(6)}</strong> (Akurasi ±{gpsLocation.accuracy}m){' '}
                          <a
                            href={`https://www.google.com/maps?q=${gpsLocation.lat},${gpsLocation.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#16a34a', textDecoration: 'underline', marginLeft: 4 }}
                          >
                            Buka di Google Maps
                          </a>
                        </span>
                      ) : (
                        'Belum ada titik koordinat GPS yang diambil'
                      )}
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
                {foto ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 10,
                    border: '1px solid #bbf7d0',
                    borderRadius: 12,
                    background: '#f0fdf4',
                  }}>
                    <img src={foto.preview} alt="Foto survey" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#15803d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {foto.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Tersimpan ke Google Drive saat formulir dikirim
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => setFoto(null)}
                      title="Hapus foto"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label
                    style={{
                      display: 'block',
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
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      capture="environment"
                      style={{ display: 'none' }}
                      onChange={handleFotoChange}
                    />
                  </label>
                )}
              </div>

              {/* Catatan Lapangan */}
              <div>
                <label className="input-label">Catatan Lapangan</label>
                <textarea
                  rows={3}
                  placeholder="Catatan kondisi lapangan, kesiapan garasi/gudang alsintan, kesiapan uang muka/DP..."
                  className="input"
                  {...register('catatan')}
                />
              </div>

              {/* Progres Status Selection */}
              <div>
                <label className="input-label" style={{ marginBottom: 8 }}>
                  Status Progres <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: currentStatus === 'SURVEY' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: currentStatus === 'SURVEY' ? '#eff6ff' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      value="SURVEY"
                      {...register('status')}
                      style={{ accentColor: '#2563eb' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e3a8a' }}>SURVEY</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Pencatatan lapangan</div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: currentStatus === 'ANALISA' ? '2px solid #9333ea' : '1px solid #cbd5e1',
                      background: currentStatus === 'ANALISA' ? '#faf5ff' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      value="ANALISA"
                      {...register('status')}
                      style={{ accentColor: '#9333ea' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#581c87' }}>ANALISA</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Analisa kelayakan</div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: currentStatus === 'DISBURSE' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                      background: currentStatus === 'DISBURSE' ? '#f0fdf4' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      value="DISBURSE"
                      {...register('status')}
                      style={{ accentColor: '#16a34a' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#15803d' }}>DISBURSE</div>
                      <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>Disetujui & Cairkan</div>
                    </div>
                  </label>
                </div>

                {/* Notice banner when DISBURSE is chosen */}
                {currentStatus === 'DISBURSE' && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      background: '#f0fdf4',
                      border: '1px solid #86efac',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      color: '#166534',
                    }}
                  >
                    <DollarSign size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: '0.8125rem' }}>
                      <strong>Pencairan Otomatis:</strong> Memilih status <strong>DISBURSE</strong> akan langsung mencatat pembiayaan ini ke lembar <strong>REKAP PENCAIRAN ALSINTAN</strong> dan mengubah status prospek terkait menjadi Disburse.
                    </div>
                  </div>
                )}
              </div>

            </div>

            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary btn-lg"
                style={{
                  width: '100%',
                  maxWidth: 340,
                  justifyContent: 'center',
                  background: currentStatus === 'DISBURSE' ? '#15803d' : undefined,
                }}
              >
                <CheckCircle2 size={18} />
                {isSubmitting
                  ? 'Menyimpan ke Spreadsheet...'
                  : currentStatus === 'DISBURSE'
                    ? 'Simpan & Catat Pencairan'
                    : 'Simpan Hasil Survey'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: RIWAYAT SURVEY */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Responsive Filter Toolbar */}
          <div className="card" style={{ padding: 14 }}>
            <div className="filter-bar-responsive" style={{ justifyContent: 'space-between' }}>
              {/* Search Input */}
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Cari prospek, alat, atau analis..."
                  className="input"
                  style={{ paddingLeft: 36 }}
                  value={cariRiwayat}
                  onChange={(e) => setCariRiwayat(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 auto' }}>
                <Filter size={16} color="#64748b" style={{ flexShrink: 0 }} />
                <select
                  className="input"
                  style={{ width: '100%', minWidth: 140 }}
                  value={filterStatusRiwayat}
                  onChange={(e) => setFilterStatusRiwayat(e.target.value)}
                >
                  <option value="ALL">Semua Progres</option>
                  <option value="SURVEY">SURVEY</option>
                  <option value="ANALISA">ANALISA</option>
                  <option value="DISBURSE">DISBURSE</option>
                </select>
              </div>

              {/* Kecamatan Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 auto' }}>
                <Building size={16} color="#64748b" style={{ flexShrink: 0 }} />
                <select
                  className="input"
                  style={{ width: '100%', minWidth: 140 }}
                  value={filterKecamatanRiwayat}
                  onChange={(e) => setFilterKecamatanRiwayat(e.target.value)}
                >
                  <option value="">Semua Kecamatan</option>
                  {(wilayahData ?? []).map((w) => (
                    <option key={w.idKecamatan} value={w.kecamatan}>{w.kecamatan}</option>
                  ))}
                </select>
              </div>

              <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600, paddingLeft: 4 }}>
                Total: <span style={{ color: '#16a34a' }}>{filteredSurveyList.length} Survey</span>
              </div>
            </div>
          </div>

          {/* Survey List Table */}
          <div className="card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Nama Prospek</th>
                    <th>Kecamatan</th>
                    <th>Kebutuhan Alat</th>
                    <th>Estimasi Plafon</th>
                    <th>Analis</th>
                    <th>Koordinat GPS</th>
                    <th>Foto</th>
                    <th>Catatan</th>
                    <th>Progres</th>
                    <th style={{ textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingSurvey ? (
                    <tr>
                      <td colSpan={11}>
                        <div className="skeleton" style={{ height: 32 }} />
                      </td>
                    </tr>
                  ) : filteredSurveyList.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', color: '#64748b', padding: 28 }}>
                        {cariRiwayat || filterStatusRiwayat !== 'ALL' || filterKecamatanRiwayat
                          ? 'Tidak ditemukan survey yang cocok dengan filter.'
                          : 'Belum ada survey tersimpan. Isi formulir di tab sebelah untuk menambahkan survey baru.'}
                      </td>
                    </tr>
                  ) : (
                    filteredSurveyList.map((s) => {
                      const statusInfo = getStatusSurveyInfo(s.status as StatusSurvey)
                      const kec = getSurveyKecamatan(s)
                      return (
                        <tr key={s.idSurvey}>
                          <td data-label="Waktu" style={{ fontSize: '0.8125rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                            {formatDateTime(s.timestamp)}
                          </td>
                          <td data-label="Nama Prospek" style={{ fontWeight: 700, color: '#0f172a' }}>
                            {s.namaProspek || s.namaGapoktan}
                          </td>
                          <td data-label="Kecamatan">
                            {kec ? `Kec. ${kec}` : '-'}
                          </td>
                          <td data-label="Kebutuhan Alat">{s.jenisAlsintan || '-'}</td>
                          <td data-label="Estimasi Plafon" style={{ fontWeight: 600, color: '#16a34a' }}>
                            {s.estimasiHarga ? formatRupiah(s.estimasiHarga) : '-'}
                          </td>
                          <td data-label="Analis" style={{ fontSize: '0.8125rem' }}>{s.namaAnalis || '-'}</td>
                          <td data-label="Koordinat GPS">
                            {s.latitude ? (
                              <a
                                href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#16a34a', textDecoration: 'underline', fontSize: '0.75rem', fontFamily: 'monospace' }}
                              >
                                {s.latitude.toFixed(4)}, {s.longitude?.toFixed(4)}
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td data-label="Foto">
                            {s.fotoUrl ? (
                              <a
                                href={s.fotoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="badge"
                                style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}
                              >
                                Lihat Foto
                              </a>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>-</span>
                            )}
                          </td>
                          <td data-label="Catatan" style={{ fontSize: '0.8125rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.catatan || '-'}
                          </td>
                          <td data-label="Progres">
                            <span className={`badge ${statusInfo.badge}`}>
                              {statusInfo.label}
                            </span>
                          </td>
                          <td data-label="Aksi" style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                onClick={() => setSelectedSurvey(s)}
                                className="btn btn-secondary btn-sm"
                              >
                                Detail
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(s)}
                                className="btn btn-secondary btn-sm"
                                title="Ubah data survey"
                              >
                                <Pencil size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REKAP PENCAIRAN ALSINTAN */}
      {activeTab === 'rekap' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div className="card" style={{ padding: 18, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '0.8125rem', color: '#15803d', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} /> Total Alsintan Disburse
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#166534', marginTop: 4 }}>
                {rekapList.length} <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Unit</span>
              </div>
            </div>

            <div className="card" style={{ padding: 18, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: '0.8125rem', color: '#1d4ed8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <DollarSign size={16} /> Total Nilai Pencairan
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e40af', marginTop: 4 }}>
                {formatRupiah(totalPlafonCair)}
              </div>
            </div>
          </div>

          {/* Filter Bar Rekap */}
          <div className="card" style={{ padding: 14 }}>
            <div className="filter-bar-responsive" style={{ justifyContent: 'space-between' }}>
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="input"
                  style={{ paddingLeft: 36 }}
                  placeholder="Cari penerima, alsintan, analis..."
                  value={cariRekap}
                  onChange={(e) => setCariRekap(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 auto' }}>
                <Building size={16} color="#64748b" style={{ flexShrink: 0 }} />
                <select
                  className="input"
                  style={{ width: '100%', minWidth: 140 }}
                  value={filterKecamatanRekap}
                  onChange={(e) => setFilterKecamatanRekap(e.target.value)}
                >
                  <option value="">Semua Kecamatan</option>
                  {(wilayahData ?? []).map((w) => (
                    <option key={w.idKecamatan} value={w.kecamatan}>{w.kecamatan}</option>
                  ))}
                </select>
              </div>

              <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600, paddingLeft: 4 }}>
                Total: <span style={{ color: '#16a34a' }}>{filteredRekapList.length} Pencairan</span>
              </div>
            </div>
          </div>

          {/* Rekap Pencairan Table */}
          <div className="card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID Cair</th>
                    <th>Tanggal</th>
                    <th>Nama Prospek</th>
                    <th>Kecamatan</th>
                    <th>Jenis Alsintan</th>
                    <th>Plafon Pencairan</th>
                    <th>Analis</th>
                    <th>Catatan</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRekap ? (
                    <tr>
                      <td colSpan={9}>
                        <div className="skeleton" style={{ height: 32 }} />
                      </td>
                    </tr>
                  ) : filteredRekapList.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', color: '#64748b', padding: 28 }}>
                        {cariRekap || filterKecamatanRekap
                          ? 'Tidak ditemukan data pencairan yang sesuai filter.'
                          : 'Belum ada data pencairan. Ubah status survey ke DISBURSE untuk mencatat ke rekap ini.'}
                      </td>
                    </tr>
                  ) : (
                    filteredRekapList.map((r) => (
                      <tr key={r.idPencairan}>
                        <td data-label="ID Cair" style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8125rem' }}>
                          {r.idPencairan}
                        </td>
                        <td data-label="Tanggal" style={{ fontSize: '0.8125rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {formatDate(r.tanggalPencairan)}
                        </td>
                        <td data-label="Nama Prospek" style={{ fontWeight: 700, color: '#0f172a' }}>
                          {r.namaProspek}
                        </td>
                        <td data-label="Kecamatan">{r.kecamatan || '-'}</td>
                        <td data-label="Jenis Alsintan">
                          <span className="badge" style={{ background: '#f8fafc', color: '#334155', borderColor: '#e2e8f0' }}>
                            {r.jenisAlsintan}
                          </span>
                        </td>
                        <td data-label="Plafon Pencairan" style={{ fontWeight: 700, color: '#15803d' }}>
                          {formatRupiah(r.plafonPencairan)}
                        </td>
                        <td data-label="Analis" style={{ fontSize: '0.8125rem' }}>{r.namaAnalis || '-'}</td>
                        <td data-label="Catatan" style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                          {r.catatan || '-'}
                        </td>
                        <td data-label="Status">
                          <span className="badge bg-emerald-100 text-emerald-700 border-emerald-200">
                            CAIR / DISBURSED
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL SURVEY */}
      {selectedSurvey && (
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
          onClick={() => setSelectedSurvey(null)}
        >
          <div
            className="card animate-slide-up"
            style={{ width: '100%', maxWidth: 500 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                  {selectedSurvey.idSurvey}
                </span>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                  {selectedSurvey.namaProspek || selectedSurvey.namaGapoktan}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSurvey(null)}
                className="btn btn-ghost btn-icon btn-sm"
              >
                ✕
              </button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Status Progres</span>
                <span className={`badge ${getStatusSurveyInfo(selectedSurvey.status).badge}`}>
                  {getStatusSurveyInfo(selectedSurvey.status).label}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Waktu Survey</span>
                <span style={{ fontSize: '0.875rem', color: '#0f172a' }}>{formatDateTime(selectedSurvey.timestamp)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Wilayah Kecamatan</span>
                <strong style={{ color: '#0f172a' }}>Kec. {getSurveyKecamatan(selectedSurvey) || '-'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Kebutuhan Alsintan</span>
                <strong>{selectedSurvey.jenisAlsintan || '-'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Estimasi Plafon</span>
                <strong style={{ color: '#16a34a' }}>
                  {selectedSurvey.estimasiHarga ? formatRupiah(selectedSurvey.estimasiHarga) : '-'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Analis Petugas</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={14} color="#64748b" />
                  <strong>{selectedSurvey.namaAnalis || '-'}</strong>
                </div>
              </div>

              {/* Titik Koordinat GPS */}
              <div style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Koordinat GPS</span>
                {selectedSurvey.latitude && selectedSurvey.longitude ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                      {selectedSurvey.latitude.toFixed(6)}, {selectedSurvey.longitude.toFixed(6)}
                      {selectedSurvey.accuracy ? ` (±${selectedSurvey.accuracy}m)` : ''}
                    </span>
                    <a
                      href={`https://www.google.com/maps?q=${selectedSurvey.latitude},${selectedSurvey.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                    >
                      <Navigation size={13} />
                      Buka Peta
                    </a>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Tidak ada titik koordinat GPS</span>
                )}
              </div>

              {/* Foto Lapangan */}
              {selectedSurvey.fotoUrl && (
                <div style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.8125rem', color: '#64748b', display: 'block', marginBottom: 6 }}>Foto Lapangan</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <a
                      href={selectedSurvey.fotoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                    >
                      <ExternalLink size={13} />
                      Buka Foto di Drive
                    </a>
                  </div>
                </div>
              )}

              {/* Catatan Lapangan */}
              {selectedSurvey.catatan && (
                <div style={{ padding: 10, background: '#f8fafc', borderRadius: 8, fontSize: '0.8125rem', color: '#475569' }}>
                  <strong>Catatan Verifikasi:</strong> {selectedSurvey.catatan}
                </div>
              )}
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => setSelectedSurvey(null)} className="btn btn-secondary btn-sm">
                Tutup
              </button>
              <button
                onClick={() => handleOpenEdit(selectedSurvey)}
                className="btn btn-primary btn-sm"
              >
                <Pencil size={14} />
                Ubah Data Survey
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL UBAH / EDIT DATA SURVEY */}
      {editingSurvey && (
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
          onClick={() => setEditingSurvey(null)}
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
                    Ubah Data Survey
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                    {editingSurvey.idSurvey} {getSurveyKecamatan(editingSurvey) ? `· Kec. ${getSurveyKecamatan(editingSurvey)}` : ''}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setEditingSurvey(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEdit(onSubmitEdit)}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                
                {/* Nama Prospek */}
                <div>
                  <label className="input-label">
                    Nama Prospek (Perorangan) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className={`input ${editErrors.namaProspek ? 'error' : ''}`}
                    {...registerEdit('namaProspek')}
                  />
                  {editErrors.namaProspek && <p className="input-error">{editErrors.namaProspek.message}</p>}
                </div>

                {/* Jenis Alsintan */}
                <div>
                  <label className="input-label">
                    Kebutuhan Alat / Alsintan <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className={`input ${editErrors.jenisAlsintan ? 'error' : ''}`}
                    {...registerEdit('jenisAlsintan')}
                  />
                  {editErrors.jenisAlsintan && <p className="input-error">{editErrors.jenisAlsintan.message}</p>}
                </div>

                {/* Estimasi Plafon / Harga */}
                <div>
                  <label className="input-label">
                    Estimasi Plafon (Rp) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <Controller
                    name="estimasiHarga"
                    control={controlEdit}
                    render={({ field }) => (
                      <input
                        type="text"
                        inputMode="numeric"
                        className={`input ${editErrors.estimasiHarga ? 'error' : ''}`}
                        value={field.value ? formatNumber(field.value) : ''}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '')
                          field.onChange(digits ? Number(digits) : 0)
                        }}
                      />
                    )}
                  />
                  {editErrors.estimasiHarga && <p className="input-error">{editErrors.estimasiHarga.message}</p>}
                </div>

                {/* Progres Status */}
                <div>
                  <label className="input-label">
                    Status Progres <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    className="input"
                    {...registerEdit('status')}
                  >
                    <option value="SURVEY">SURVEY — Survey Lapangan</option>
                    <option value="ANALISA">ANALISA — Analisa Kelayakan</option>
                    <option value="DISBURSE">DISBURSE — Disetujui & Cairkan</option>
                  </select>
                </div>

                {currentEditStatus === 'DISBURSE' && (
                  <div
                    style={{
                      padding: 12,
                      background: '#f0fdf4',
                      border: '1px solid #86efac',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      color: '#166534',
                    }}
                  >
                    <AlertCircle size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: '0.8125rem' }}>
                      Status <strong>DISBURSE</strong> akan langsung mencatat pembiayaan ini ke lembar <strong>REKAP PENCAIRAN</strong> dan memperbarui status prospek menjadi Disburse.
                    </div>
                  </div>
                )}

                {/* Catatan Lapangan */}
                <div>
                  <label className="input-label">Catatan Hasil Verifikasi</label>
                  <textarea
                    rows={2}
                    className="input"
                    placeholder="Catatan kondisi lapangan, verifikasi berkas..."
                    {...registerEdit('catatan')}
                  />
                </div>
              </div>

              <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setEditingSurvey(null)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isUpdatingSurvey}
                  style={{
                    background: currentEditStatus === 'DISBURSE' ? '#15803d' : undefined,
                  }}
                >
                  {isUpdatingSurvey ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
