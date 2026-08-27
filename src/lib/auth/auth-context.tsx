// ============================================================
// SIAP ALSINTAN — Auth Context
// ============================================================
// Simple credential-based auth untuk Phase 1A
// TODO: Ganti dengan Google OAuth saat NC4 dikonfirmasi
// ============================================================

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User, AuthSession } from '@/lib/types'

interface AuthContextType {
  user: User | null
  session: AuthSession | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

// ─────────────────────────────────────────
// MOCK USERS untuk development
// TODO: Ganti dengan autentikasi nyata
// ─────────────────────────────────────────
const MOCK_USERS: (User & { password: string })[] = [
  {
    id: 'U001',
    nama: 'Admin SIAP',
    email: 'admin@siap-alsintan.id',
    password: 'admin123',
    role: 'ADMIN',
    isActive: true,
  },
  {
    id: 'AO001',
    nama: 'Budi Santoso',
    email: 'budi@siap-alsintan.id',
    password: 'ao123',
    role: 'AO',
    wilayah: 'Karawang',
    isActive: true,
  },
  {
    id: 'M001',
    nama: 'Manager Pertanian',
    email: 'manager@siap-alsintan.id',
    password: 'mgr123',
    role: 'MANAJEMEN',
    isActive: true,
  },
]

const SESSION_KEY = 'siap_alsintan_session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load session dari localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as AuthSession
        // Cek apakah session masih valid
        if (new Date(parsed.expiresAt) > new Date()) {
          setSession(parsed)
        } else {
          localStorage.removeItem(SESSION_KEY)
        }
      }
    } catch {
      localStorage.removeItem(SESSION_KEY)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true)
    try {
      // Simulasi network delay
      await new Promise((r) => setTimeout(r, 800))

      // TODO: Ganti dengan Google OAuth atau API call nyata — NC4
      const found = MOCK_USERS.find(
        (u) => u.email === email && u.password === password && u.isActive
      )

      if (!found) {
        throw new Error('Email atau password salah.')
      }

      const { password: _pwd, ...user } = found
      void _pwd

      const newSession: AuthSession = {
        user,
        token: `mock_token_${Date.now()}`,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 jam
      }

      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession))
      setSession(newSession)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        isLoading,
        isAuthenticated: !!session,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus digunakan di dalam AuthProvider')
  return ctx
}
