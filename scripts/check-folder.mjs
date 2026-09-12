/**
 * check-folder.mjs — cek isi folder Google Drive ALSINTAN via service account.
 * Output: daftar file (nama, tipe, ukuran), jumlah tab untuk tiap Google Spreadsheet.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDotEnv, request, getAuthHeader } from './xlsx-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
loadDotEnv(path.join(ROOT, '.env.local'));
loadDotEnv(path.join(ROOT, '.env'));

const sa = JSON.parse(fs.readFileSync(path.join(ROOT, process.env.GOOGLE_SERVICE_ACCOUNT_JSON), 'utf8'));
const FOLDER_ID = process.env.SIAP_DRIVE_FOLDER_ID;
const auth = await getAuthHeader(sa);

const res = (
  await request(
    'GET',
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${FOLDER_ID}' in parents and trashed=false`)}&pageSize=100&orderBy=name&fields=${encodeURIComponent('files(id,name,mimeType,size,modifiedTime,owners(emailAddress))')}`,
    { headers: auth },
  )
).json;

const files = res.files || [];
console.log(`Isi folder ALSINTAN (${files.length} item):\n`);

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const SHEETS_MIME = 'application/vnd.google-apps.spreadsheet';

for (const f of files) {
  const type =
    f.mimeType === SHEETS_MIME
      ? 'GOOGLE SHEETS'
      : f.mimeType === XLSX_MIME
        ? 'XLSX mentah (belum dikonversi)'
        : f.mimeType;
  const size = f.size ? `${Math.round(Number(f.size) / 1024)} KB` : '-';
  console.log(`- ${f.name}`);
  console.log(`    tipe=${type} | ukuran=${size} | owner=${(f.owners || []).map((o) => o.emailAddress).join(',')} | id=${f.id}`);
  if (f.mimeType === SHEETS_MIME) {
    try {
      const meta = (await request('GET', `https://sheets.googleapis.com/v4/spreadsheets/${f.id}?fields=properties.title,sheets.properties.title`, { headers: auth })).json;
      console.log(`    tabs (${meta.sheets.length}): ${meta.sheets.map((s) => s.properties.title).join(', ')}`);
    } catch (e) {
      console.log(`    (gagal baca tabs: ${e.message.split('\n')[0]})`);
    }
  }
}

// sekalian: file apapun yang di-share ke SA (di luar folder)
const shared = (
  await request(
    'GET',
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`sharedWithMe=true and trashed=false`)}&pageSize=50&orderBy=createdTime desc&fields=${encodeURIComponent('files(id,name,mimeType,parents)')}`,
    { headers: auth },
  )
).json.files || [];
console.log(`\nSemua file yang di-share ke SA (${shared.length} item):`);
for (const f of shared) {
  console.log(`- ${f.name} | ${f.mimeType === SHEETS_MIME ? 'SHEETS' : f.mimeType === XLSX_MIME ? 'XLSX' : f.mimeType} | parents=${JSON.stringify(f.parents || [])} | id=${f.id}`);
}
