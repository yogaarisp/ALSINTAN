import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: 24,
      }}
    >
      <div className="card" style={{ maxWidth: 460, width: '100%', padding: '40px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', fontWeight: 900, color: '#16a34a', lineHeight: 1 }}>
          404
        </div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '16px 0 8px' }}>
          Halaman Tidak Ditemukan
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 24 }}>
          Halaman yang Anda cari tidak tersedia atau sedang dalam tahap pengembangan berikutnya.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
          <Link to="/dashboard" className="btn btn-primary">
            <Home size={16} />
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
