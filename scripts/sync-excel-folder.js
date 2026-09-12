/**
 * sync-excel-folder.js — SIAP ALSINTAN
 * Salin SEMUA file .xlsx di folder `excel/` menjadi spreadsheet Google terpisah
 * (1 file xlsx = 1 spreadsheet; sheet asli = tab, nama & nilai disalin apa adanya,
 * termasuk konversi tanggal). LBS  PER DESA fIX.xlsx dilewati (sudah ada versi
 * bersihnya di spreadsheet baseline).
 *
 * Karena service account tidak punya kuota Drive, semua spreadsheet dibuat
 * DI DALAM folder Drive milikmu yang di-share ke SA (storage dihitung ke akunmu).
 *
 * Usage:
 *   node scripts/sync-excel-folder.js --scan          # inventaris isi excel/ saja
 *   node scripts/sync-excel-folder.js                 # buat/update spreadsheet per file
 *
 * Env (.env.local):
 *   GOOGLE_SERVICE_ACCOUNT_JSON   path JSON service account (wajib)
 *   SIAP_DRIVE_FOLDER_ID          ID folder Drive tujuan (wajib untuk sync)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadDotEnv,
  request,
  getAuthHeader,
  readZip,
  parseWorkbook,
  parseSharedStrings,
  parseStyles,
  parseSheetXml,
} from './xlsx-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCAN = process.argv.includes('--scan');
const SKIP_FILES = ['LBS  PER DESA fIX.xlsx'];
const EXCEL_DIR = path.join(ROOT, 'excel');

loadDotEnv(path.join(ROOT, '.env.local'));
loadDotEnv(path.join(ROOT, '.env'));

const SA_FILE = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const FOLDER_ID = process.env.SIAP_DRIVE_FOLDER_ID || '';
const DRIVE = 'https://www.googleapis.com/drive/v3';
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';

if (!SA_FILE) {
  console.error('ERROR: GOOGLE_SERVICE_ACCOUNT_JSON belum diset di .env.local');
  process.exit(1);
}

const xlsxFiles = fs
  .readdirSync(EXCEL_DIR)
  .filter((f) => f.toLowerCase().endsWith('.xlsx') && !SKIP_FILES.includes(f))
  .sort();

// ---------------------------------------------------------------- parsing per file
function loadWorkbook(file) {
  const files = readZip(fs.readFileSync(file));
  const shared = parseSharedStrings(files);
  const styles = parseStyles(files);
  const sheets = parseWorkbook(files).map((s) => {
    const rows = s.state === 'visible' ? parseSheetXml(files[s.file].toString('utf8'), { shared, styles }) : [];
    let maxCol = 0;
    let nonEmpty = 0;
    for (const { cells } of rows) {
      for (const [col, v] of Object.entries(cells)) {
        maxCol = Math.max(maxCol, Number(col) + 1);
        if (String(v).trim() !== '') nonEmpty++;
      }
    }
    return { ...s, rows, maxCol, nonEmpty };
  });
  return sheets;
}

function rowsToValues(rows, maxCol) {
  const values = rows.map(({ cells }) => {
    const arr = new Array(maxCol).fill('');
    for (const [col, v] of Object.entries(cells)) arr[Number(col)] = v;
    while (arr.length && arr[arr.length - 1] === '') arr.pop();
    return arr;
  });
  // pangkas baris kosong di ekor (sisa range formatting)
  while (values.length && values[values.length - 1].every((v) => v === '')) values.pop();
  return values;
}

function sanitizeTitle(name, taken) {
  let t = String(name).replace(/[\\/?*[\]:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
  if (!t) t = 'Sheet';
  let base = t;
  let i = 2;
  while (taken.has(t)) t = `${base.slice(0, 96)}_${i++}`;
  taken.add(t);
  return t;
}

// ---------------------------------------------------------------- scan
if (SCAN) {
  console.log('=== Inventaris folder excel/ ===\n');
  for (const f of xlsxFiles) {
    const sheets = loadWorkbook(path.join(EXCEL_DIR, f));
    console.log(`FILE: ${f}`);
    const visible = sheets.filter((s) => s.state === 'visible' && s.nonEmpty > 0);
    const hidden = sheets.filter((s) => s.state !== 'visible');
    const empty = sheets.filter((s) => s.state === 'visible' && s.nonEmpty === 0);
    for (const s of visible) {
      const preview = rowsToValues(s.rows.slice(0, 2), s.maxCol)
        .map((r) => r.join(' | ').slice(0, 110))
        .join('\n        ');
      console.log(`  - ${s.name}: ${s.rows.length} baris x ${s.maxCol} kolom (${s.nonEmpty} sel terisi)`);
      console.log(`        ${preview}`);
    }
    if (empty.length) console.log(`  (kosong, dilewati: ${empty.map((s) => s.name).join(', ')})`);
    if (hidden.length) console.log(`  (hidden, dilewati: ${hidden.map((s) => s.name).join(', ')})`);
    console.log('');
  }
  process.exit(0);
}

// ---------------------------------------------------------------- sync
async function main() {
  if (!FOLDER_ID) {
    console.error(
      'SIAP_DRIVE_FOLDER_ID belum diset di .env.local.\n' +
        `Langkah: buat folder di Google Drive -> share Editor ke service account -> isi ID folder (bagian /folders/<ID>) ke .env.local`,
    );
    process.exit(1);
  }

  const sa = JSON.parse(fs.readFileSync(path.join(ROOT, SA_FILE), 'utf8'));
  console.log(`Service account: ${sa.client_email}`);
  console.log(`Folder tujuan  : ${FOLDER_ID}\n`);
  const auth = await getAuthHeader(sa);

  // daftar spreadsheet yang sudah ada di folder + spreadsheet "Untitled" yang bisa diadopsi
  const existing = (
    await request(
      'GET',
      `${DRIVE}/files?q=${encodeURIComponent(`'${FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`)}&pageSize=100&fields=${encodeURIComponent('files(id,name)')}`,
      { headers: auth },
    )
  ).json.files || [];
  const byName = new Map(existing.map((f) => [f.name, f.id]));
  const untitled = existing.filter((f) => /^untitled/i.test(f.name)).map((f) => f.id);

  let created = 0;
  let reused = 0;
  let adopted = 0;
  const results = [];

  for (const f of xlsxFiles) {
    const ssName = f.replace(/\.xlsx$/i, '');
    let ssId = byName.get(ssName);
    if (ssId) {
      reused++;
      console.log(`[reuse] ${ssName} -> ${ssId}`);
    } else if (untitled.length) {
      // adopsi spreadsheet kosong buatan user di folder, lalu rename
      const orphanId = untitled.shift();
      await request('PATCH', `${DRIVE}/files/${orphanId}?fields=name`, {
        headers: auth,
        body: { name: ssName },
      });
      byName.set(ssName, orphanId);
      ssId = orphanId;
      adopted++;
      console.log(`[adopsi] "${ssName}" <- spreadsheet kosong ${orphanId} (di-rename)`);
    } else {
      try {
        const resp = (
          await request('POST', `${DRIVE}/files?fields=id,name`, {
            headers: auth,
            body: { name: ssName, mimeType: 'application/vnd.google-apps.spreadsheet', parents: [FOLDER_ID] },
          })
        ).json;
        ssId = resp.id;
        created++;
        console.log(`[BUAT ] ${ssName} -> ${ssId}`);
      } catch (e) {
        console.error(`GAGAL menyiapkan "${ssName}":\n${e.message}`);
        console.error(
          '\nService account tidak punya kuota Drive, jadi spreadsheet kosong harus dibuat manual.\n' +
            `Buat spreadsheet kosong di dalam folder (New > Google Sheets), TANPA perlu rename,\n` +
            'lalu jalankan ulang: node scripts/sync-excel-folder.js',
        );
        process.exit(1);
      }
    }

    const sheets = loadWorkbook(path.join(EXCEL_DIR, f));
    const visible = sheets.filter((s) => s.state === 'visible' && s.nonEmpty > 0);
    const hidden = sheets.filter((s) => s.state !== 'visible');
    const empty = sheets.filter((s) => s.state === 'visible' && s.nonEmpty === 0);

    const meta = (await request('GET', `${SHEETS}/${ssId}`, { headers: auth })).json;
    const have = new Set(meta.sheets.map((s) => s.properties.title));
    const taken = new Set(have);
    const plan = visible.map((s) => ({ ...s, tab: sanitizeTitle(s.name, taken) }));

    const missing = plan.filter((p) => !have.has(p.tab));
    if (missing.length) {
      await request('POST', `${SHEETS}/${ssId}:batchUpdate`, {
        headers: auth,
        body: { requests: missing.map((p) => ({ addSheet: { properties: { title: p.tab } } })) },
      });
    }

    let wrote = 0;
    for (const p of plan) {
      const values = rowsToValues(p.rows, p.maxCol);
      await request('POST', `${SHEETS}/${ssId}/values/${encodeURIComponent(p.tab)}!A1:Z100000:clear`, { headers: auth });
      await request('PUT', `${SHEETS}/${ssId}/values/${encodeURIComponent(p.tab)}!A1?valueInputOption=RAW`, {
        headers: auth,
        body: { values },
      });
      wrote++;
    }
    const skipped =
      [...empty.map((s) => s.name), ...hidden.map((s) => s.name)].join(', ') || '-';
    console.log(`        tabs=${plan.length} (ditulis ${wrote}), dilewati: ${skipped}`);
    results.push({ name: ssName, ssId, tabs: plan.length });
  }

  console.log(`\n=== SELESAI: ${created} dibuat, ${adopted} diadopsi, ${reused} dipakai ulang ===`);
  for (const r of results) {
    console.log(`- ${r.name}: https://docs.google.com/spreadsheets/d/${r.ssId}/edit`);
  }
}

main().catch((e) => {
  console.error('\nGAGAL: ' + (e && e.message ? e.message : e));
  process.exit(1);
});
