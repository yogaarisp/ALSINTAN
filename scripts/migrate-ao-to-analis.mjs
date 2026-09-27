/**
 * migrate-ao-to-analis.mjs — rename penamaan AO menjadi Analis di Google Spreadsheet.
 *
 * Yang dilakukan:
 *   1. Sheet `MASTER_AO`  -> `MASTER_ANALIS`   (rename, data tetap utuh)
 *   2. Header kolom lama -> baru di semua sheet backend:
 *        ID_AO   -> ID_ANALIS
 *        NAMA_AO -> NAMA_ANALIS
 *   3. Nilai ID lama `AO001` -> `AN001` (dan seterusnya) di kolom ID_ANALIS
 *   4. Nilai ROLE `AO` -> `ANALIS` di sheet USERS
 *
 * Idempoten: dijalankan dua kali tidak merusak apa pun (cek header & suffix dulu).
 * Jalankan `npm run gas:backup` sebelum script ini.
 *
 * Pakai: node scripts/migrate-ao-to-analis.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDotEnv, request, getAuthHeader } from './xlsx-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
loadDotEnv(path.join(ROOT, '.env.local'));
loadDotEnv(path.join(ROOT, '.env'));

const DRY_RUN = process.argv.includes('--dry-run');

const SHEET_OLD = 'MASTER_AO';
const SHEET_NEW = 'MASTER_ANALIS';

const HEADER_RENAME = {
  ID_AO: 'ID_ANALIS',
  NAMA_AO: 'NAMA_ANALIS',
};
const SHEETS = ['DATA_PROSPEK', 'DATA_SURVEY', 'USERS'];

const sa = JSON.parse(fs.readFileSync(path.resolve(ROOT, process.env.GOOGLE_SERVICE_ACCOUNT_JSON), 'utf8'));
const SS_ID = process.env.SIAP_SPREADSHEET_ID;
const H = await getAuthHeader(sa);
const api = (p) => `https://sheets.googleapis.com/v4/spreadsheets/${SS_ID}${p}`;

const colLetter = (idx) => String.fromCharCode(65 + idx);
const log = (...a) => console.log(...(DRY_RUN ? ['[DRY-RUN]', ...a] : a));

// ── 1. Rename sheet MASTER_AO -> MASTER_ANALIS ───────────────────────────────
const meta = (await request('GET', api('?fields=sheets.properties'), { headers: H })).json;
const titles = meta.sheets.map((s) => s.properties.title);

if (titles.includes(SHEET_NEW)) {
  log(`Sheet ${SHEET_NEW} sudah ada — lewati rename.`);
} else if (titles.includes(SHEET_OLD)) {
  const sheetId = meta.sheets.find((s) => s.properties.title === SHEET_OLD).properties.sheetId;
  if (!DRY_RUN) {
    await request('POST', api(':batchUpdate'), {
      headers: H,
      body: { requests: [{ updateSheetProperties: { properties: { sheetId, title: SHEET_NEW }, fields: 'title' } }] },
    });
  }
  log(`Sheet ${SHEET_OLD} -> ${SHEET_NEW}`);
} else {
  log(`WARN: sheet ${SHEET_OLD} maupun ${SHEET_NEW} tidak ditemukan — buat manual.`);
}

// ── 2. Rename header kolom + rapikan nilai ID/ROLE ──────────────────────────
for (const title of [SHEET_NEW, ...SHEETS]) {
  if (!titles.includes(title) && title !== SHEET_NEW) {
    log(`Skip ${title} (tidak ada).`);
    continue;
  }
  const res = await request('GET', api(`/values/${encodeURIComponent(title)}!A1:Z1`), { headers: H });
  const header = (res.json.values && res.json.values[0]) || [];
  if (header.length === 0) {
    log(`Skip ${title} (header kosong).`);
    continue;
  }

  const changes = [];
  header.forEach((h, i) => {
    const key = String(h).trim().toUpperCase();
    if (HEADER_RENAME[key]) changes.push({ col: colLetter(i), from: key, to: HEADER_RENAME[key] });
  });

  if (!changes.length) {
    log(`${title}: header sudah konsisten.`);
    continue;
  }
  if (!DRY_RUN) {
    await request(
      'PUT',
      api(`/values/${encodeURIComponent(title)}!A1?valueInputOption=RAW`),
      { headers: H, body: { values: [header.map((h) => HEADER_RENAME[String(h).trim().toUpperCase()] || h)] } },
    );
  }
  log(`${title}: ${changes.map((c) => `${c.from} -> ${c.to}`).join(', ')}`);
}

// ── 3. Nilai ID: AO001 -> AN001 ─────────────────────────────────────────────
const COLUMN_ID = {
  [SHEET_NEW]: 'A',
  DATA_PROSPEK: 'F',
  DATA_SURVEY: 'L',
  USERS: 'D',
};
const renIds = (v) => String(v).trim().replace(/^AO(\d+)$/, 'AN$1');

for (const [title, col] of Object.entries(COLUMN_ID)) {
  const res = await request('GET', api(`/values/${encodeURIComponent(title)}!${col}2:${col}5000`), { headers: H });
  const rows = res.json.values || [];
  const data = rows.map((r) => [renIds(r[0] ?? '')]);
  const changed = data.filter((r, i) => r[0] !== String(rows[i][0] ?? '').trim());
  if (!changed.length) {
    log(`${title}: kolom ${col} sudah tanpa prefix AO.`);
    continue;
  }
  if (!DRY_RUN) {
    await request('PUT', api(`/values/${encodeURIComponent(title)}!${col}2?valueInputOption=RAW`), {
      headers: H,
      body: { values: data },
    });
  }
  log(`${title}: ${changed.length} ID diperbarui (AOxxx -> ANxxx)`);
}

// ── 4. Sheet USERS: ROLE AO -> ANALIS ───────────────────────────────────────
{
  const res = await request('GET', api('/values/USERS!C2:C5000'), { headers: H });
  const rows = res.json.values || [];
  const data = rows.map((r) => {
    const v = String(r[0] ?? '').trim().toUpperCase();
    return [v === 'AO' ? 'ANALIS' : r[0] ?? ''];
  });
  const changed = data.filter((r, i) => r[0] !== rows[i][0]);
  if (!changed.length) {
    log('USERS: kolom ROLE sudah tanpa nilai AO.');
  } else {
    if (!DRY_RUN) {
      await request('PUT', api('/values/USERS!C2?valueInputOption=RAW'), { headers: H, body: { values: data } });
    }
    log(`USERS: ${changed.length} ROLE AO -> ANALIS`);
  }
}

log(DRY_RUN ? 'DRY-RUN selesai — tidak ada data yang diubah.' : 'Migrasi AO -> Analis selesai.');
