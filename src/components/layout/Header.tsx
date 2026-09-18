import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import {
  Bell,
  Menu,
  Search,
  ChevronDown,
  LayoutDashboard,
  Map,
  BarChart3,
  ClipboardList,
  FileText,
  Users,
  Activity,
  Database,
  Settings,
  LogOut,
  UserCheck,
  CheckCircle2,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/auth-context'
import { getRoleInfo } from '@/lib/utils'

interface HeaderProps {
  title: string
  onMenuClick: () => void
}

const PAGE_ICONS: Record<string, React.ElementType> = {
  '/dashboard': LayoutDashboard,
  '/peta': Map,
  '/prioritas': BarChart3,
  '/prospek': ClipboardList,
  '/survey': FileText,
  '/ao': Users,
  '/monitoring': Activity,
  '/sumber-data': Database,
  '/pengaturan': Settings,
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const { user, logout, loginWithUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [unreadCount, setUnreadCount] = useState(3)

  const notifRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const PageIcon = PAGE_ICONS[location.pathname] || LayoutDashboard

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/prospek?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  const handleLogout = () => {
    setShowUserMenu(false)
    logout()
    navigate('/login')
  }

  const handleSwitchUser = (role: 'ADMIN' | 'AO' | 'MANAJEMEN') => {
    setShowUserMenu(false)
    if (role === 'ADMIN') {
      loginWithUser({
        id: 'U001',
        nama: 'Admin SIAP',
        email: 'admin@siap-alsintan.id',
        role: 'ADMIN',
        isActive: true,
      })
    } else if (role === 'AO') {
      loginWithUser({
        id: 'AO001',
        nama: 'Budi Santoso',
        email: 'budi@siap-alsintan.id',
        role: 'AO',
        wilayah: 'Karawang',
        isActive: true,
      })
    } else {
      loginWithUser({
        id: 'M001',
        nama: 'Manager Pertanian',
        email: 'manager@siap-alsintan.id',
        role: 'MANAJEMEN',
        isActive: true,
      })
    }
  }

  return (
    <header className="app-header">
      <div className="app-header-inner">
        {/* Left: Hamburger & Context / Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {/* Mobile hamburger */}
          <button
            onClick={onMenuClick}
            className="btn btn-ghost btn-icon hide-desktop"
            style={{
              padding: 8,
              borderRadius: 8,
              color: '#334155',
              background: '#f1f5f9',
            }}
            aria-label="Buka menu navigasi"
          >
            <Menu size={20} />
          </button>

          {/* Breadcrumb & Page Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <PageIcon size={18} />
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.75rem',
                  color: '#64748b',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <span className="hide-mobile">SIAP ALSINTAN /</span>
                <span style={{ fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 2,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#15803d',
                    background: '#f0fdf4',
                    padding: '1px 7px',
                    borderRadius: 999,
                    border: '1px solid #bbf7d0',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#16a34a',
                      boxShadow: '0 0 0 2px #bbf7d0',
                    }}
                  />
                  Kab. Purworejo
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Search, Notifications, User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {/* Quick Search - Desktop */}
          <form
            onSubmit={handleSearch}
            className="hide-mobile"
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '7px 12px',
                width: 260,
                transition: 'all 150ms ease',
              }}
            >
              <Search size={15} color="#94a3b8" />
              <input
                type="text"
                placeholder="Cari prospek, wilayah..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '0.8125rem',
                  color: '#0f172a',
                  width: '100%',
                }}
              />
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: '#94a3b8',
                  background: '#e2e8f0',
                  padding: '2px 5px',
                  borderRadius: 4,
                  lineHeight: 1,
                }}
              >
                ↵
              </span>
            </div>
          </form>

          {/* Notification Bell with Dropdown */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications)
                setShowUserMenu(false)
              }}
              className="btn btn-ghost btn-icon"
              style={{
                position: 'relative',
                width: 38,
                height: 38,
                borderRadius: 10,
                background: showNotifications ? '#f1f5f9' : 'transparent',
                color: '#475569',
              }}
              aria-label="Notifikasi"
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 8,
                    height: 8,
                    background: '#dc2626',
                    borderRadius: '50%',
                    border: '2px solid white',
                  }}
                />
              )}
            </button>

            {/* Notification Popover */}
            {showNotifications && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: 340,
                  maxWidth: '90vw',
                  background: 'white',
                  borderRadius: 14,
                  boxShadow: '0 10px 30px -5px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
                  border: '1px solid #e2e8f0',
                  zIndex: 1000,
                  overflow: 'hidden',
                  animation: 'fadeIn 0.15s ease',
                }}
              >
                <div
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                      Notifikasi
                    </span>
                    {unreadCount > 0 && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          background: '#dcfce7',
                          color: '#15803d',
                          padding: '1px 6px',
                          borderRadius: 999,
                        }}
                      >
                        {unreadCount} baru
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => setUnreadCount(0)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#16a34a',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Tandai dibaca
                    </button>
                  )}
                </div>

                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  <div
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f8fafc',
                      display: 'flex',
                      gap: 12,
                      background: '#f0fdf4',
                    }}
                  >
                    <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                        Data LBS 2024 Terverifikasi
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                        16 Kecamatan Kabupaten Purworejo telah tersinkronisasi.
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>10 menit yang lalu</div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f8fafc',
                      display: 'flex',
                      gap: 12,
                    }}
                  >
                    <Sparkles size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                        Priority Engine Updated
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                        Rekomendasi prioritas wilayah alsintan diperbarui otomatis.
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>1 jam yang lalu</div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      gap: 12,
                    }}
                  >
                    <RefreshCw size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                        Data BMKG Siap
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                        Monitoring cuaca stasiun Purworejo aktif.
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>3 jam yang lalu</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          {user && (
            <div style={{ position: 'relative' }} ref={userMenuRef}>
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu)
                  setShowNotifications(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 10px 4px 6px',
                  borderRadius: 12,
                  background: showUserMenu ? '#f1f5f9' : '#f8fafc',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                    border: '2px solid #86efac',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: '#15803d',
                    flexShrink: 0,
                  }}
                >
                  {user.nama.charAt(0)}
                </div>

                <div className="hide-mobile" style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>
                    {user.nama}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1.2 }}>
                    {getRoleInfo(user.role).label}
                  </div>
                </div>

                <ChevronDown size={14} color="#94a3b8" />
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 250,
                    background: 'white',
                    borderRadius: 14,
                    boxShadow: '0 10px 30px -5px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
                    border: '1px solid #e2e8f0',
                    zIndex: 1000,
                    overflow: 'hidden',
                    animation: 'fadeIn 0.15s ease',
                  }}
                >
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                      {user.nama}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                      {user.email}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: '#dcfce7',
                          color: '#15803d',
                          display: 'inline-block',
                        }}
                      >
                        {getRoleInfo(user.role).label}
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: '6px 8px' }}>
                    <div
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '6px 8px 4px',
                      }}
                    >
                      Simulasi Ganti Role
                    </div>
                    <button
                      onClick={() => handleSwitchUser('ADMIN')}
                      className="btn btn-ghost"
                      style={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        fontSize: '0.8125rem',
                        padding: '6px 8px',
                        color: user.role === 'ADMIN' ? '#16a34a' : '#334155',
                        fontWeight: user.role === 'ADMIN' ? 600 : 400,
                      }}
                    >
                      <UserCheck size={15} /> Admin SIAP
                    </button>
                    <button
                      onClick={() => handleSwitchUser('AO')}
                      className="btn btn-ghost"
                      style={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        fontSize: '0.8125rem',
                        padding: '6px 8px',
                        color: user.role === 'AO' ? '#16a34a' : '#334155',
                        fontWeight: user.role === 'AO' ? 600 : 400,
                      }}
                    >
                      <Users size={15} /> Budi Santoso (AO)
                    </button>
                    <button
                      onClick={() => handleSwitchUser('MANAJEMEN')}
                      className="btn btn-ghost"
                      style={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        fontSize: '0.8125rem',
                        padding: '6px 8px',
                        color: user.role === 'MANAJEMEN' ? '#16a34a' : '#334155',
                        fontWeight: user.role === 'MANAJEMEN' ? 600 : 400,
                      }}
                    >
                      <Activity size={15} /> Manager Pertanian
                    </button>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', padding: '6px 8px' }}>
                    <Link
                      to="/pengaturan"
                      onClick={() => setShowUserMenu(false)}
                      className="btn btn-ghost"
                      style={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        fontSize: '0.8125rem',
                        padding: '6px 8px',
                        color: '#334155',
                      }}
                    >
                      <Settings size={15} /> Pengaturan Sistem
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="btn btn-ghost"
                      style={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        fontSize: '0.8125rem',
                        padding: '6px 8px',
                        color: '#dc2626',
                      }}
                    >
                      <LogOut size={15} /> Keluar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
