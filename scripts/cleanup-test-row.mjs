/** Hapus baris uji koneksi (TEST-VERIFIKASI-KILO) dari DATA_PROSPEK */
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
for (const f of ['.env.local', '.env']) {
  const p = path.join(ROOT, f);
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}
const sa = JSON.parse(fs.readFileSync(path.resolve(ROOT, process.env.GOOGLE_SERVICE_ACCOUNT_JSON), 'utf8'));
const SS_ID = process.env.SIAP_SPREADSHEET_ID;

function request(method, url, { headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    let data = null;
    if (typeof body === 'string') data = Buffer.from(body);
    else if (body != null) data = Buffer.from(JSON.stringify(body));
    const req = https.request(u, {
      method,
      headers: { ...headers, ...(data ? { 'Content-Type': headers['Content-Type'] || 'application/json', 'Content-Length': data.length } : {}) },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null; try { json = JSON.parse(text); } catch { /* ignore */ }
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(json);
        else reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 300)}`));
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const iat = Math.floor(Date.now() / 1000);
const input =
  b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) +
  '.' +
  b64u(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600 }));
const sig = crypto.createSign('RSA-SHA256').update(input).sign(sa.private_key);
const tokRes = await request('POST', 'https://oauth2.googleapis.com/token', {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${input}.${b64u(sig)}` }).toString(),
});
const H = { Authorization: `Bearer ${tokRes.access_token}` };
const api = (p) => `https://sheets.googleapis.com/v4/spreadsheets/${SS_ID}${p}`;

const rows = (await request('GET', api('/values/DATA_PROSPEK!A1:K1000'), { headers: H })).values || [];
const idx = rows.findIndex((r, i) => i > 0 && String(r[3] || '').includes('TEST-VERIFIKASI'));
if (idx === -1) {
  console.log('Baris uji tidak ditemukan (sudah bersih)');
} else {
  await request('POST', api(':batchUpdate'), {
    headers: H,
    body: { requests: [{ deleteDimension: { range: { sheetId: (await request('GET', api('?fields=sheets.properties'), { headers: H })).sheets.find((s) => s.properties.title === 'DATA_PROSPEK').properties.sheetId, dimension: 'ROWS', startIndex: idx, endIndex: idx + 1 } } }] },
  });
  console.log(`Baris uji (row ${idx + 1}, ${rows[idx][0]}) dihapus`);
}
