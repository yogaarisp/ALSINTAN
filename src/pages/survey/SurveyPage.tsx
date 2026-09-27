import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Controller, useForm, useWatch } from 'react-hook-form'
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
  Users,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getProspek } from '@/lib/api/prospek'
import { getPoktan } from '@/lib/api/poktan'
import { getWilayah } from '@/lib/api/wilayah'
import { createSurvey, getSurvey } from '@/lib/api/survey'
import { useAuth } from '@/lib/auth/auth-context'
import { formatRupiah, formatNumber, formatDateTime, getStatusSurveyInfo } from '@/lib/utils'
import type { MasterPoktan, StatusSurvey } from '@/lib/types'

const surveySchema = z.object({
  kecamatan: z.string().min(2, 'Pilih kecamatan terlebih dahulu'),
  idProspek: z.string().min(1, 'Pilih kelompok tani (gapoktan)'),
  namaGapoktan: z.string().min(3, 'Nama Gapoktan harus diisi'),
  jumlahAnggota: z.number().min(1, 'Jumlah anggota minimal 1'),
  luasSawah: z.number().min(0.1, 'Luas lahan minimal 0.1 Ha'),
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
  const [foto, setFoto] = useState<{ base64: string; name: string; preview: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form')
  // Master Poktan 2026: pilih kecamatan dulu, lalu kelompok tani di dalamnya
  const [kecamatan, setKecamatan] = useState('')
  const [cariPoktan, setCariPoktan] = useState('')
  const [dipilih, setDipilih] = useState<MasterPoktan | null>(null)

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

  const { data: prospekData } = useQuery({
    queryKey: ['prospek'],
    queryFn: () => getProspek({ limit: 100 }),
  })

  // Master wilayah — sumber daftar kecamatan (16 kecamatan Purworejo)
  const { data: wilayahData } = useQuery({
    queryKey: ['wilayah'],
    queryFn: () => getWilayah(),
    staleTime: 24 * 60 * 60 * 1000,
  })

  // Kelompok tani per kecamatan — diambil saat kecamatan dipilih (maks. ±311 baris)
  const { data: poktanData, isLoading: loadingPoktan } = useQuery({
    queryKey: ['poktan', kecamatan],
    queryFn: () => getPoktan({ kecamatan, limit: 1000 }),
    enabled: kecamatan !== '',
    staleTime: 60 * 60 * 1000,
  })

  const { data: surveyData, isLoading: loadingSurvey } = useQuery({
    queryKey: ['survey'],
    queryFn: () => getSurvey({ limit: 100 }),
  })
  const surveyList = surveyData?.items ?? []

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      kecamatan: '',
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

  const idProspekTerpilih = useWatch({ control, name: 'idProspek' })

  // Master Poktan 2026 yang cocok dengan pencarian di dalam kecamatan terpilih
  const poktanTerfilter = useMemo(() => {
    const list = poktanData?.items ?? []
    const q = cariPoktan.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (p) =>
        p.namaPoktan.toLowerCase().includes(q) ||
        p.desa.toLowerCase().includes(q) ||
        p.ketua.toLowerCase().includes(q) ||
        p.idPoktan.includes(q),
    )
  }, [poktanData, cariPoktan])

  // Detail kelompok tani terpilih (kartu info di bawah dropdown)
  useEffect(() => {
    const found = (poktanData?.items ?? []).find((p) => p.idPoktan === idProspekTerpilih)
    setDipilih(found ?? null)
  }, [idProspekTerpilih, poktanData])

  // Deep-link dari halaman Prospek/Analis (?prospekId=P001) — isi kecamatan
  // dari prospek tersebut supaya langsung bisa dipilih gapoktannya.
  useEffect(() => {
    if (kecamatan) return
    const asal = prospekData?.items.find((p) => p.idProspek === initialProspekId)
    if (asal?.kecamatan) {
      setKecamatan(asal.kecamatan)
      setValue('kecamatan', asal.kecamatan)
    }
  }, [kecamatan, initialProspekId, prospekData, setValue])

  const handleSelectKecamatan = (nama: string) => {
    setKecamatan(nama)
    setValue('kecamatan', nama, { shouldValidate: true })
    // Ganti kecamatan = pilihan kelompok tani tidak berlaku lagi
    setCariPoktan('')
    if (idProspekTerpilih) {
      setValue('idProspek', '', { shouldValidate: true })
      setValue('namaGapoktan', '', { shouldValidate: true })
      setValue('jumlahAnggota', 30)
    }
  }

  const handleSelectPoktan = (id: string) => {
    setValue('idProspek', id, { shouldValidate: true })
    const selected = (poktanData?.items ?? []).find((p) => p.idPoktan === id)
    if (selected) {
      setValue('namaGapoktan', selected.namaPoktan, { shouldValidate: true })
      // Sebagian poktan di master memang tercatat 0 anggota — isi manual
      if (selected.jumlahAnggota > 0) {
        setValue('jumlahAnggota', selected.jumlahAnggota, { shouldValidate: true })
      }
    }
  }

  const onSubmit = async (data: SurveyFormData) => {
    // Login sebagai Analis → pakai identitas Analis; selain itu biarkan backend memakai Analis milik prospek
    const isAnalis = user?.role === 'ANALIS'
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
      ...(isAnalis ? { idAnalis: user!.id, namaAnalis: user!.nama } : {}),
      ...(foto ? { fotoBase64: foto.base64, fotoName: foto.name } : {}),
    })
    await queryClient.invalidateQueries({ queryKey: ['survey'] })
    // Survey pertama untuk sebuah poktan juga mendaftarkannya ke DATA_PROSPEK
    await queryClient.invalidateQueries({ queryKey: ['prospek'] })
    toast.success(`Data survey untuk ${data.namaGapoktan} tersimpan ke Spreadsheet!`)
    reset()
    // reset() mengembalikan defaultValues (bisa berisi ?prospekId) — kosongkan
    // juga kolom referensi karena dropdown di bawah sudah dikosongkan
    setValue('kecamatan', '')
    setValue('idProspek', '')
    setValue('namaGapoktan', '')
    setGpsLocation(null)
    setFoto(null)
    setKecamatan('')
    setCariPoktan('')
    setDipilih(null)
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
              Pencatatan data aktual kondisi lapangan, verifikasi luas lahan, dan kebutuhan alsintan Gapoktan
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
              {/* Reference Gapoktan — Master Poktan 2026 per kecamatan */}
              <div style={{ padding: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <Users size={15} color="#16a34a" />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#15803d' }}>
                    Data Kelompok Tani — Master Poktan 2026
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <div>
                    <label className="input-label">1. Kecamatan</label>
                    <select
                      className={`input ${errors.kecamatan ? 'error' : ''}`}
                      value={kecamatan}
                      onChange={(e) => handleSelectKecamatan(e.target.value)}
                    >
                      <option value="">-- Pilih Kecamatan --</option>
                      {(wilayahData ?? []).map((w) => (
                        <option key={w.idKecamatan} value={w.kecamatan}>
                          {w.kecamatan} ({w.jumlahGapoktan} poktan)
                        </option>
                      ))}
                    </select>
                    {errors.kecamatan && <p className="input-error">{errors.kecamatan.message}</p>}
                  </div>

                  <div>
                    <label className="input-label">2. Kelompok Tani / Gapoktan</label>
                    {!kecamatan ? (
                      <div className="input" style={{ color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                        Pilih kecamatan lebih dulu
                      </div>
                    ) : (
                      <>
                        <div style={{ position: 'relative', marginBottom: 6 }}>
                          <Search
                            size={14}
                            color="#94a3b8"
                            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
                          />
                          <input
                            type="text"
                            className="input"
                            style={{ paddingLeft: 30 }}
                            placeholder="Cari nama poktan / desa / ketua..."
                            value={cariPoktan}
                            onChange={(e) => setCariPoktan(e.target.value)}
                          />
                        </div>
                        <select
                          className={`input ${errors.idProspek ? 'error' : ''}`}
                          {...register('idProspek')}
                          onChange={(e) => handleSelectPoktan(e.target.value)}
                        >
                          <option value="">
                            {loadingPoktan ? '-- Memuat kelompok tani...' : '-- Pilih Kelompok Tani --'}
                          </option>
                          {initialProspekId && !poktanData?.items.some((p) => p.idPoktan === initialProspekId) && (
                            <option value={initialProspekId}>
                              {prospekData?.items.find((p) => p.idProspek === initialProspekId)?.namaGapoktan ?? initialProspekId}{' '}
                              (dari daftar prospek — belum ada di Master Poktan 2026)
                            </option>
                          )}
                          {poktanTerfilter.map((p) => (
                            <option key={p.idPoktan} value={p.idPoktan}>
                              {p.namaPoktan} — Desa {p.desa} ({p.jumlahAnggota} anggota)
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                    {errors.idProspek && <p className="input-error">{errors.idProspek.message}</p>}
                    {kecamatan && !loadingPoktan && poktanTerfilter.length === 0 && (
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                        {cariPoktan
                          ? 'Tidak ada kelompok tani yang cocok dengan pencarian.'
                          : 'Belum ada kelompok tani tercatat di kecamatan ini pada master 2026.'}
                      </p>
                    )}
                  </div>
                </div>

                {dipilih && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 10,
                      background: '#fff',
                      border: '1px solid #dcfce7',
                      borderRadius: 10,
                      fontSize: '0.8125rem',
                      color: '#334155',
                    }}
                  >
                    <strong style={{ color: '#0f172a' }}>{dipilih.namaPoktan}</strong> · ID Poktan {dipilih.idPoktan}
                    <div style={{ marginTop: 2 }}>
                      Desa {dipilih.desa || '-'} · Ketua {dipilih.ketua || '-'} · {formatNumber(dipilih.jumlahAnggota)} anggota
                    </div>
                    {dipilih.alamat && (
                      <div style={{ marginTop: 2, fontSize: '0.75rem', color: '#64748b' }}>{dipilih.alamat}</div>
                    )}
                  </div>
                )}
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
                  <label className="input-label">Luas Lahan (Ha)</label>
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
                  <Controller
                    name="estimasiHarga"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Contoh: 500.000.000"
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

              {/* Photo Upload Section — foto disimpan ke Google Drive (NC5) */}
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
                        Ikut tersimpan ke Drive saat survey dikirim
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => setFoto(null)}
                      title="Hapus foto"
                    >
                      ✕
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
                style={{ width: '100%', maxWidth: 320, justifyContent: 'center' }}
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
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Gapoktan</th>
                  <th>Alsintan</th>
                  <th>Estimasi Harga</th>
                  <th>Luas Lahan</th>
                  <th>Analis</th>
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
                      <td data-label="Waktu" style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                        {formatDateTime(s.timestamp)}
                      </td>
                      <td data-label="Gapoktan" style={{ fontWeight: 700, color: '#0f172a' }}>
                        {s.namaGapoktan}
                      </td>
                      <td data-label="Alsintan">{s.jenisAlsintan || '-'}</td>
                      <td data-label="Estimasi Harga">{s.estimasiHarga ? formatRupiah(s.estimasiHarga) : '-'}</td>
                      <td data-label="Luas Sawah">{s.luasSawah ? `${s.luasSawah} Ha` : '-'}</td>
                      <td data-label="Analis">{s.namaAnalis}</td>
                      <td data-label="Koordinat GPS" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        {s.latitude ? `${s.latitude.toFixed(4)}, ${s.longitude?.toFixed(4)}` : '-'}
                      </td>
                      <td data-label="Status">
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
