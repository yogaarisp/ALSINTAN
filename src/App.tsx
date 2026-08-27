import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth/auth-context'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import PetaPage from '@/pages/peta/PetaPage'
import PrioritasPage from '@/pages/prioritas/PrioritasPage'
import ProspekPage from '@/pages/prospek/ProspekPage'
import AOPage from '@/pages/ao/AOPage'
import SurveyPage from '@/pages/survey/SurveyPage'
import MonitoringPage from '@/pages/monitoring/MonitoringPage'
import NotFoundPage from '@/pages/NotFoundPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f0fdf4',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48,
            height: 48,
            border: '3px solid #dcfce7',
            borderTopColor: '#16a34a',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#16a34a', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
            SIAP ALSINTAN
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="peta" element={<PetaPage />} />
          <Route path="prioritas" element={<PrioritasPage />} />
          <Route path="prospek" element={<ProspekPage />} />
          <Route path="ao" element={<AOPage />} />
          <Route path="survey" element={<SurveyPage />} />
          <Route path="monitoring" element={<MonitoringPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
