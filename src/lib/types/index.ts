// ============================================================
// SIAP ALSINTAN — Core Type Definitions
// ============================================================
// Jangan menambahkan field yang tidak ada di PRD tanpa konfirmasi

// ─────────────────────────────────────────
// ENUM: Roles
// ─────────────────────────────────────────
export type UserRole = 'ADMIN' | 'AO' | 'MANAJEMEN'

// ─────────────────────────────────────────
// ENUM: Status Prospek
// PRD Section 14 — TODO: CONFIRM final workflow
// ─────────────────────────────────────────
export type StatusProspek =
  | 'BARU'
  | 'DALAM_PROSPEK'
  | 'SURVEY'
  | 'POTENSIAL'
  | 'TIDAK_POTENSIAL'
  | 'CLOSING'

// ─────────────────────────────────────────
// ENUM: Status Survey
// PRD Section 14 — TODO: CONFIRM final workflow
// ─────────────────────────────────────────
export type StatusSurvey =
  | 'BELUM_SURVEY'
  | 'SURVEY_BERJALAN'
  | 'SURVEY_SELESAI'
  | 'DIVERIFIKASI'

// ─────────────────────────────────────────
// ENUM: Priority Level
// PRD Section 5 — Contoh threshold, bukan final
// ─────────────────────────────────────────
export type PriorityLevel = 'TINGGI' | 'SEDANG' | 'RENDAH'

// ─────────────────────────────────────────
// USER
// ─────────────────────────────────────────
export interface User {
  id: string
  nama: string
  email: string
  role: UserRole
  wilayah?: string
  avatar?: string
  isActive: boolean
}

export interface AuthSession {
  user: User
  token: string
  expiresAt: string
}

// ─────────────────────────────────────────
// MASTER WILAYAH
// PRD Section 9
// TODO: CONFIRM EXISTING SPREADSHEET STRUCTURE
// ─────────────────────────────────────────
export interface MasterWilayah {
  idKecamatan: string
  kecamatan: string
  kabupaten: string
  luasLahan: number           // dalam Hektar
  dataPanen?: number          // ton/tahun — TODO: CONFIRM unit
  dataProduksi?: number       // TODO: CONFIRM kolom aktual
  jumlahGapoktan: number
  komoditas: string[]
  // Data tambahan jika tersedia di spreadsheet
  koordinatLat?: number
  koordinatLng?: number
  // Calculated fields
  priorityScore?: number
  priorityLevel?: PriorityLevel
  priorityRank?: number
}

// ─────────────────────────────────────────
// MASTER KOMODITAS
// PRD Section 9
// TODO: CONFIRM EXISTING SPREADSHEET STRUCTURE
// ─────────────────────────────────────────
export interface MasterKomoditas {
  idKomoditas: string
  namaKomoditas: string
  keterangan?: string
}

// ─────────────────────────────────────────
// MASTER AO
// PRD Section 9
// TODO: CONFIRM EXISTING SPREADSHEET STRUCTURE
// ─────────────────────────────────────────
export interface MasterAO {
  idAO: string
  namaAO: string
  wilayah: string[]
  status: 'AKTIF' | 'TIDAK_AKTIF'
  email?: string
  // Stats — calculated
  totalProspek?: number
  totalSurvey?: number
}

// ─────────────────────────────────────────
// DATA PROSPEK
// PRD Section 9
// TODO: CONFIRM EXISTING SPREADSHEET STRUCTURE
// ─────────────────────────────────────────
export interface DataProspek {
  idProspek: string
  idKecamatan: string
  kecamatan: string
  namaGapoktan: string
  komoditas: string
  idAO: string
  namaAO: string
  status: StatusProspek
  tanggal: string             // ISO date string
  estimasiKebutuhan?: string  // TODO: CONFIRM format
  catatan?: string
  // Relations
  wilayahDetail?: MasterWilayah
  surveys?: DataSurvey[]
}

