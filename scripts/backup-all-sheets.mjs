/**
 * backup-all-sheets.mjs — SIAP ALSINTAN
 * Backup darurat: download semua spreadsheet Google sebagai .xlsx via Drive API
 * Memakai service account (alsintan@prime-odyssey-...).
 *
 * Usage: node scripts/backup-all-sheets.mjs
 *
 * Output: excel/backup-YYYY-MM-DD/<file>.xlsx
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Load .env.local ──────────────────────────────────────────────
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}
loadDotEnv(path.join(ROOT, '.env.local'));
loadDotEnv(path.join(ROOT, '.env'));

const SA_FILE = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const SS_ID = process.env.SIAP_SPREADSHEET_ID;

if (!SA_FILE || !SS_ID) {
  console.error('ERROR: GOOGLE_SERVICE_ACCOUNT_JSON atau SIAP_SPREADSHEET_ID belum diset di .env.local');
  process.exit(1);
}

// ── Service account auth ──────────────────────────────────────────
const b64u = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const SCOPE = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets';

async function getAccessToken() {
  const sa = JSON.parse(fs.readFileSync(path.resolve(ROOT, SA_FILE), 'utf8'));
  const iat = Math.floor(Date.now() / 1000);
  const header = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64u(JSON.stringify({
    iss: sa.client_email,
    scope: SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat,
    exp: iat + 3600,
  }));
  const input = `${header}.${payload}`;
  const sig = crypto.createSign('RSA-SHA256').update(input).sign(sa.private_key);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: `${input}.${b64u(sig)}`,
  }).toString();

  return new Promise((resolve, reject) => {
    const req = https.request('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const data = JSON.parse(Buffer.concat(chunks).toString());
        if (data.access_token) resolve(data.access_token);
        else reject(new Error('Token error: ' + JSON.stringify(data)));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── HTTP helper (returns Buffer for binary) ──────────────────────
function downloadFile(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(u, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }, (res) => {
      // Follow redirect if needed
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(downloadFile(res.headers.location, token));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(buf);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${buf.toString('utf8').slice(0, 500)}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function safeName(s) {
  return String(s).replace(/[<>:"/\\|?*]/g, '_').trim();
}

// ── All spreadsheets to backup ──────────────────────────────────
const SPREADSHEETS = [
  { id: SS_ID, name: 'SIAP ALSINTAN - Baseline (MASTER)' },
  // 6 spreadsheet sumber dari Code.gs SOURCES
  { id: '1qyRZ2St8k8pB2f0YlA6JTjXEHTYEL8dyLCm3NqrHBOU', name: 'Poktan 2026' },
  { id: '1qiP1pYHlo-dHEaelhPwSqletw09xGqAGR5xjDWHaXlA', name: 'Produksi Padi Sawah 2025' },
  { id: '1qiP1pYHlo-dHEaelhPwSqletw09xGqAGR5xjDWHaXlA', name: 'Produksi Padi Ladang 2025' }, // will fix below
  { id: '1eFhHC22k0zOSiODB4NvKlwBYI8Mk27x29fNnLvFx6ec', name: 'Produksi Beras 2025' },
  { id: '1T8lNnB8KLe9Ri0osKirOB_Sk6a8UKqkAnPZ7936i4w4', name: 'Rekap Alsintan s.d. April 2026' },
  { id: '1yyVQbpWPXRmcfbTS7XVDdrlRth1y_4W5Ow8GyVTfyWM', name: 'Rekap Bulanan SP TP' },
];
// Fix: Padi Ladang ID is different
SPREADSHEETS[3].id = '18NAxNkcXtFcseYut-ghtjw3kgiZf0IFjRan663j6Q0M';

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const outDir = path.join(ROOT, 'excel', `backup-${today}`);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`\n=== BACKUP SPREADSHEET SIAP ALSINTAN ===`);
  console.log(`Tanggal   : ${today}`);
  console.log(`Output    : ${outDir}`);
  console.log(`Akun owner: yokbisasemarang@gmail.com (tidak bisa diakses — backup via service account)`);
  console.log('');

  const token = await getAccessToken();
  console.log('Service account authenticated ✓');
  console.log('');

  let ok = 0;
  let fail = 0;
  const results = [];

  for (const ss of SPREADSHEETS) {
    const fname = `${safeName(ss.name)}.xlsx`;
    const fpath = path.join(outDir, fname);
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${ss.id}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;

    try {
      console.log(`Downloading: ${ss.name} ...`);
      const buf = await downloadFile(exportUrl, token);
      fs.writeFileSync(fpath, buf);
      const kb = (buf.length / 1024).toFixed(1);
      console.log(`  ✓ ${fname} (${kb} KB)`);
      results.push({ name: ss.name, file: fpath, size: buf.length, status: 'OK' });
      ok++;
    } catch (err) {
      console.error(`  ✗ ${ss.name}: ${err.message}`);
      results.push({ name: ss.name, file: null, size: 0, status: `FAIL: ${err.message}` });
      fail++;
    }
  }

  // Also export baseline as CSV per-sheet (extra safety)
  console.log('\n--- Export CSV per-sheet (baseline) ---');
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SS_ID}/export?format=csv`;
  try {
    const buf = await downloadFile(csvUrl, token);
    // This exports only first sheet; for all sheets we'd need the Sheets API
    // Let's use Sheets API to get all sheet names first
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SS_ID}?fields=sheets.properties.title`;
    const metaBuf = await downloadFile(metaUrl, token);
    const meta = JSON.parse(metaBuf.toString('utf8'));
    const sheetNames = (meta.sheets || []).map((s) => s.properties.title);
    console.log(`  Sheets di baseline: ${sheetNames.join(', ')}`);

    for (const sn of sheetNames) {
      try {
        const csvSheetUrl = `https://docs.google.com/spreadsheets/d/${SS_ID}/export?format=csv&gid=${encodeURIComponent(sn)}`;
        const csvBuf = await downloadFile(csvSheetUrl, token);
        const csvPath = path.join(outDir, `${safeName(ss.name)} - ${safeName(sn)}.csv`);
        fs.writeFileSync(csvPath, csvBuf);
        console.log(`  ✓ ${safeName(sn)}.csv (${(csvBuf.length / 1024).toFixed(1)} KB)`);
      } catch (err) {
        console.error(`  ✗ CSV ${sn}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`  CSV export error: ${err.message}`);
  }

  // Summary
  console.log('\n=== RINGKASAN ===');
  console.log(`Berhasil : ${ok} file`);
  console.log(`Gagal    : ${fail} file`);
  console.log(`Lokasi   : ${outDir}`);
  console.log('');

  // Write manifest
  const manifest = {
    backupDate: today,
    ownerAccount: 'yokbisasemarang@gmail.com (tidak bisa diakses)',
    newOpsAccount: 'siapalsintan.tyas@gmail.com',
    backedUpBy: 'service account: alsintan@prime-odyssey-508315-r6.iam.gserviceaccount.com',
    files: results.map((r) => ({
      name: r.name,
      file: r.file ? path.relative(ROOT, r.file) : null,
      sizeKB: r.file ? (r.size / 1024).toFixed(1) : '0',
      status: r.status,
    })),
  };
  fs.writeFileSync(path.join(outDir, '_manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('Manifest: _manifest.json');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
