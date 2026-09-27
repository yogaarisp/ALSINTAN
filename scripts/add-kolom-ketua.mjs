/**
 * add-kolom-ketua.mjs — tambah kolom NAMA_KETUA ke sheet DATA_SURVEY
 * ======================================================================
 * Survey kini menyimpan nama ketua poktan yang dipilih (auto-fill dari
 * Master Poktan 2026). Kolom ditambahkan di posisi TERAKHIR supaya kolom
 * lama (A-P) tidak bergeser dan data survey yang sudah tersimpan tetap aman.
 *
 * Idempotent: kalau kolom sudah ada, script keluar tanpa mengubah apa pun.
 *
 * Jalankan:  node scripts/add-kolom-ketua.mjs --dry-run   (lihat rencana)
 *            node scripts/add-kolom-ketua.mjs             (eksekusi)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDotEnv, request, getAuthHeader } from './xlsx-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

for (const f of ['.env.local', '.env']) {
  const p = path.join(ROOT, f);
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    }
  }
}

const DRY = process.argv.includes('--dry-run');
const SS_ID = process.env.SIAP_SPREADSHEET_ID;
const SHEET = 'DATA_SURVEY';
const NEW_COL = 'NAMA_KETUA';

const sa = JSON.parse(fs.readFileSync(path.resolve(ROOT, process.env.GOOGLE_SERVICE_ACCOUNT_JSON), 'utf8'));
const H = await getAuthHeader(sa);
const api = (p) => `https://sheets.googleapis.com/v4/spreadsheets/${SS_ID}${p}`;
const range = (a1) => `/values/${encodeURIComponent(SHEET)}!${a1}`;

console.log(`Spreadsheet : ${SS_ID}`);
console.log(`Sheet       : ${SHEET}`);
console.log(`Mode        : ${DRY ? 'DRY-RUN (tidak ada yang ditulis)' : 'EKSEKUSI'}`);
console.log('');

// 1. Header sekarang
const meta = await request('GET', api('?fields=sheets.properties'), { headers: H });
const props = meta.json.sheets.map((s) => s.properties).find((p) => p.title === SHEET);
if (!props) {
  console.error(`Sheet "${SHEET}" tidak ditemukan di spreadsheet ini.`);
  process.exit(1);
}
console.log(`Sheet ID    : ${props.sheetId} | baris=${props.gridProperties?.rowCount} kolom=${props.gridProperties?.columnCount}`);

const head = (await request('GET', api(range('A1:Z1')), { headers: H })).json.values?.[0] || [];
console.log(`Header sekarang (${head.length} kolom):`);
head.forEach((h, i) => console.log(`  ${String.fromCharCode(65 + i)} = ${h}`));

if (head.includes(NEW_COL)) {
  console.log(`\nKolom ${NEW_COL} sudah ada — tidak ada perubahan.`);
  process.exit(0);
}

// 2. Jumlah baris terpakai (untuk mengisi header di baris 1 saja)
const all = (await request('GET', api(range(`A1:${String.fromCharCode(64 + head.length)}${props.gridProperties?.rowCount || 1000}`)), { headers: H })).json.values || [];
const lastRow = all.length;
console.log(`\nBaris terpakai: ${lastRow} (termasuk header)`);

const targetCol = head.length + 1; // 1-based
const colLetter = String.fromCharCode(64 + targetCol);
console.log(`\nRencana:`);
console.log(`  1. Tambah 1 kolom di posisi ${colLetter} (setelah ${String.fromCharCode(64 + head.length)})`);
console.log(`  2. Tulis "${NEW_COL}" di ${SHEET}!${colLetter}1`);
console.log(`  3. Kolom A-${String.fromCharCode(64 + head.length)} tidak tersentuh`);

if (DRY) {
  console.log('\nDry-run selesai. Jalankan tanpa --dry-run untuk mengeksekusi.');
  process.exit(0);
}

// 3. Tambah kolom fisik
await request('POST', api(':batchUpdate'), {
  headers: H,
  body: {
    requests: [
      {
        insertDimension: {
          range: {
            sheetId: props.sheetId,
            dimension: 'COLUMNS',
            startIndex: head.length,
            endIndex: head.length + 1,
          },
          inheritFromBefore: false,
        },
      },
    ],
  },
});
console.log(`\nKolom ${colLetter} dibuat.`);

// 4. Tulis header
await request('PUT', api(`${range(colLetter + '1')}?valueInputOption=RAW`), {
  headers: H,
  body: { values: [[NEW_COL]] },
});
console.log(`Header "${NEW_COL}" ditulis ke ${colLetter}1.`);

// 5. Verifikasi
const after = (await request('GET', api(range('A1:Z1')), { headers: H })).json.values?.[0] || [];
console.log(`\nHeader setelah perubahan (${after.length} kolom):`);
after.forEach((h, i) => console.log(`  ${String.fromCharCode(65 + i)} = ${h}`));

const ok = after.length === head.length + 1 && after[head.length] === NEW_COL;
const dataRows = all.slice(1);
console.log(`\nBaris data yang harus utuh: ${dataRows.length}`);
console.log(ok ? '\nOK — kolom baru siap dipakai Code.gs.' : '\nPERHATIAN: hasil tidak sesuai harapan, periksa manual.');
