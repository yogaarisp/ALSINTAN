/**
 * inspect-folder.mjs — cek apakah service account bisa akses sebuah folder Drive
 * dan apa isinya. Dipakai untuk verifikasi folder baru SIAP ALSINTAN.
 *
 * Pakai: node scripts/inspect-folder.mjs <FOLDER_ID>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDotEnv, request, getAuthHeader } from './xlsx-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
loadDotEnv(path.join(ROOT, '.env.local'));
loadDotEnv(path.join(ROOT, '.env'));

const FOLDER_ID = (process.argv[2] || process.env.SIAP_DRIVE_FOLDER_ID || '').replace(/^\D*/, '');
const DRIVE = 'https://www.googleapis.com/drive/v3';
const SHEET_MIME = 'application/vnd.google-apps.spreadsheet';

if (!FOLDER_ID) {
  console.error('ERROR:Folder ID wajib. Contoh: node scripts/inspect-folder.mjs 1SSz9RlEF4AGuspbiRfy55xsxS3xQS_Dy');
  process.exit(1);
}

const sa = JSON.parse(fs.readFileSync(path.resolve(ROOT, process.env.GOOGLE_SERVICE_ACCOUNT_JSON), 'utf8'));
const H = await getAuthHeader(sa);

console.log('');
console.log('Service account :', sa.client_email);
console.log('Folder ID       :', FOLDER_ID);
console.log('');

let meta = null;
try {
  meta = (
    await request(
      'GET',
      `${DRIVE}/files/${FOLDER_ID}?fields=${encodeURIComponent('id,name,mimeType,owners(emailAddress),driveId,capabilities')}`,
      { headers: H },
    )
  ).json;
  console.log('AKSES: Berhasil');
  console.log('  Nama  :', meta.name);
  console.log('  Tipe  :', meta.mimeType);
  console.log('  Owner :', (meta.owners || []).map((o) => o.emailAddress).join(', '));
  console.log('  Link  : https://drive.google.com/drive/folders/' + FOLDER_ID);

  const c = meta.capabilities || {};
  const need = [
    ['baca isi folder (canListChildren)', c.canListChildren],
    ['ubah isi spreadsheet (canEdit / canModifyContent)', c.canEdit && c.canModifyContent],
    ['buat file baru di folder (canAddChildren)', c.canAddChildren],
    ['ubah nama file (canRename)', c.canRename],
    ['kasih akses ke orang lain (canShare)', c.canShare],
  ];
  console.log('');
  console.log('  Hak service account di folder ini:');
  for (const [label, yes] of need) {
    console.log(`    ${yes ? '\x1b[32m[OK ]\x1b[0m' : '\x1b[31m[-- ]\x1b[0m'} ${label}`);
  }
  const siap = c.canListChildren && c.canEdit && c.canModifyContent && c.canAddChildren && c.canRename;
  console.log('');
  if (siap) {
    console.log('  \x1b[32mSIAP — service account bisa mengisi spreadsheet di folder ini.\x1b[0m');
  } else {
    console.log('  \x1b[33mBELUM SIAP — folder harus di-share ke service account sebagai EDITOR:\x1b[0m');
    console.log('     ' + sa.client_email);
  }
} catch (e) {
  console.log('AKSES: GAGAL');
  console.log('  ' + e.message.split('\n').slice(0, 3).join('\n  '));
  console.log('');
  console.log('  Solusi: share folder ini ke service account sebagai Editor:');
  console.log('    ' + sa.client_email);
  process.exit(1);
}

console.log('');
let files = [];
try {
  const q = `'${FOLDER_ID}' in parents and trashed=false`;
  files = (
    await request(
      'GET',
      // PENTING: field list harus dibungkus files(...) — kalau tidak, Google balas
      // HTTP 400 "Invalid field selection id".
      `${DRIVE}/files?q=${encodeURIComponent(q)}&pageSize=20&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=${encodeURIComponent('files(id,name,mimeType,size,modifiedTime)')}`,
      { headers: H },
    )
  ).json.files || [];
} catch (e) {
  console.log('GAGAL membaca isi folder: ' + e.message.split('\n')[0]);
}

if (files.length === 0) {
  console.log('Isi folder: KOSONG');
  console.log('  Buat spreadsheet kosong di dalam folder ini, lalu jalankan ulang.');
} else {
  console.log(`Isi folder: ${files.length} file`);
  let n = 0;
  for (const f of files) {
    const isSs = f.mimeType === SHEET_MIME;
    if (isSs) n++;
    const kb = f.size ? `${(Number(f.size) / 1024).toFixed(1)} KB` : '-';
    const tanggal = f.modifiedTime ? f.modifiedTime.slice(0, 10) : '-';
    console.log(
      `  ${isSs ? '[SS]' : '[  ]'} ${f.name}\n       tipe=${isSs ? 'Google Spreadsheet' : f.mimeType.split('.').pop()} | ${kb} | diubah ${tanggal}\n       id=${f.id}`,
    );
  }
  console.log('');
  console.log(`Total Google Spreadsheet: ${n}`);
  if (n === 0) {
    console.log('Belum ada Google Spreadsheet. File .xlsx TIDAK bisa dipakai langsung oleh web —');
    console.log('jalankan: node scripts/sync-excel-folder.js --dir=excel/backup-<tanggal>');
  }
}
console.log('');
