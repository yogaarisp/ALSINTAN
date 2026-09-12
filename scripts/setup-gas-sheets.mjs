/**
 * setup-gas-sheets.mjs — SIAP ALSINTAN
 * Pastikan sheet backend Apps Script tersedia di spreadsheet baseline:
 *   DATA_PROSPEK, DATA_SURVEY, MASTER_AO (+ cek header MASTER_WILAYAH)
 * Idempoten: sheet yang sudah ada tidak diubah isinya.
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

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
const SS_ID = process.env.SIAP_SPREADSHEET_ID || '';
if (!SA_FILE || !SS_ID) {
  console.error('ERROR: GOOGLE_SERVICE_ACCOUNT_JSON / SIAP_SPREADSHEET_ID belum diset');
  process.exit(1);
}

function request(method, url, { headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    let data = null;
    if (typeof body === 'string') data = Buffer.from(body);
    else if (body != null) data = Buffer.from(JSON.stringify(body));
    const req = https.request(
      u,
      {
        method,
        headers: {
          ...headers,
          ...(data ? { 'Content-Type': headers['Content-Type'] || 'application/json', 'Content-Length': data.length } : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try { json = JSON.parse(text); } catch { /* ignore */ }
          if (res.statusCode >= 200 && res.statusCode < 300) resolve({ status: res.statusCode, json, text });
          else reject(new Error(`${method} ${u.pathname} -> HTTP ${res.statusCode}\n${text.slice(0, 800)}`));
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const b64u = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

async function getAccessToken(sa) {
  const iat = Math.floor(Date.now() / 1000);
  const input =
    b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) +
    '.' +
    b64u(JSON.stringify({
      iss: sa.client_email,
      scope: SCOPE,
      aud: 'https://oauth2.googleapis.com/token',
      iat,
      exp: iat + 3600,
    }));
  const sig = crypto.createSign('RSA-SHA256').update(input).sign(sa.private_key);
  const res = await request('POST', 'https://oauth2.googleapis.com/token', {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${input}.${b64u(sig)}`,
    }).toString(),
  });
  return res.json.access_token;
}

const sa = JSON.parse(fs.readFileSync(path.resolve(ROOT, SA_FILE), 'utf8'));
const token = await getAccessToken(sa);
const H = { Authorization: `Bearer ${token}` };
const api = (p) => `https://sheets.googleapis.com/v4/spreadsheets/${SS_ID}${p}`;

// 1. Baca struktur existing
const meta = (await request('GET', api('?fields=properties.title,sheets.properties.title'), { headers: H })).json;
console.log(`Spreadsheet: ${meta.properties.title}`);
const titles = meta.sheets.map((s) => s.properties.title);
console.log('Sheets existing:', titles.join(', '));

// 2. Definisi sheet backend
const SCHEMAS = {
  DATA_PROSPEK: ['ID_PROSPEK', 'ID_KECAMATAN', 'KECAMATAN', 'NAMA_GAPOKTAN', 'KOMODITAS', 'ID_AO', 'NAMA_AO', 'STATUS', 'TANGGAL', 'ESTIMASI_ALSINTAN', 'CATATAN'],
  DATA_SURVEY: ['ID_SURVEY', 'ID_PROSPEK', 'NAMA_GAPOKTAN', 'JUMLAH_ANGGOTA', 'LUAS_SAWAH_AKTUAL', 'JENIS_ALSINTAN', 'ESTIMASI_HARGA', 'LATITUDE', 'LONGITUDE', 'ACCURACY_M', 'CATATAN', 'ID_AO', 'NAMA_AO', 'TIMESTAMP', 'STATUS'],
  MASTER_AO: ['ID_AO', 'NAMA_AO', 'WILAYAH', 'STATUS', 'EMAIL'],
};

const missing = Object.keys(SCHEMAS).filter((t) => !titles.includes(t));
if (missing.length) {
  await request('POST', api(':batchUpdate'), {
    headers: H,
    body: {
      requests: missing.map((title) => ({
        addSheet: { properties: { title, gridProperties: { rowCount: 1000, columnCount: 16 } } },
      })),
    },
  });
  console.log('Sheet dibuat:', missing.join(', '));
} else {
  console.log('Semua sheet backend sudah ada');
}

// 3. Header tiap sheet baru (abaikan jika sudah berisi)
for (const [title, headers] of Object.entries(SCHEMAS)) {
  const r = await request('GET', api(`/values/${encodeURIComponent(title)}!A1:Z1`), { headers: H });
  const existing = (r.json.values && r.json.values[0]) || [];
  if (existing.length === 0) {
    await request('PUT', api(`/values/${encodeURIComponent(title)}!A1?valueInputOption=USER_ENTERED`), {
      headers: H,
      body: { values: [headers] },
    });
    console.log(`Header ditulis ke ${title}`);
  } else {
    console.log(`${title} sudah punya header: ${existing.join(' | ')}`);
  }
}

// 4. Seed MASTER_AO minimal (baris AO001) jika kosong
const ao = (await request('GET', api('/values/MASTER_AO!A2:E1000'), { headers: H })).json.values || [];
if (ao.length === 0) {
  await request('PUT', api('/values/MASTER_AO!A2?valueInputOption=USER_ENTERED'), {
    headers: H,
    body: { values: [['AO001', 'Budi Santoso', 'Purworejo', 'AKTIF', 'budi@siap-alsintan.id']] },
  });
  console.log('MASTER_AO di-seed 1 baris (AO001)');
} else {
  console.log(`MASTER_AO berisi ${ao.length} baris`);
}

// 5. Cek header MASTER_WILAYAH utk konfirmasi mapping Code.gs
const w = (await request('GET', api('/values/MASTER_WILAYAH!A1:Z1'), { headers: H })).json.values[0];
console.log('MASTER_WILAYAH headers:', w.join(' | '));
console.log('SELESAI');

