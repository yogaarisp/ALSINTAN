// ============================================================
// SIAP ALSINTAN — Mock Data untuk Development
// ============================================================
// Digunakan selama Google Apps Script belum tersedia
// TODO: REMOVE atau ganti dengan data aktual dari Apps Script
// Ref: NC2, NC3 — URL & struktur Spreadsheet belum dikonfirmasi
// ============================================================

import type {
  MasterWilayah,
  MasterAO,
  MasterKomoditas,
  DataProspek,
  DataSurvey,
  DashboardKPI,
} from '@/lib/types'

// ─────────────────────────────────────────
// MOCK: Komoditas
// ─────────────────────────────────────────
export const MOCK_KOMODITAS: MasterKomoditas[] = [
  { idKomoditas: 'K001', namaKomoditas: 'Padi', keterangan: 'Padi sawah dan padi ladang' },
  { idKomoditas: 'K002', namaKomoditas: 'Jagung', keterangan: 'Jagung hibrida dan lokal' },
  { idKomoditas: 'K003', namaKomoditas: 'Kedelai', keterangan: '' },
  { idKomoditas: 'K004', namaKomoditas: 'Tebu', keterangan: '' },
  { idKomoditas: 'K005', namaKomoditas: 'Hortikultura', keterangan: 'Sayuran dan buah-buahan' },
]

// ─────────────────────────────────────────
// MOCK: AO
// ─────────────────────────────────────────
export const MOCK_AO: MasterAO[] = [
  {
    idAO: 'AO001',
    namaAO: 'Budi Santoso',
    wilayah: ['Kec. Cikampek', 'Kec. Purwasari', 'Kec. Tegalwaru'],
    status: 'AKTIF',
    email: 'budi@siap-alsintan.id',
    totalProspek: 24,
    totalSurvey: 18,
  },
  {
    idAO: 'AO002',
    namaAO: 'Siti Rahayu',
    wilayah: ['Kec. Karawang Barat', 'Kec. Karawang Timur'],
    status: 'AKTIF',
    email: 'siti@siap-alsintan.id',
    totalProspek: 15,
    totalSurvey: 12,
  },
  {
    idAO: 'AO003',
    namaAO: 'Ahmad Fauzi',
    wilayah: ['Kec. Telukjambe Barat', 'Kec. Telukjambe Timur'],
    status: 'AKTIF',
    email: 'ahmad@siap-alsintan.id',
    totalProspek: 8,
    totalSurvey: 5,
  },
]

// ─────────────────────────────────────────
// MOCK: Wilayah
// TODO: Ganti dengan data aktual Dinas Pertanian
// ─────────────────────────────────────────
export const MOCK_WILAYAH: MasterWilayah[] = [
  {
    idKecamatan: 'W001',
    kecamatan: 'Cikampek',
    kabupaten: 'Karawang',
    luasLahan: 3250,
    dataPanen: 8200,
    jumlahGapoktan: 42,
    komoditas: ['Padi', 'Jagung'],
    koordinatLat: -6.4123,
    koordinatLng: 107.4567,
  },
  {
    idKecamatan: 'W002',
    kecamatan: 'Karawang Barat',
    kabupaten: 'Karawang',
    luasLahan: 2100,
    dataPanen: 5800,
    jumlahGapoktan: 28,
    komoditas: ['Padi'],
    koordinatLat: -6.3189,
    koordinatLng: 107.2978,
  },
  {
    idKecamatan: 'W003',
    kecamatan: 'Telukjambe Barat',
    kabupaten: 'Karawang',
    luasLahan: 1800,
    dataPanen: 4500,
    jumlahGapoktan: 22,
    komoditas: ['Padi', 'Kedelai'],
    koordinatLat: -6.3456,
    koordinatLng: 107.3012,
  },
  {
    idKecamatan: 'W004',
    kecamatan: 'Purwasari',
    kabupaten: 'Karawang',
    luasLahan: 2800,
    dataPanen: 7100,
    jumlahGapoktan: 35,
    komoditas: ['Padi', 'Jagung'],
    koordinatLat: -6.4501,
    koordinatLng: 107.4123,
  },
  {
    idKecamatan: 'W005',
    kecamatan: 'Tegalwaru',
    kabupaten: 'Karawang',
    luasLahan: 1200,
    dataPanen: 2900,
    jumlahGapoktan: 15,
    komoditas: ['Padi'],
    koordinatLat: -6.5012,
    koordinatLng: 107.4890,
  },
  {
    idKecamatan: 'W006',
    kecamatan: 'Karawang Timur',
    kabupaten: 'Karawang',
    luasLahan: 1950,
    dataPanen: 4800,
    jumlahGapoktan: 24,
    komoditas: ['Padi', 'Hortikultura'],
    koordinatLat: -6.3234,
    koordinatLng: 107.3456,
  },
  {
    idKecamatan: 'W007',
    kecamatan: 'Telukjambe Timur',
    kabupaten: 'Karawang',
    luasLahan: 4100,
    dataPanen: 9800,
    jumlahGapoktan: 52,
    komoditas: ['Padi', 'Jagung', 'Kedelai'],
    koordinatLat: -6.3789,
    koordinatLng: 107.3234,
  },
  {
    idKecamatan: 'W008',
    kecamatan: 'Ciampel',
    kabupaten: 'Karawang',
    luasLahan: 890,
    dataPanen: 2100,
    jumlahGapoktan: 11,
    komoditas: ['Padi'],
    koordinatLat: -6.4678,
    koordinatLng: 107.2890,
  },
]

