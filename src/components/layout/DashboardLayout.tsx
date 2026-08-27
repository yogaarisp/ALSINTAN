import { useState } from 'react'
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
  '/pengaturan': 'Pengaturan',
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

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
      <MobileNav />
    </div>
  )
}
