import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Server,
  KeyRound,
  Scale,
  ShieldCheck,
  ShieldX,
  Info,
  ExternalLink,
  Save,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Globe,
  Database,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/auth-context'
import { APP_CONFIG, API_CONFIG, PAGINATION, MAP_CONFIG } from '@/lib/config/app-config'
import { PRIORITY_CONFIG } from '@/lib/config/priority-config'
import { gasPost, isGasConfigured } from '@/lib/api/gas'
import type { UserRole } from '@/lib/types'
import {
  getPriorityOverrides,
  setPriorityOverrides,
  resetPriorityOverrides,
  getGasUrlOverride,
  setGasUrlOverride,
  resetGasUrlOverride,
} from '@/lib/settings/settings-store'

const WEIGHT_FIELDS: {
  key: 'luasLahan' | 'jumlahGapoktan' | 'produksi' | 'prospekExisting'
  label: string
  desc: string
}[] = [
  { key: 'luasLahan', label: 'Luas Lahan', desc: 'Potensi luas sawah (ha) per kecamatan' },
  { key: 'jumlahGapoktan', label: 'Jumlah Gapoktan', desc: 'Kekuatan kelembagaan kelompok tani' },
  { key: 'produksi', label: 'Produksi / Panen', desc: 'Volume produksi tonase wilayah' },
  { key: 'prospekExisting', label: 'Prospek Existing', desc: 'Inverse — makin sedikit prospek makin prioritas' },
]

type WeightKey = (typeof WEIGHT_FIELDS)[number]['key']
type TestState = 'idle' | 'loading' | 'ok' | 'error'

const ROLE_ACCESS: { fitur: string; admin: boolean; ao: boolean; manajemen: boolean }[] = [
  { fitur: 'Executive Dashboard', admin: true, ao: true, manajemen: true },
  { fitur: 'Peta Potensi Interaktif', admin: true, ao: true, manajemen: true },
  { fitur: 'Ranking Prioritas Wilayah', admin: true, ao: true, manajemen: true },
  { fitur: 'Lihat Semua Prospek', admin: true, ao: false, manajemen: true },
  { fitur: 'Tambah Prospek Baru', admin: true, ao: true, manajemen: false },
  { fitur: 'Input Survey & GPS Lapangan', admin: true, ao: true, manajemen: false },
  { fitur: 'Monitoring Kinerja AO', admin: true, ao: false, manajemen: true },
  { fitur: 'Evaluasi Baseline vs Realisasi', admin: true, ao: false, manajemen: true },
  { fitur: 'Pengaturan & Integrasi API', admin: true, ao: false, manajemen: false },
]

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  AO: 'Account Officer',
  MANAJEMEN: 'Manajemen',
}

