// ============================================================
// SIAP ALSINTAN — API Service: Master Poktan
// ============================================================
// Sumber data: spreadsheet "Poktan 2026" — 16 tab (satu per kecamatan),
// total 3.242 poktan. Dibaca read-only lewat action GAS `getPoktan`.
// Berbeda dengan DATA_PROSPEK: ini master acuan resmi, bukan hasil kerja Analis.
//
// CATATAN: daftar ini berisi POKTAN (kelompok tani), bukan gapoktan. Satu baris
// = satu poktan dengan satu ketua. Field `namaGapoktan` pada payload survey tetap
// demi kompatibilitas dengan baris lama, tapi isinya nama poktan.
//
// Ada dua jalur baca:
//   1. `getPoktan`  — action khusus, hasil sudah dibersihkan + di-cache di GAS.
//   2. `getSourceData` — action lama yang sudah ada di deployment sebelum
//      `getPoktan` ter-deploy. Dipakai otomatis sebagai cadangan kalau
//      `getPoktan` belum tersedia, supaya form tetap bisa dipakai tanpa deploy.
//      Kelemahannya: sel masih mentah (harus dibersihkan di sisi klien) dan
//      tidak di-cache di GAS, jadi lebih lambat (~3 detik per kecamatan).
// ============================================================

import type { MasterPoktan, PoktanFilter, PoktanResponse, SourceData } from '@/lib/types'
import { getLocalCache, setLocalCache } from '@/lib/utils/cache'
import { gasGet, isGasConfigured } from './gas'

const USE_MOCK = !isGasConfigured()

function cacheKey(filter?: PoktanFilter): string {
  return `poktan_${(filter?.kecamatan || 'all').toLowerCase()}`
}

const EMPTY: PoktanResponse = { items: [], total: 0, page: 1, limit: 0, totalPages: 1, kecamatan: [] }

// Batas atas HARD_LIMIT: tab terbesar (Kaligesing) 299 baris, jadi 2000 aman
// dan seluruh tab selalu muat dalam satu halaman.
const HARD_LIMIT = 2000

/**
 * Daftar poktan. Tanpa `kecamatan` akan memuat seluruh 3.242 baris —
 * untuk dropdown, lebih baik selalu pass `kecamatan` (maks. ±311 baris per tab).
 */
export async function getPoktan(filter?: PoktanFilter): Promise<PoktanResponse> {
  if (USE_MOCK) return EMPTY

  try {
    const res = await gasGet<PoktanResponse>('getPoktan', {
      kecamatan: filter?.kecamatan,
      q: filter?.q,
      page: filter?.page,
      limit: filter?.limit,
    })
    if (res && res.items) setLocalCache(cacheKey(filter), res)
    return res
  } catch (err) {
    const cached = getLocalCache<PoktanResponse>(cacheKey(filter))
    if (cached) return cached

    // Jalur 2: `getPoktan` belum ada di deployment aktif (deployment lama).
    // getSourceData hanya bisa dibaca per-kecamatan, jadi tanpa filter
    // kecamatan tidak ada jalur cadangan.
    if (isActionUnknown(err) && filter?.kecamatan) {
      const viaSumber = await getPoktanViaSourceData(filter)
      setLocalCache(cacheKey(filter), viaSumber)
      return viaSumber
    }
    throw err
  }
}

export async function getPoktanById(idPoktan: string): Promise<MasterPoktan | null> {
  if (USE_MOCK) return null
  try {
    return await gasGet<MasterPoktan | null>('getPoktan', { idPoktan })
  } catch (err) {
    if (!isActionUnknown(err)) throw err
    // Jalur 2: cari manual di seluruh kecamatan (16 request, hanya dipakai
    // untuk link langsung / tidak ada filter kecamatan di form).
    const all = await getPoktan({ limit: HARD_LIMIT }).catch(() => EMPTY)
    return all.items.find((p) => p.idPoktan === idPoktan) ?? null
  }
}

