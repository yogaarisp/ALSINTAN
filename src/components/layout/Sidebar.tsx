import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Map,
  BarChart3,
  Users,
  ClipboardList,
  FileText,
  Activity,
  Database,
  Settings,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Sprout,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/auth-context'
import { getRoleInfo } from '@/lib/utils'
import { APP_CONFIG } from '@/lib/config/app-config'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  roles?: string[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/peta', icon: Map, label: 'Peta Potensi' },
  { to: '/prioritas', icon: BarChart3, label: 'Prioritas Wilayah' },
  { to: '/prospek', icon: ClipboardList, label: 'Prospek', roles: ['ADMIN', 'ANALIS', 'MANAJEMEN'] },
  { to: '/survey', icon: FileText, label: 'Survey', roles: ['ADMIN', 'ANALIS'] },
  { to: '/analis', icon: Users, label: 'Analis', roles: ['ADMIN', 'MANAJEMEN'] },
  { to: '/monitoring', icon: Activity, label: 'Monitoring', roles: ['ADMIN', 'MANAJEMEN'] },
  { to: '/sumber-data', icon: Database, label: 'Sumber Data' },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({ isOpen = true, onClose, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const filteredNav = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  )

  return (
    <>
      {/* Overlay for mobile */}
      {onClose && (
        <div
          className={`sidebar-overlay ${isOpen ? 'open' : ''} hide-desktop`}
          onClick={onClose}
        />
      )}

      <aside className={`app-sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`} style={{
        background: 'white',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{
          padding: isCollapsed ? '16px 8px' : '20px 16px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          flexShrink: 0,
          transition: 'padding 0.2s ease',
        }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: isCollapsed ? 'pointer' : 'default',
            }}
            onClick={isCollapsed ? onToggleCollapse : undefined}
            title={isCollapsed ? 'Klik untuk perlebar sidebar' : undefined}
          >
            <div style={{
              width: 36,
              height: 36,
              background: 'linear-gradient(135deg, #16a34a, #059669)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Sprout size={20} color="white" />
            </div>
            {!isCollapsed && (
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                  {APP_CONFIG.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1.2 }}>
                  Fase 1 · {APP_CONFIG.version}
                </div>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle button */}
          {!isCollapsed && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="btn btn-ghost btn-icon hide-mobile"
              style={{
                width: 30,
                height: 30,
                padding: 0,
                borderRadius: 8,
                color: '#64748b',
                flexShrink: 0,
              }}
              title="Kecilkan sidebar"
              aria-label="Kecilkan sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          {/* Close button - mobile only */}
          {onClose && (
            <button
              onClick={onClose}
              className="btn btn-ghost btn-icon hide-desktop"
              style={{ flexShrink: 0 }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: isCollapsed ? '12px 6px' : '12px 10px', overflowY: 'auto' }}>
          <div style={{ marginBottom: 6 }}>
            {!isCollapsed ? (
              <div style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                padding: '4px 8px 8px',
              }}>
                Menu Utama
              </div>
            ) : (
              <div style={{ height: 1, background: '#f1f5f9', margin: '4px 6px 10px' }} />
            )}

            {filteredNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''} ${isCollapsed ? 'collapsed' : ''}`}
                onClick={onClose}
                title={isCollapsed ? item.label : undefined}
                style={isCollapsed ? { justifyContent: 'center', padding: '10px 0' } : undefined}
              >
                <item.icon size={18} className="sidebar-icon" style={{ flexShrink: 0 }} />
                {!isCollapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                {!isCollapsed && <ChevronRight size={14} style={{ opacity: 0.4, flexShrink: 0 }} />}
              </NavLink>
            ))}
          </div>

          {/* Settings - Admin only */}
          {user?.role === 'ADMIN' && (
            <div style={{ marginTop: 8 }}>
              {!isCollapsed ? (
                <div style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  padding: '4px 8px 8px',
                }}>
                  Sistem
                </div>
              ) : (
                <div style={{ height: 1, background: '#f1f5f9', margin: '8px 6px 10px' }} />
              )}
              <NavLink
                to="/pengaturan"
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''} ${isCollapsed ? 'collapsed' : ''}`}
                onClick={onClose}
                title={isCollapsed ? 'Pengaturan' : undefined}
                style={isCollapsed ? { justifyContent: 'center', padding: '10px 0' } : undefined}
              >
                <Settings size={18} style={{ flexShrink: 0 }} />
                {!isCollapsed && <span style={{ flex: 1 }}>Pengaturan</span>}
                {!isCollapsed && <ChevronRight size={14} style={{ opacity: 0.4 }} />}
              </NavLink>
            </div>
          )}
        </nav>

        {/* User Profile */}
        {user && (
          <div style={{
            padding: isCollapsed ? '12px 6px' : '12px 10px',
            borderTop: '1px solid #f1f5f9',
            flexShrink: 0,
          }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: 10,
                padding: isCollapsed ? '6px 0' : '8px 10px',
                borderRadius: 10,
                marginBottom: 4,
              }}
              title={isCollapsed ? `${user.nama} (${getRoleInfo(user.role).label})` : undefined}
            >
              {/* Avatar */}
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                border: '2px solid #86efac',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: '#15803d',
                flexShrink: 0,
              }}>
                {user.nama.charAt(0).toUpperCase()}
              </div>
              {!isCollapsed && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {user.nama}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '1px 6px',
                      borderRadius: 999,
                      background: '#dcfce7',
                      color: '#15803d',
                      fontWeight: 500,
                    }}>
                      {getRoleInfo(user.role).label}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-ghost"
              style={{
                width: '100%',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: 10,
                color: '#dc2626',
                padding: isCollapsed ? '8px 0' : undefined,
              }}
              title={isCollapsed ? 'Keluar' : undefined}
            >
              <LogOut size={16} />
              {!isCollapsed && 'Keluar'}
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
