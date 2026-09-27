/**
 * pull-folder-xlsx.mjs — unduh semua file .xlsx dari sebuah folder Drive
 * ke folder lokal. Dipakai sebelum mengonversi .xlsx -> Google Spreadsheet.
 *
 * Pakai: node scripts/pull-folder-xlsx.mjs <FOLDER_ID> [folder_tujuan_lokal]
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { loadDotEnv, request, getAuthHeader } from './xlsx-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
loadDotEnv(path.join(ROOT, '.env.local'));

const FOLDER_ID = (process.argv[2] || '').trim();
const OUT_DIR = path.resolve(ROOT, process.argv[3] || 'excel/import');

if (!FOLDER_ID) {
  console.error('ERROR: Folder ID wajib.');
  console.error('Contoh: node scripts/pull-folder-xlsx.mjs 1SSz9RlEF4AGuspbiRfy55xsxS3xQS_Dy excel/import');
  process.exit(1);
}

const DRIVE = 'https://www.googleapis.com/drive/v3';
const SHEET_MIME = 'application/vnd.google-apps.spreadsheet';
const sa = JSON.parse(fs.readFileSync(path.resolve(ROOT, process.env.GOOGLE_SERVICE_ACCOUNT_JSON), 'utf8'));
const H = await getAuthHeader(sa);

/**
 * Download binary. Helper `request` dari xlsx-lib mengubah body ke string UTF-8
 * sehingga file .xlsx rusak — jadi kita ambil chunk-nya langsung.
 */
function download(url, headers) {
  return new Promise((resolve, reject) => {
    https
      .request(url, { method: 'GET', headers }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return resolve(download(new URL(res.headers.location, url).toString(), headers));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error('HTTP ' + res.statusCode));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject)
      .end();
  });
}

console.log('');
console.log('=== TARIK FILE XLSX DARI FOLDER ===');
console.log('Folder Drive :', FOLDER_ID);
console.log('Tujuan lokal :', path.relative(ROOT, OUT_DIR));
console.log('');

fs.mkdirSync(OUT_DIR, { recursive: true });

const q = `'${FOLDER_ID}' in parents and trashed=false`;
const files = (
  await request(
    'GET',
    `${DRIVE}/files?q=${encodeURIComponent(q)}&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=${encodeURIComponent('files(id,name,mimeType,size,modifiedTime)')}`,
    { headers: H },
  )
).json.files || [];

const xlsx = files.filter((f) => f.name.toLowerCase().endsWith('.xlsx'));
const already = files.filter((f) => f.mimeType === SHEET_MIME);

if (already.length) {
  console.log(`Catatan: folder sudah berisi ${already.length} Google Spreadsheet:`);
  for (const a of already) console.log('  - ' + a.name);
  console.log('');
}

if (xlsx.length === 0) {
  console.log('Tidak ada file .xlsx di folder ini.');
  process.exit(0);
}

let ok = 0;
let fail = 0;
for (const f of xlsx) {
  const dest = path.join(OUT_DIR, f.name);
  try {
    const buf = await download(`${DRIVE}/files/${f.id}?alt=media`, H);
    // sanity check: file xlsx itu ZIP, harus diawali "PK\x03\x04"
    if (buf.length < 4 || buf[0] !== 0x50 || buf[1] !== 0x4b) {
      throw new Error('bukan file xlsx yang valid (header: ' + buf.subarray(0, 8).toString('hex') + ')');
    }
    fs.writeFileSync(dest, buf);
    const kb = (buf.length / 1024).toFixed(1);
    console.log(`  OK  ${f.name.padEnd(56)} ${kb.padStart(8)} KB`);
    ok++;
  } catch (e) {
    console.log(`  ERR ${f.name} -> ${e.message}`);
    fail++;
  }
}

console.log('');
console.log(`Berhasil: ${ok}  Gagal: ${fail}`);
console.log('');
console.log('Langkah berikutnya — konversi jadi Google Spreadsheet:');
console.log(`  node scripts/sync-excel-folder.js --dir=${path.relative(ROOT, OUT_DIR).replace(/\\/g, '/')}`);
console.log('');
console.log('Pastikan SIAP_DRIVE_FOLDER_ID di .env.local = ' + FOLDER_ID);
process.exit(fail > 0 ? 1 : 0);
