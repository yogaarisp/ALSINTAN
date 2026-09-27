/**
 * grant-access.mjs — SIAP ALSINTAN
 * Beri akun Google BARU akses Editor ke seluruh file SIAP ALSINTAN.
 *
 * Kenapa perlu script ini:
 *   Spreadsheet & folder di-share "Anyone with link -> Writer", jadi akun baru
 *   bisa masuk hanya sebagai WRITER. Writer tidak bisa menambah sheet baru
 *   (padahal Code.gs butuh addSheet/appendRow struktur baru saat setup).
 *   Owner lama tidak bisa diakses lagi, jadi transfer ownership MUSTAHIL.
 *   Service account masih punya role Editor -> Editor BOLEH memberi
 *   permission ke akun lain. Script ini itulah yang dilakukan.
 *
 * Pakai:
 *   node scripts/grant-access.mjs --email=akun-baru@gmail.com
 *   node scripts/grant-access.mjs --email=... --dry-run   (cek saja, tidak mengubah)
 *   node scripts/grant-access.mjs --email=... --no-notify (tanpa kirim email notifikasi)
 *   node scripts/grant-access.mjs --email=... --list      (tampilkan permission sekarang)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDotEnv, request, getAuthHeader } from './xlsx-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
loadDotEnv(path.join(ROOT, '.env.local'));
loadDotEnv(path.join(ROOT, '.env'));

const DRIVE = 'https://www.googleapis.com/drive/v3';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const PHOTO_FOLDER_NAME = 'SIAP ALSINTAN - Foto Survey';

// ---------------------------------------------------------------- args
const argv = process.argv.slice(2);
const argOf = (name, dflt) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : dflt;
};
const EMAIL = (argOf('email', process.env.SIAP_NEW_OWNER_EMAIL) || '').trim().toLowerCase();
const DRY_RUN = argv.includes('--dry-run');
const NO_NOTIFY = argv.includes('--no-notify');
const LIST_ONLY = argv.includes('--list');

if (!EMAIL) {
  console.error('ERROR: email wajib diisi.\n' + 'Contoh: node scripts/grant-access.mjs --email=siapalsintan.tyas@gmail.com');
  process.exit(1);
}
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(EMAIL)) {
  console.error(`ERROR: format email tidak valid: ${EMAIL}`);
  process.exit(1);
}
if (argv.includes('--help') || argv === 0) {
  console.log('Bantuan: node scripts/grant-access.mjs --email=<alamat> [--dry-run] [--list] [--no-notify]');
  process.exit(0);
}

const SA_FILE = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
if (!SA_FILE) {
  console.error('ERROR: GOOGLE_SERVICE_ACCOUNT_JSON belum diset di .env.local');
  process.exit(1);
}
const SA = JSON.parse(fs.readFileSync(path.resolve(ROOT, SA_FILE), 'utf8'));

// ---------------------------------------------------------------- util
const ok = (s) => `\x1b[32m${s}\x1b[0m`;
const warn = (s) => `\x1b[33m${s}\x1b[0m`;
const bad = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

const H = await getAuthHeader(SA);

/** Cari folder foto survey berdasarkan nama (bisa lebih dari satu). */
async function findPhotoFolders() {
  const q = `name='${PHOTO_FOLDER_NAME}' and mimeType='${FOLDER_MIME}' and trashed=false`;
  const url = `${DRIVE}/files?${new URLSearchParams({ q, fields: 'files(id,name,owners(emailAddress))', pageSize: '20' })}`;
  const res = await request('GET', url, { headers: H });
  return res.json.files || [];
}

