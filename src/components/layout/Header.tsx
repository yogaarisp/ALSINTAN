import { Bell, Menu, Search } from 'lucide-react'
import { useAuth } from '@/lib/auth/auth-context'
import { getRoleInfo } from '@/lib/utils'

interface HeaderProps {
  title: string
  onMenuClick: () => void
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const { user } = useAuth()

  return (
    <header className="app-header" style={{
      background: 'white',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      paddingInline: 24,
      gap: 16,
      boxShadow: '0 1px 3px rgb(0 0 0 / 0.04)',
    }}>
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="btn btn-ghost btn-icon hide-desktop"
        style={{ flexShrink: 0 }}
        aria-label="Buka menu navigasi"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{
          fontSize: '1.0625rem',
          fontWeight: 700,
          color: '#0f172a',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {title}
        </h1>
      </div>

      {/* Search — desktop only */}
      <div className="hide-mobile" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '6px 12px',
        width: 220,
        cursor: 'pointer',
      }}>
        <Search size={15} color="#94a3b8" />
        <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Cari...</span>
      </div>

      {/* Notification */}
      <button
        className="btn btn-ghost btn-icon"
        style={{ position: 'relative', flexShrink: 0 }}
        aria-label="Notifikasi"
      >
        <Bell size={20} />
        {/* Notification dot */}
        <span style={{
          position: 'absolute',
          top: 6,
          right: 6,
          width: 8,
          height: 8,
          background: '#dc2626',
          borderRadius: '50%',
          border: '2px solid white',
        }} />
      </button>

      {/* User info - desktop */}
      {user && (
        <div className="hide-mobile" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 12px',
          borderRadius: 10,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          flexShrink: 0,
        }}>
          <div style={{
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
          }}>
            {user.nama.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.3 }}>
              {user.nama}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1.3 }}>
              {getRoleInfo(user.role).label}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
