import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Map,
  BarChart3,
  ClipboardList,
  UserCircle,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/auth-context'

const MOBILE_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/peta', icon: Map, label: 'Peta' },
  { to: '/prioritas', icon: BarChart3, label: 'Prioritas' },
  { to: '/prospek', icon: ClipboardList, label: 'Prospek' },
]

interface MobileNavProps {
  onMenuClick?: () => void
}

export function MobileNav({ onMenuClick }: MobileNavProps) {
  const { user } = useAuth()

  return (
    <nav className="hide-desktop" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 'var(--mobile-nav-height)',
      background: 'white',
      borderTop: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'stretch',
      zIndex: 'var(--z-mobile-nav)',
      boxShadow: '0 -4px 12px rgb(0 0 0 / 0.06)',
    }}>
      {MOBILE_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          style={({ isActive }) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            fontSize: '0.6875rem',
            fontWeight: 500,
            textDecoration: 'none',
            color: isActive ? '#15803d' : '#94a3b8',
            transition: 'color 150ms ease',
            position: 'relative',
          })}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 32,
                  height: 3,
                  background: '#15803d',
                  borderRadius: '0 0 4px 4px',
                }} />
              )}
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.75} />
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}

      {/* Profile / Menu Drawer Trigger */}
      <button
        type="button"
        onClick={onMenuClick}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          color: '#64748b',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
        aria-label="Buka menu lengkap"
      >
        {user ? (
          <div style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
            border: '1.5px solid #86efac',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: '#15803d',
          }}>
            {user.nama.charAt(0)}
          </div>
        ) : (
          <UserCircle size={22} strokeWidth={1.75} />
        )}
        <span style={{ fontSize: '0.6875rem', fontWeight: 500 }}>Menu</span>
      </button>
    </nav>
  )
}
