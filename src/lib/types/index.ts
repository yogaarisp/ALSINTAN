// ============================================================
// SIAP ALSINTAN — Core Type Definitions
// ============================================================
// Jangan menambahkan field yang tidak ada di PRD tanpa konfirmasi

// ─────────────────────────────────────────
// ENUM: Roles
// ─────────────────────────────────────────
export type UserRole = 'ADMIN' | 'ANALIS' | 'MANAJEMEN'

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
  | 'DISBURSE'
  | 'CAIR'

// ─────────────────────────────────────────
// ENUM: Status Survey
// PRD Section 14 — TODO: CONFIRM final workflow
// ─────────────────────────────────────────
export type StatusSurvey =
  | 'SURVEY'
  | 'ANALISA'
  | 'DISBURSE'
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
// MASTER ANALIS
// PRD Section 9
// TODO: CONFIRM EXISTING SPREADSHEET STRUCTURE
// ─────────────────────────────────────────
export interface MasterAnalis {
  idAnalis: string
  namaAnalis: string
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
  namaProspek?: string
  namaGapoktan: string
  komoditas: string
  idAnalis: string
  namaAnalis: string
  status: StatusProspek
  tanggal: string             // ISO date string
  estimasiKebutuhan?: string  // Kebutuhan alat alsintan
  estimasiPlafon?: number     // Plafon kredit (Rupiah)
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
  namaProspek?: string
  namaGapoktan: string
  namaKetua?: string            // auto-fill dari Master Poktan 2026
  jumlahAnggota?: number
  luasSawah?: number          // Hektar
  jenisAlsintan?: string
  estimasiHarga?: number      // Rupiah
  estimasiPlafon?: number     // Rupiah (alias)
  foto?: string[]             // URLs
  fotoUrl?: string            // Google Drive URL
  latitude?: number
  longitude?: number
  accuracy?: number           // meter
  catatan?: string
  idAnalis: string
  namaAnalis: string
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
  analisAktif: number
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
// MASTER POKTAN (spreadsheet "Poktan 2026")
// Daftar kelompok tani per kecamatan — 16 tab, ±3.243 baris.
// Berbeda dengan DATA_PROSPEK: ini master acuan, bukan hasil kerja Analis.
// ─────────────────────────────────────────
export interface MasterPoktan {
  idPoktan: string
  namaPoktan: string
  jumlahAnggota: number
  desa: string
  ketua: string
  alamat: string
  kecamatan: string
}

export interface PoktanResponse extends PaginatedResponse<MasterPoktan> {
  /** Nama tab (= nama kecamatan) yang tersedia di Poktan 2026 */
  kecamatan: string[]
  updatedAt?: string
}

// ─────────────────────────────────────────
// FILTER & QUERY PARAMS
// ─────────────────────────────────────────
export interface WilayahFilter {
  kecamatan?: string
  komoditas?: string
  idAnalis?: string
  priorityLevel?: PriorityLevel
  kabupaten?: string
}

export interface ProspekFilter {
  status?: StatusProspek
  idAnalis?: string
  kecamatan?: string
  komoditas?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  limit?: number
}

export interface PoktanFilter {
  kecamatan?: string
  q?: string
  page?: number
  limit?: number
}

export interface SurveyFilter {
  status?: StatusSurvey
  idAnalis?: string
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
  namaProspek: string
  namaGapoktan?: string
  komoditas: string
  estimasiKebutuhan?: string
  estimasiPlafon?: number
  catatan?: string
  /** Dikirim dari sesi login supaya prospek tidak semua menumpuk ke AN001. */
  idAnalis?: string
  namaAnalis?: string
}

/**
 * Field prospek yang boleh diubah setelah dibuat.
 * ID_PROSPEK, ID_KECAMATAN, KECAMATAN, dan TANGGAL dikunci: ID jadi kunci
 * relasi ke DATA_SURVEY, kecamatan/tanggal adalah jejak registrasi awal.
 */
export interface UpdateProspekForm {
  idProspek: string
  namaProspek?: string
  namaGapoktan?: string
  komoditas?: string
  estimasiKebutuhan?: string
  estimasiPlafon?: number
  catatan?: string
  status?: StatusProspek
  idAnalis?: string
}

/** Hasil deleteProspek: soft delete, jadi baris di sheet tetap ada. */
export interface DeleteProspekResult {
  ok: boolean
  sudahNonaktif: boolean
  jumlahSurvey: number
  prospek: DataProspek
}

export interface CreateSurveyForm {
  idProspek: string
  namaProspek?: string
  namaGapoktan?: string
  kecamatan?: string
  namaKetua?: string
  jumlahAnggota?: number
  luasSawah?: number
  jenisAlsintan?: string
  estimasiHarga?: number
  estimasiPlafon?: number
  foto?: FileList
  fotoBase64?: string
  fotoName?: string
  latitude?: number
  longitude?: number
  accuracy?: number
  catatan?: string
  idAnalis?: string
  namaAnalis?: string
  status?: StatusSurvey
}

export interface UpdateSurveyForm {
  idSurvey: string
  namaProspek?: string
  namaGapoktan?: string
  jenisAlsintan?: string
  estimasiHarga?: number
  catatan?: string
  status?: StatusSurvey
}

export interface RekapPencairan {
  idPencairan: string
  tanggalPencairan: string
  idProspek: string
  idSurvey?: string
  namaProspek: string
  kecamatan: string
  jenisAlsintan: string
  plafonPencairan: number
  idAnalis: string
  namaAnalis: string
  catatan?: string
}

export interface LoginForm {
  email: string
  password: string
}