// ============================================================
// Jalur 2 — baca lewat getSourceData + bersihkan di sisi klien
// ============================================================

// Sel "Nama Poktan" di spreadsheet tidak bersih: nama poktan ada di awal sel,
// disusul label UI eksportir ("Tambah Anggota", "Komoditas yang diusahakan",
// "Ubah", "Hapus", ...) setelah rentetan spasi panjang. Ambil segmen pertama saja.
function namaPoktanDari(v: unknown): string {
  const segments = String(v ?? '').split(/[\r\n]+|\s{2,}/)
  for (const s of segments) {
    const t = s.trim()
    if (t) return t
  }
  return ''
}

function teks(v: unknown): string {
  return String(v ?? '').trim()
}

function angka(v: unknown): number | null {
  const s = teks(v)
  if (!s) return null
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

function bulat(v: unknown): number {
  const n = angka(v)
  return n === null ? 0 : Math.round(n)
}

function kePoktan(row: unknown[], header: string[], kecamatan: string): MasterPoktan | null {
  const col = (nama: string) => {
    const i = header.findIndex((h) => h.trim().toLowerCase() === nama.toLowerCase())
    return i >= 0 ? row[i] : undefined
  }
  const namaPoktan = namaPoktanDari(col('Nama Poktan'))
  const idPoktan = String(bulat(col('ID Poktan')) || '').trim()
  // Baris tanpa nama atau tanpa ID bukan data poktan — lewati (mis. baris total)
  if (!namaPoktan || !idPoktan) return null
  return {
    idPoktan,
    namaPoktan,
    jumlahAnggota: bulat(col('Jumlah Anggota')),
    desa: teks(col('Nama Desa')),
    ketua: teks(col('Nama Ketua')),
    alamat: teks(col('Alamat Sekretariat')),
    kecamatan,
  }
}

function isActionUnknown(err: unknown): boolean {
  return err instanceof Error && /unknown action/i.test(err.message)
}

/**
 * Cadangan: baca satu tab Poktan 2026 lewat `getSourceData`.
 *
 * `getSheetByName()` di Apps Script tidak membedakan huruf besar/kecil, jadi
 * nama kecamatan dari `MASTER_WILAYAH` ("PITURUH") bisa langsung dipakai
 * walaupun nama tabnya Title Case ("Pituruh").
 */
async function getPoktanViaSourceData(filter: PoktanFilter): Promise<PoktanResponse> {
  const data = await gasGet<SourceData>('getSourceData', {
    key: 'poktan',
    tab: filter.kecamatan,
    page: 1,
    limit: HARD_LIMIT,
  })

  const header = data.header ?? []
  const page = data.page || 1
  let items = (data.rows ?? [])
    .map((row) => kePoktan(row, header, capWords(filter.kecamatan!)))
    .filter((p): p is MasterPoktan => p !== null)

  // getSourceData tidak punya `kecamatan` di payload, jadi pencarian & paging
  // harus dikerjakan di sini.
  const q = (filter.q ?? '').trim().toLowerCase()
  if (q) {
    items = items.filter(
      (p) =>
        p.namaPoktan.toLowerCase().includes(q) ||
        p.desa.toLowerCase().includes(q) ||
        p.ketua.toLowerCase().includes(q) ||
        p.alamat.toLowerCase().includes(q) ||
        p.idPoktan.includes(q),
    )
  }
  items.sort((a, b) => a.namaPoktan.localeCompare(b.namaPoktan, 'id'))

  const total = items.length
  const limit = filter.limit && filter.limit > 0 ? filter.limit : HARD_LIMIT
  const start = ((filter.page && filter.page > 0 ? filter.page : page) - 1) * limit

  return {
    items: items.slice(start, start + limit),
    total,
    page: start / limit + 1,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    kecamatan: [filter.kecamatan!],
  }
}

// "PITURUH" -> "Pituruh" supaya nilai `kecamatan` pada tiap poktan enak dibaca
// di detail card.
function capWords(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase())
    .trim()
}
