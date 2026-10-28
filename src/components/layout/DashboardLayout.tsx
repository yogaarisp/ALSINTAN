import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/peta': 'Peta Potensi Wilayah',
  '/prioritas': 'Prioritas Wilayah',
  '/prospek': 'Data Prospek',
  '/survey': 'Survey',
  '/analis': 'Analis',
  '/monitoring': 'Monitoring',
  '/reporting': 'Reporting',
  '/sumber-data': 'Sumber Data Integrasi',
  '/pengaturan': 'Pengaturan',
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('siap_sidebar_collapsed') === 'true'
    }
    return false
  })
  const location = useLocation()

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('siap_sidebar_collapsed', String(next))
      }
      return next
    })
  }

  // Close mobile sidebar automatically on navigation
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Prevent background scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  const title = PAGE_TITLES[location.pathname] || 'SIAP ALSINTAN'

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      {/* Main content */}
      <main className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />

        <div className="app-content">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <MobileNav onMenuClick={() => setSidebarOpen(true)} />
    </div>
  )
}
