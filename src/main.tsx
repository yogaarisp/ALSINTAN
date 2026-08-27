import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/lib/auth/auth-context'
import { APP_CONFIG } from '@/lib/config/app-config'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // 5 menit default
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
})

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element tidak ditemukan')

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.875rem',
              borderRadius: '10px',
              boxShadow: '0 4px 12px rgb(0 0 0 / 0.15)',
            },
            success: {
              iconTheme: { primary: '#16a34a', secondary: 'white' },
            },
            error: {
              iconTheme: { primary: '#dc2626', secondary: 'white' },
            },
          }}
        />
        {APP_CONFIG.isDev && <ReactQueryDevtools initialIsOpen={false} />}
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
)
