/**
 * setup-auth-users.mjs — buat sheet USERS (untuk login Google) + seed akun awal.
 * Kolom: EMAIL | NAMA | ROLE | ID_AO | STATUS
 * Role valid: ADMIN | AO | MANAJEMEN
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDotEnv, request, getAuthHeader } from './xlsx-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
loadDotEnv(path.join(ROOT, '.env.local'));
loadDotEnv(path.join(ROOT, '.env'));

const sa = JSON.parse(fs.readFileSync(path.resolve(ROOT, process.env.GOOGLE_SERVICE_ACCOUNT_JSON), 'utf8'));
const SS_ID = process.env.SIAP_SPREADSHEET_ID;
const H = await getAuthHeader(sa);
const api = (p) => `https://sheets.googleapis.com/v4/spreadsheets/${SS_ID}${p}`;

const meta = (await request('GET', api('?fields=sheets.properties.title'), { headers: H })).json;
const titles = meta.sheets.map((s) => s.properties.title);
if (!titles.includes('USERS')) {
  await request('POST', api(':batchUpdate'), {
    headers: H,
    body: { requests: [{ addSheet: { properties: { title: 'USERS', gridProperties: { rowCount: 100, columnCount: 6 } } } }] },
  });
  console.log('Sheet USERS dibuat');
}

const HEADER = ['EMAIL', 'NAMA', 'ROLE', 'ID_AO', 'STATUS'];
const cur = (await request('GET', api('/values/USERS!A1:E1'), { headers: H })).json.values?.[0] || [];
if (cur.length === 0) {
  await request('PUT', api('/values/USERS!A1?valueInputOption=RAW'), {
    headers: H,
    body: { values: [HEADER] },
  });
  console.log('Header USERS ditulis');
}

const SEED = [
  ['admin@siap-alsintan.id', 'Admin SIAP', 'ADMIN', '', 'AKTIF'],
  ['budi@siap-alsintan.id', 'Budi Santoso', 'AO', 'AO001', 'AKTIF'],
  ['manager@siap-alsintan.id', 'Manager Pertanian', 'MANAJEMEN', '', 'AKTIF'],
];

const existing = (await request('GET', api('/values/USERS!A2:E1000'), { headers: H })).json.values || [];
const existingEmails = new Set(existing.map((r) => String(r[0]).toLowerCase()));
const toAdd = SEED.filter((r) => !existingEmails.has(r[0].toLowerCase()));
if (toAdd.length) {
  const startRow = 2 + existing.length;
  await request('PUT', api(`/values/USERS!A${startRow}?valueInputOption=RAW`), {
    headers: H,
    body: { values: toAdd },
  });
  console.log(`Seed ${toAdd.length} user ditambahkan`);
} else {
  console.log('Semua user seed sudah ada');
}
console.log('Sheet USERS siap. Tambah user baru cukup tambah baris di sheet ini.');