/** Kumpulkan semua target yang perlu di-grant. */
async function collectTargets() {
  const targets = [];

  const ssId = process.env.SIAP_SPREADSHEET_ID;
  if (!ssId) {
    console.warn('WARN: SIAP_SPREADSHEET_ID belum diset di .env.local — lewati spreadsheet baseline');
  } else {
    targets.push({
      id: ssId,
      label: 'Spreadsheet baseline',
      detail: 'https://docs.google.com/spreadsheets/d/' + ssId + '/edit',
      wajib: true,
    });
  }

  const folderId = process.env.SIAP_DRIVE_FOLDER_ID;
  if (!folderId) {
    console.warn('WARN: SIAP_DRIVE_FOLDER_ID belum diset di .env.local — lewati folder ALSINTAN');
  } else {
    targets.push({
      id: folderId,
      label: 'Folder ALSINTAN (6 spreadsheet sumber)',
      detail: 'https://drive.google.com/drive/folders/' + folderId,
      wajib: true,
    });
  }

  // Folder foto survey: hanya wajib kalau ketemu (dibuat script saat ada survey)
  let photoFolders = [];
  try {
    photoFolders = await findPhotoFolders();
  } catch (e) {
    console.warn('WARN: gagal mencari folder foto survey: ' + e.message.split('\n')[0]);
  }
  if (photoFolders.length === 0) {
    console.log(
      dim(`\n  Info: folder "${PHOTO_FOLDER_NAME}" belum ada di Drive yang dilihat service account.`),
    );
    console.log(
      dim('  → Tidak apa-apa. Folder akan dibuat otomatis oleh Code.gs saat survey pertama.'),
    );
    console.log(dim('  → Pastikan folder ALSINTAN di-share ke akun baru agar folder baru ikut terlihat.'));
  } else {
    for (const f of photoFolders) {
      targets.push({
        id: f.id,
        label: `Folder foto survey (${f.name})`,
        detail: 'https://drive.google.com/drive/folders/' + f.id,
        wajib: false,
      });
    }
  }

  return targets;
}

async function listPermissions(fileId) {
  const url = `${DRIVE}/files/${fileId}/permissions?${new URLSearchParams({
    fields: 'permissions(id,type,role,emailAddress)',
    pageSize: '100',
  })}`;
  const res = await request('GET', url, { headers: H });
  return res.json.permissions || [];
}

async function grant(fileId, email, { notify }) {
  const body = {
    role: 'writer', // Drive API: writer == Editor
    type: 'user',
    emailAddress: email,
  };
  if (notify) body.sendNotificationEmail = true;
  const url = `${DRIVE}/files/${fileId}/permissions?${new URLSearchParams({
    fields: 'id,type,role,emailAddress',
    sendNotificationEmail: String(!!notify),
    transferOwnership: 'false',
  })}`;
  const res = await request('POST', url, { headers: H, body });
  return res.json;
}

// ---------------------------------------------------------------- main
console.log('');
console.log(bold('=== GRANT AKSES GOOGLE — SIAP ALSINTAN ==='));
console.log(`Akun tujuan   : ${bold(EMAIL)}`);
console.log(`Dijalankan via: ${SA.client_email}`);
console.log(`Mode          : ${DRY_RUN ? bold('DRY-RUN (tidak mengubah apa pun)') : 'UBAH'}`);
console.log('');

console.log(warn('PENTING:'));
console.log(warn('  • Transfer ownership TIDAK BISA dilakukan (hanya owner, dan akun lama tidak bisa diakses).'));
console.log(warn('  • File akan tetap tercatat dimiliki akun lama. Yang berganti hanya "mesin" Apps Script.'));
console.log(warn('  • Jadwalkan backup rutin: node scripts/backup-all-sheets.mjs'));
console.log('');

let targets;
try {
  targets = await collectTargets();
} catch (e) {
  console.error(bad('ERROR: gagal menyusun target: ' + e.message.split('\n')[0]));
  console.error(dim('  Pastikan service account masih punya akses Editor + file secrets/*.json ada.'));
  process.exit(1);
}

if (targets.length === 0) {
  console.error(bad('ERROR: tidak ada target yang bisa diproses. Cek SIAP_SPREADSHEET_ID / SIAP_DRIVE_FOLDER_ID di .env.local'));
  process.exit(1);
}

let changed = 0;
let already = 0;
let failed = 0;
const ownerNoted = [];