// ─────────────────────────────────────────
// MOCK: Prospek
// ─────────────────────────────────────────
export const MOCK_PROSPEK: DataProspek[] = [
  {
    idProspek: 'P001',
    idKecamatan: 'W001',
    kecamatan: 'Cikampek',
    namaGapoktan: 'Gapoktan Maju Bersama',
    komoditas: 'Padi',
    idAO: 'AO001',
    namaAO: 'Budi Santoso',
    status: 'POTENSIAL',
    tanggal: '2026-07-15',
    estimasiKebutuhan: 'Combine Harvester 2 unit',
    catatan: 'Gapoktan aktif, luas sawah cukup besar',
  },
  {
    idProspek: 'P002',
    idKecamatan: 'W001',
    kecamatan: 'Cikampek',
    namaGapoktan: 'Gapoktan Tani Sejahtera',
    komoditas: 'Padi',
    idAO: 'AO001',
    namaAO: 'Budi Santoso',
    status: 'SURVEY',
    tanggal: '2026-07-20',
    estimasiKebutuhan: 'Rice Transplanter 1 unit',
    catatan: '',
  },
  {
    idProspek: 'P003',
    idKecamatan: 'W004',
    kecamatan: 'Purwasari',
    namaGapoktan: 'Kelompok Tani Harapan',
    komoditas: 'Jagung',
    idAO: 'AO001',
    namaAO: 'Budi Santoso',
    status: 'DALAM_PROSPEK',
    tanggal: '2026-08-01',
    estimasiKebutuhan: 'Corn Sheller 1 unit',
    catatan: 'Perlu koordinasi dengan ketua gapoktan',
  },
  {
    idProspek: 'P004',
    idKecamatan: 'W002',
    kecamatan: 'Karawang Barat',
    namaGapoktan: 'Gapoktan Subur Makmur',
    komoditas: 'Padi',
    idAO: 'AO002',
    namaAO: 'Siti Rahayu',
    status: 'BARU',
    tanggal: '2026-08-10',
    estimasiKebutuhan: 'Traktor Roda 2, 3 unit',
    catatan: '',
  },
  {
    idProspek: 'P005',
    idKecamatan: 'W007',
    kecamatan: 'Telukjambe Timur',
    namaGapoktan: 'Gapoktan Padi Emas',
    komoditas: 'Padi',
    idAO: 'AO003',
    namaAO: 'Ahmad Fauzi',
    status: 'CLOSING',
    tanggal: '2026-06-01',
    estimasiKebutuhan: 'Combine Harvester 3 unit',
    catatan: 'Sudah deal, tunggu pengiriman',
  },
]

// ─────────────────────────────────────────
// MOCK: Survey
// ─────────────────────────────────────────
export const MOCK_SURVEY: DataSurvey[] = [
  {
    idSurvey: 'S001',
    idProspek: 'P001',
    namaGapoktan: 'Gapoktan Maju Bersama',
    jumlahAnggota: 85,
    luasSawah: 320,
    jenisAlsintan: 'Combine Harvester',
    estimasiHarga: 850000000,
    foto: [],
    latitude: -6.4123,
    longitude: 107.4567,
    accuracy: 5,
    catatan: 'Lahan datar, akses bagus',
    idAO: 'AO001',
    namaAO: 'Budi Santoso',
    timestamp: '2026-07-16T09:30:00Z',
    status: 'SURVEY_SELESAI',
  },
]

// ─────────────────────────────────────────
// MOCK: Dashboard KPI
// TODO: Konfirmasi sumber data Outstanding Kredit — NC9
// TODO: Konfirmasi definisi Conversion Rate — NC10
// ─────────────────────────────────────────
export const MOCK_DASHBOARD_KPI: DashboardKPI = {
  outstandingKredit: undefined, // NC9: sumber belum dikonfirmasi
  prospekBaru: 8,
  aoAktif: 3,
  conversionRate: undefined,    // NC10: definisi belum dikonfirmasi
  totalKecamatan: 8,
  totalGapoktan: 229,
  totalLuasLahan: 18090,        // Hektar
}