export default function PengaturanPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const storedPriority = getPriorityOverrides()

  const [gasUrl, setGasUrl] = useState<string>(() => getGasUrlOverride() || API_CONFIG.gasApiUrl)
  const [testState, setTestState] = useState<TestState>('idle')
  const [testMsg, setTestMsg] = useState('')

  const [weights, setWeights] = useState<Record<WeightKey, number>>(() => ({
    luasLahan: Math.round((storedPriority?.weights.luasLahan ?? PRIORITY_CONFIG.weights.luasLahan) * 100),
    jumlahGapoktan: Math.round((storedPriority?.weights.jumlahGapoktan ?? PRIORITY_CONFIG.weights.jumlahGapoktan) * 100),
    produksi: Math.round((storedPriority?.weights.produksi ?? PRIORITY_CONFIG.weights.produksi) * 100),
    prospekExisting: Math.round((storedPriority?.weights.prospekExisting ?? PRIORITY_CONFIG.weights.prospekExisting) * 100),
  }))
  const [thresholds, setThresholds] = useState(() => ({
    tinggi: storedPriority?.thresholds.tinggi ?? PRIORITY_CONFIG.thresholds.tinggi,
    sedang: storedPriority?.thresholds.sedang ?? PRIORITY_CONFIG.thresholds.sedang,
  }))

  const hasPriorityOverride = Boolean(storedPriority)
  const urlConfigured = isGasConfigured()
  const weightTotal = weights.luasLahan + weights.jumlahGapoktan + weights.produksi + weights.prospekExisting

  const handleTestConnection = async () => {
    setGasUrlOverride(gasUrl.trim())
    setTestState('loading')
    setTestMsg('')
    try {
      const res = await gasPost<{ ok: boolean; time?: string }>('ping')
      if (res.ok) {
        setTestState('ok')
        setTestMsg(
          res.time
            ? `Terhubung — server merespons pada ${new Date(res.time).toLocaleTimeString('id-ID')}`
            : 'Terhubung — server merespons dengan status OK'
        )
      } else {
        setTestState('error')
        setTestMsg('Server merespons tetapi status tidak OK.')
      }
    } catch (err) {
      setTestState('error')
      setTestMsg((err as Error)?.message || 'Gagal terhubung. Periksa URL dan status deploy Apps Script.')
    }
  }

  const handleSaveGasUrl = () => {
    if (!gasUrl.trim()) {
      toast.error('URL Apps Script tidak boleh kosong.')
      return
    }
    setGasUrlOverride(gasUrl)
    toast.success('URL Apps Script disimpan.')
  }

  const handleResetGasUrl = () => {
    resetGasUrlOverride()
    setGasUrl(API_CONFIG.gasApiUrl)
    setTestState('idle')
    setTestMsg('')
    toast.success('URL kembali ke nilai bawaan dari .env.')
  }

  const handleSavePriority = () => {
    const w: Record<WeightKey, number> = {
      luasLahan: weights.luasLahan / 100,
      jumlahGapoktan: weights.jumlahGapoktan / 100,
      produksi: weights.produksi / 100,
      prospekExisting: weights.prospekExisting / 100,
    }
    const total = w.luasLahan + w.jumlahGapoktan + w.produksi + w.prospekExisting
    if (Math.abs(total - 1) > 0.005) {
      toast.error(`Total bobot harus 100% (sekarang ${Math.round(total * 100)}%).`)
      return
    }
    if (thresholds.sedang <= 0 || thresholds.tinggi <= thresholds.sedang) {
      toast.error('Threshold tidak valid — nilai TINGGI harus lebih besar dari SEDANG.')
      return
    }
    setPriorityOverrides({
      weights: w,
      thresholds: { tinggi: thresholds.tinggi, sedang: thresholds.sedang },
    })
    toast.success('Konfigurasi Priority Engine disimpan dan langsung berlaku.')
  }

  const handleResetPriority = () => {
    resetPriorityOverrides()
    setWeights({
      luasLahan: Math.round(PRIORITY_CONFIG.weights.luasLahan * 100),
      jumlahGapoktan: Math.round(PRIORITY_CONFIG.weights.jumlahGapoktan * 100),
      produksi: Math.round(PRIORITY_CONFIG.weights.produksi * 100),
      prospekExisting: Math.round(PRIORITY_CONFIG.weights.prospekExisting * 100),
    })
    setThresholds({ tinggi: PRIORITY_CONFIG.thresholds.tinggi, sedang: PRIORITY_CONFIG.thresholds.sedang })
    toast.success('Bobot & threshold kembali ke nilai bawaan.')
  }

  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Pengaturan</h1>
            <p className="page-subtitle" style={{ marginTop: 4 }}>
              Konfigurasi sistem dan integrasi API.
            </p>
          </div>
        </div>

        <div className="card" style={{ padding: '40px 32px', textAlign: 'center' }}>
          <ShieldX size={40} color="#dc2626" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
            Halaman Khusus Administrator
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: 420, margin: '0 auto' }}>
            Akun Anda saat ini (<strong>{user?.email}</strong>, role{' '}
            <strong>{user?.role ? ROLE_LABEL[user.role] : '—'}</strong>) tidak memiliki akses ke
            pengaturan sistem. Hubungi administrator bila perlu perubahan.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="dev-banner">
        <AlertTriangle size={16} />
        <div>
          <strong>Mode Development:</strong> Perubahan di sini tersimpan di browser ini
          (localStorage) dan langsung berlaku untuk sesi Anda. Untuk produksi, sebaiknya
          dipindah ke penyimpanan backend.
        </div>
      </div>

      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Pengaturan Sistem</h1>
            <span
              style={{
                fontSize: '0.725rem',
                fontWeight: 600,
                color: '#1d4ed8',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                padding: '2px 8px',
                borderRadius: 999,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <ShieldCheck size={12} />
              Khusus Administrator
            </span>
          </div>
          <p className="page-subtitle" style={{ marginTop: 4 }}>
            Kelola integrasi API, algoritma prioritas, dan informasi sistem.
          </p>
        </div>
      </div>

      {/* ─── Integrasi API ─── */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Server strokeWidth={2} />
          <strong>Integrasi & Koneksi API</strong>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 999,
              background: urlConfigured ? '#ecfdf5' : '#fffbeb',
              border: `1px solid ${urlConfigured ? '#a7f3d0' : '#fde68a'}`,
              color: urlConfigured ? '#059669' : '#b45309',
            }}
          >
            {urlConfigured ? 'URL terpasang' : 'URL belum dikonfigurasi (.env)'}
          </span>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
            URL deployment Web App Google Apps Script digunakan semua API (prospek, survey, AO,
            sumber data). Perubahan langsung berlaku tanpa perlu reload.
          </p>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a', marginBottom: 6, display: 'block' }}>
              URL Google Apps Script
            </label>
            <input
              className="input"
              value={gasUrl}
              onChange={(e) => {
                setGasUrl(e.target.value)
                setTestState('idle')
                setTestMsg('')
              }}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              style={{ width: '100%', fontFamily: 'monospace' }}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            <div
              style={{
                padding: '12px 14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <KeyRound size={16} color="#64748b" style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>API Key</div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: API_CONFIG.gasApiKey ? '#0f172a' : '#b45309' }}>
                  {API_CONFIG.gasApiKey ? '•••••••• (terpasang via env)' : 'Belum diatur (VITE_GAS_API_KEY)'}
                </div>
              </div>
            </div>
            <div
              style={{
                padding: '12px 14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Globe size={16} color="#64748b" style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Timeout / Retry</div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                  {Math.round(API_CONFIG.timeout / 1000)} detik · {API_CONFIG.retryAttempts}x retry
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={handleSaveGasUrl}>
              <Save size={14} />
              Simpan URL
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleTestConnection}
              disabled={testState === 'loading'}
            >
              {testState === 'loading' ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Database size={14} />
              )}
              Test Koneksi
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleResetGasUrl}>
              <RotateCcw size={14} />
              Reset ke Bawaan
            </button>
          </div>

          {testState === 'loading' && (
            <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>Menghubungi Apps Script...</p>
          )}
          {testState === 'ok' && (
            <p
              style={{
                fontSize: '0.8125rem',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                margin: 0,
              }}
            >
              <CheckCircle2 size={15} />
              {testMsg}
            </p>
          )}
          {testState === 'error' && (
            <p
              style={{
                fontSize: '0.8125rem',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                margin: 0,
              }}
            >
              <XCircle size={15} />
              {testMsg}
            </p>
          )}
        </div>
      </div>

      {/* ─── Priority Engine ─── */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Scale strokeWidth={2} />
          <strong>Konfigurasi Priority Engine</strong>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 999,
              background: hasPriorityOverride ? '#ecfdf5' : '#fffbeb',
              border: `1px solid ${hasPriorityOverride ? '#a7f3d0' : '#fde68a'}`,
              color: hasPriorityOverride ? '#059669' : '#b45309',
            }}
          >
            {hasPriorityOverride ? 'Override Administrator aktif' : `Nilai bawaan (dev v${PRIORITY_CONFIG.version})`}
          </span>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
            🚧 Formula & bobot ini <strong>BELUM disepakati stakeholder</strong> (NC1) — nilai
            bawaan hanya placeholder development. Sesuaikan bobot persentase sesuai kebijakan,
            lalu simpan. Ranking di halaman <strong>Prioritas Wilayah</strong> langsung terhitung ulang.
          </p>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
              Bobot Indikator
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              {WEIGHT_FIELDS.map((f) => (
                <div
                  key={f.key}
                  style={{
                    padding: '12px 14px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>{f.label}</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#16a34a' }}>{weights[f.key]}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={weights[f.key]}
                    onChange={(e) =>
                      setWeights((prev) => ({ ...prev, [f.key]: Number(e.target.value) }))
                    }
                    style={{ width: '100%', accentColor: '#16a34a' }}
                  />
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 6 }}>{f.desc}</div>
                </div>
              ))}
            </div>
            <div
              style={{
                fontSize: '0.75rem',
                marginTop: 8,
                color: Math.abs(weightTotal - 100) <= 0.5 ? '#059669' : '#dc2626',
                fontWeight: 600,
              }}
            >
              Total bobot: {weightTotal}% {Math.abs(weightTotal - 100) <= 0.5 ? '✓' : '— harus 100%'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
              Threshold Kategori Prioritas
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
              }}
            >
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a', marginBottom: 4, display: 'block' }}>
                  TINGGI (score ≥)
                </label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={100}
                  value={thresholds.tinggi}
                  onChange={(e) => setThresholds((prev) => ({ ...prev, tinggi: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a', marginBottom: 4, display: 'block' }}>
                  SEDANG (score ≥)
                </label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  value={thresholds.sedang}
                  onChange={(e) => setThresholds((prev) => ({ ...prev, sedang: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 6 }}>
              Di bawah SEDANG dikategorikan RENDAH. Pastikan {thresholds.tinggi} &gt; {thresholds.sedang}.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={handleSavePriority}>
              <Save size={14} />
              Simpan & Terapkan
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleResetPriority}>
              <RotateCcw size={14} />
              Reset ke Bawaan
            </button>
          </div>
        </div>
      </div>

      {/* ─── Infomasi Sistem ─── */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Info strokeWidth={2} />
          <strong>Informasi & Status Sistem</strong>
        </div>
        <div className="card-body">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
            }}
          >
            {[
              { label: 'Aplikasi', value: APP_CONFIG.name },
              { label: 'Deskripsi', value: APP_CONFIG.description, wide: true },
              { label: 'Versi', value: APP_CONFIG.version },
              { label: 'Environment', value: APP_CONFIG.env },
              { label: 'Mode', value: APP_CONFIG.isDev ? 'Development' : 'Production' },
              { label: 'Pagination', value: `default ${PAGINATION.defaultLimit} / max ${PAGINATION.maxLimit}` },
              { label: 'Peta', value: MAP_CONFIG.tileUrl.replace('https://{s}.', '') },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: '12px 14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                }}
              >
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.label}</div>
                <div
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    wordBreak: 'break-word',
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a
              className="btn btn-secondary btn-sm"
              href="https://lookerstudio.google.com"
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
            >
              <ExternalLink size={14} />
              Buka Looker Studio
            </a>
          </div>
        </div>
      </div>

      {/* ─── Hak Akses ─── */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <ShieldCheck strokeWidth={2} />
          <strong>Matriks Hak Akses Role</strong>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fitur / Modul</th>
                <th>Administrator</th>
                <th>Account Officer</th>
                <th>Manajemen</th>
              </tr>
            </thead>
            <tbody>
              {ROLE_ACCESS.map((row) => (
                <tr key={row.fitur}>
                  <td data-label="Fitur / Modul">{row.fitur}</td>
                  <td data-label="Administrator">{row.admin ? '✓' : '—'}</td>
                  <td data-label="Account Officer">{row.ao ? '✓' : '—'}</td>
                  <td data-label="Manajemen">{row.manajemen ? '✓' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}