for (const t of targets) {
  console.log(`→ ${bold(t.label)}`);
  console.log(dim(`  ${t.detail}`));

  let perms;
  try {
    perms = await listPermissions(t.id);
  } catch (e) {
    console.log('  ' + bad(`GAGAL membaca permission: ${e.message.split('\n')[0]}`));
    failed++;
    console.log('');
    continue;
  }

  const owner = perms.find((p) => p.type === 'user' && p.role === 'owner');
  if (owner?.emailAddress) {
    ownerNoted.push({ label: t.label, owner: owner.emailAddress });
    console.log(dim(`  owner saat ini: ${owner.emailAddress}`));
  }

  const found = perms.find(
    (p) => p.type === 'user' && String(p.emailAddress || '').toLowerCase() === EMAIL,
  );

  if (found) {
    const sameRole = found.role === 'writer';
    if (sameRole) {
      console.log('  ' + ok(`SUDAH Editor (role=writer) — tidak ada yang perlu diubah`));
      already++;
    } else {
      console.log('  ' + warn(`SUDAH ada, tapi role=${found.role} (perlu dinaikkan ke writer)`));
      if (LIST_ONLY || DRY_RUN) {
        console.log(dim('  jalankan tanpa --dry-run untuk menaikkan role'));
        already++;
      } else {
        try {
          const url = `${DRIVE}/files/${t.id}/permissions/${found.id}?${new URLSearchParams({ fields: 'id,role' })}`;
          await request('PUT', url, { headers: H, body: { role: 'writer' } });
          console.log('  ' + ok('role dinaikkan ke Editor ✓'));
          changed++;
        } catch (e) {
          console.log('  ' + bad('GAGAL menaikkan role: ' + e.message.split('\n')[0]));
          failed++;
        }
      }
    }
  } else if (LIST_ONLY) {
    console.log('  ' + warn('belum ada akses untuk email ini (mode --list, tidak mengubah)'));
  } else if (DRY_RUN) {
    console.log('  ' + warn('akan diberi akses Editor (dry-run, belum dijalankan)'));
  } else {
    try {
      const p = await grant(t.id, EMAIL, { notify: !NO_NOTIFY });
      changed++;
      console.log('  ' + ok(`diberi akses Editor ✓ (permissionId=${p.id})`));
      if (!NO_NOTIFY) console.log(dim('  email notifikasi dikirim ke ' + EMAIL));
    } catch (e) {
      console.log('  ' + bad('GAGAL memberi akses: ' + e.message.split('\n')[0]));
      if (/cannot change|insufficient|permission/i.test(e.message)) {
        console.log(dim('  → Kemungkinan service account bukan Editor di file ini, atau file di-share hanya via link.'));
      }
      failed++;
    }
  }
  console.log('');
}

console.log(bold('=== RINGKASAN ==='));
console.log(`Baru di-grant   : ${changed}`);
console.log(`Sudah benar     : ${already}`);
console.log(`Gagal           : ${failed}`);
console.log('');

if (ownerNoted.length) {
  console.log(bold('Catatan kepemilikan (permanen):'));
  for (const o of ownerNoted) console.log(`  • ${o.label} → owner: ${o.owner}`);
  console.log('');
}

if (changed > 0) {
  console.log(bold('LANGKAH BERIKUTNYA:'));
  console.log('  1. Cek email ' + EMAIL + ' — akan ada permintaan akses Google Drive.');
  console.log('     (Kalau tidak masuk, buka link spreadsheet & klik "Request access", lalu wait/approve manual)');
  console.log('  2. Login ke script.google.com memakai ' + EMAIL);
  console.log('  3. New project -> paste apps-script/Code.gs -> Save');
  console.log('  4. Deploy > New deployment > Web app: Execute as = Me, Access = Anyone');
  console.log('  5. Verifikasi: node scripts/verify-gas.mjs --url=<URL_BARU>/exec');
  console.log('');
}

process.exit(failed > 0 ? 1 : 0);
