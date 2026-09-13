/**
 * test-survey-e2e.mjs — uji alur survey ke GAS lalu bersihkan data uji.
 * Alur: createProspek (uji) -> createSurvey -> getSurvey -> hapus baris uji.
 */
import fs from 'node:fs';
import path from 'node:path';
import axios from 'axios';
import { fileURLToPath } from 'node:url';
import { loadDotEnv, request, getAuthHeader } from './xlsx-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
loadDotEnv(path.join(ROOT, '.env.local'));
loadDotEnv(path.join(ROOT, '.env'));

const URL = process.env.VITE_GAS_API_URL;
const SS_ID = process.env.SIAP_SPREADSHEET_ID;
if (!URL || !SS_ID) {
  console.error('VITE_GAS_API_URL / SIAP_SPREADSHEET_ID belum diset');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// GAS kadang 404 sesaat di echo redirect — coba ulang maks 3x
async function withRetry(fn, n = 3) {
  let lastErr;
  for (let i = 0; i < n; i++) {
    try {
      const out = await fn();
      if (out && typeof out === 'object' && 'success' in out) return out;
    } catch (e) {
      lastErr = e;
    }
    console.log(`  percobaan ${i + 1} gagal (404 echo?), ulang...`);
    await sleep(2000);
  }
  throw lastErr || new Error('GAS gagal setelah retry');
}

const post = async (payload) => (await withRetry(() => axios.post(URL, payload, {
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  timeout: 45000,
}))).data;
const get = async (params) => (await withRetry(() => axios.get(URL, { params, timeout: 45000 }))).data;

// 1. Prospek uji
const prospek = await post({
  action: 'createProspek',
  idKecamatan: 'W001',
  namaGapoktan: 'TEST-SURVEY-E2E',
  komoditas: 'Padi Sawah',
  catatan: 'uji koneksi survey - hapus otomatis',
});
console.log('createProspek:', JSON.stringify(prospek));
if (!prospek.success) process.exit(1);

// 2. Survey uji (tanpa GPS, tanpa idAO -> fallback AO milik prospek)
const survey = await post({
  action: 'createSurvey',
  idProspek: prospek.data.idProspek,
  namaGapoktan: 'TEST-SURVEY-E2E',
  jumlahAnggota: 42,
  luasSawah: 12.5,
  jenisAlsintan: 'Combine Harvester',
  estimasiHarga: 350000000,
  catatan: 'uji koneksi survey - hapus otomatis',
});
console.log('createSurvey:', JSON.stringify(survey));
if (!survey.success) process.exit(1);

// 3. Baca balik
const list = await get({ action: 'getSurvey', limit: 10 });
console.log('getSurvey total:', list.data.total, '| item pertama:', list.data.items[0] && list.data.items[0].idSurvey);

// 4. Cleanup baris uji di DATA_PROSPEK + DATA_SURVEY
const sa = JSON.parse(fs.readFileSync(path.resolve(ROOT, process.env.GOOGLE_SERVICE_ACCOUNT_JSON), 'utf8'));
const H = await getAuthHeader(sa);
const api = (p) => `https://sheets.googleapis.com/v4/spreadsheets/${SS_ID}${p}`;
const meta = (await request('GET', api('?fields=sheets.properties'), { headers: H })).json;
const sheetId = (title) => meta.sheets.find((s) => s.properties.title === title).properties.sheetId;

const requests = [];
for (const [title, colIdx, marker] of [['DATA_PROSPEK', 3, 'TEST-SURVEY-E2E'], ['DATA_SURVEY', 2, 'TEST-SURVEY-E2E']]) {
  const rows = (await request('GET', api(`/values/${encodeURIComponent(title)}!A1:Z1000`), { headers: H })).json.values || [];
  rows.forEach((r, i) => {
    if (i > 0 && String(r[colIdx] || '').includes(marker)) {
      requests.push({ deleteDimension: { range: { sheetId: sheetId(title), dimension: 'ROWS', startIndex: i, endIndex: i + 1 } } });
    }
  });
}
if (requests.length) {
  requests.reverse(); // hapus dari bawah supaya index tidak geser
  await request('POST', api(':batchUpdate'), { headers: H, body: { requests } });
}
console.log(`Cleanup: ${requests.length} baris uji dihapus`);