// ─────────────────────────────────────────
// DATA SURVEY
// PRD Section 9 & 13
// TODO: CONFIRM EXISTING SPREADSHEET STRUCTURE
// ─────────────────────────────────────────
export interface DataSurvey {
  idSurvey: string
  idProspek: string
  namaGapoktan: string
  jumlahAnggota?: number
  luasSawah?: number          // Hektar
  jenisAlsintan?: string
  estimasiHarga?: number      // Rupiah
  foto?: string[]             // URLs
  latitude?: number
  longitude?: number
  accuracy?: number           // meter
  catatan?: string
  idAO: string
  namaAO: string
  timestamp: string           // ISO datetime
  status: StatusSurvey
}

// ─────────────────────────────────────────
// PRIORITY SCORE RESULT
// PRD Section 5
// ─────────────────────────────────────────
export interface PriorityScoreResult {
  idKecamatan: string
  kecamatan: string
  score: number               // 0-100
  level: PriorityLevel
  rank: number
  // Input components (for transparency)
  components: {
    luasLahan: number
    jumlahGapoktan: number
    produksi: number
    prospekExisting: number
  }
  // Metadata
  calculatedAt: string
  isDevOnly: boolean          // true = formula belum disepakati stakeholder
}

// ─────────────────────────────────────────
// DASHBOARD KPI
// PRD Section 6B
// ─────────────────────────────────────────
export interface DashboardKPI {
  // TODO: CONFIRM sumber data Outstanding Kredit
  outstandingKredit?: number  // Rupiah — NC9: sumber belum dikonfirmasi
  prospekBaru: number
  aoAktif: number
  // TODO: CONFIRM definisi Conversion Rate — NC10
  conversionRate?: number     // Persentase
  totalKecamatan: number
  totalGapoktan: number
  totalLuasLahan: number      // Hektar
}

// ─────────────────────────────────────────
// API RESPONSE WRAPPER
// ─────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
  timestamp?: string
  // Pagination
  total?: number
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─────────────────────────────────────────
// FILTER & QUERY PARAMS
// ─────────────────────────────────────────
export interface WilayahFilter {
  kecamatan?: string
  komoditas?: string
  idAO?: string
  priorityLevel?: PriorityLevel
  kabupaten?: string
}

export interface ProspekFilter {
  status?: StatusProspek
  idAO?: string
  kecamatan?: string
  komoditas?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  limit?: number
}

export interface SurveyFilter {
  status?: StatusSurvey
  idAO?: string
  kecamatan?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

// ─────────────────────────────────────────
// MAP DATA
// ─────────────────────────────────────────
export interface MapMarker {
  id: string
  lat: number
  lng: number
  kecamatan: string
  kabupaten: string
  priorityLevel?: PriorityLevel
  priorityScore?: number
  jumlahProspek?: number
  jumlahSurvey?: number
  luasLahan?: number
  jumlahGapoktan?: number
}

// ─────────────────────────────────────────
// SUMBER DATA (spreadsheet sumber lain)
// ─────────────────────────────────────────
export interface SourceTab {
  nama: string
  baris: number
  kolom: number
}

export interface SourceInfo {
  key: string
  nama: string
  kategori: string
  url: string
  status: string
  tabs: SourceTab[]
}

export interface SourceData {
  sumber: { key: string; nama: string }
  tab: string
  header: string[]
  rows: Array<Array<string | number | boolean | null>>
  total: number
  page: number
  limit: number
  totalPages: number
  updatedAt: string
}

// ─────────────────────────────────────────
// FORM TYPES
// ─────────────────────────────────────────
export interface CreateProspekForm {
  idKecamatan: string
  namaGapoktan: string
  komoditas: string
  estimasiKebutuhan?: string
  catatan?: string
}

export interface CreateSurveyForm {
  idProspek: string
  namaGapoktan: string
  jumlahAnggota?: number
  luasSawah?: number
  jenisAlsintan?: string
  estimasiHarga?: number
  foto?: FileList
  latitude?: number
  longitude?: number
  accuracy?: number
  catatan?: string
}

export interface LoginForm {
  email: string
  password: string
}
