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
  '/ao': 'Account Officer',
  '/monitoring': 'Monitoring',
  '/reporting': 'Reporting',
  '/sumber-data': 'Sumber Data Integrasi',
  '/pengaturan': 'Pengaturan',
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Close sidebar automatically on navigation
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
      />

      {/* Main content */}
      <main className="app-main">
        <Header
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
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
