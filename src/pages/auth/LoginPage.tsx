import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Sprout, LogIn, AlertCircle, Shield, User, BarChart3, Zap } from 'lucide-react'
import { useAuth } from '@/lib/auth/auth-context'
import type { LoginForm } from '@/lib/types'

const loginSchema = z.object({
  email: z.string().email('Email tidak valid').min(1, 'Email harus diisi'),
  password: z.string().min(1, 'Password harus diisi'),
})

const SHORTCUT_ACCOUNTS = [
  {
    role: 'ADMIN',
    title: 'Admin',
    desc: 'Akses penuh ke semua menu & konfigurasi',
    email: 'admin@siap-alsintan.id',
    password: 'admin123',
    icon: Shield,
    badgeBg: '#f3e8ff',
    badgeColor: '#7e22ce',
    borderHover: '#c084fc',
  },
  {
    role: 'AO',
    title: 'Account Officer (AO)',
    desc: 'Target wilayah, prospek & survey lapangan',
    email: 'budi@siap-alsintan.id',
    password: 'ao123',
    icon: User,
    badgeBg: '#dcfce7',
    badgeColor: '#15803d',
    borderHover: '#4ade80',
  },
  {
    role: 'MANAJEMEN',
    title: 'Manajemen',
    desc: 'Monitoring kinerja AO & evaluasi potensi',
    email: 'manager@siap-alsintan.id',
    password: 'mgr123',
    icon: BarChart3,
    badgeBg: '#dbeafe',
    badgeColor: '#1d4ed8',
    borderHover: '#60a5fa',
  },
]

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [loadingRole, setLoadingRole] = useState<string | null>(null)

  // Redirect jika sudah login
  if (isAuthenticated) {
    navigate('/dashboard', { replace: true })
    return null
  }

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const handleLoginSubmit = async (data: LoginForm) => {
    setAuthError(null)
    try {
      await login(data.email, data.password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Login gagal.')
    }
  }

  const handleShortcutLogin = async (acc: typeof SHORTCUT_ACCOUNTS[0]) => {
    setAuthError(null)
    setLoadingRole(acc.role)
    setValue('email', acc.email)
    setValue('password', acc.password)
    try {
      await login(acc.email, acc.password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Login gagal.')
      setLoadingRole(null)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 480,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>
        {/* Header Logo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48,
            height: 48,
            background: 'linear-gradient(135deg, #16a34a, #059669)',
            borderRadius: 12,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
          }}>
            <Sprout size={26} color="white" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            SIAP ALSINTAN
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: 4 }}>
            Sistem Informasi & Pemetaan Potensi Alsintan (Fase 1)
          </p>
        </div>

        {/* Prototype Shortcut Box */}
        <div className="card" style={{ padding: 20, border: '1px solid #e2e8f0', background: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ padding: 6, background: '#fef3c7', borderRadius: 8, color: '#d97706' }}>
              <Zap size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                Quick Login Prototype
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Pilih role di bawah untuk langsung masuk tanpa mengetik kredensial:
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SHORTCUT_ACCOUNTS.map((acc) => {
              const Icon = acc.icon
              const isSelectedLoading = loadingRole === acc.role

              return (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleShortcutLogin(acc)}
                  disabled={loadingRole !== null || isSubmitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = acc.borderHover
                    e.currentTarget.style.background = '#ffffff'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.background = '#f8fafc'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: acc.badgeBg,
                      color: acc.badgeColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                        {acc.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {acc.desc}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: acc.badgeColor,
                    padding: '4px 10px',
                    background: acc.badgeBg,
                    borderRadius: 6,
                    whiteSpace: 'nowrap',
                  }}>
                    {isSelectedLoading ? 'Masuk...' : 'Login →'}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Manual Form (Clean/Plain Style) */}
        <div className="card" style={{ padding: 24, border: '1px solid #e2e8f0', background: 'white' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', marginBottom: 16, textAlign: 'center' }}>
            Atau login manual dengan email:
          </div>

          <form onSubmit={handleSubmit(handleLoginSubmit)} noValidate>
            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label className="input-label" htmlFor="login-email">
                Email Akun
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                className={`input ${errors.email ? 'error' : ''}`}
                placeholder="nama@siap-alsintan.id"
                {...register('email')}
              />
              {errors.email && (
                <p className="input-error">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div style={{ marginBottom: 18 }}>
              <label className="input-label" htmlFor="login-password">
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`input ${errors.password ? 'error' : ''}`}
                  placeholder="••••••••"
                  style={{ paddingRight: 44 }}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                  }}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && (
                <p className="input-error">{errors.password.message}</p>
              )}
            </div>

            {/* Auth error */}
            {authError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                marginBottom: 16,
                fontSize: '0.8125rem',
                color: '#dc2626',
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                {authError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || loadingRole !== null}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px 16px' }}
              id="login-submit"
            >
              {isSubmitting ? (
                'Memverifikasi...'
              ) : (
                <>
                  <LogIn size={16} />
                  Masuk ke Aplikasi
                </>
              )}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
          SIAP ALSINTAN &copy; 2026 · Mode Prototype / Development
        </div>
      </div>
    </div>
  )
}
