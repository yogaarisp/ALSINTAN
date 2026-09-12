/**
 * deploy-gas.mjs — SIAP ALSINTAN
 * Push apps-script/Code.gs ke Apps Script project + deploy Web App via Apps Script API
 * memakai service account. Idempoten: pakai GAS_SCRIPT_ID dari .env.local jika ada.
 *
 * Hasil: scriptId + URL deployment (ditulis ke .env.local kalau berhasil).
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
let SCRIPT_ID = process.env.GAS_SCRIPT_ID || '';
if (!SA_FILE) {
  console.error('ERROR: GOOGLE_SERVICE_ACCOUNT_JSON belum diset');
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
          else {
            const err = new Error(`${method} ${u.pathname} -> HTTP ${res.statusCode}\n${text.slice(0, 600)}`);
            err.status = res.statusCode;
            err.json = json;
            reject(err);
          }
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

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/script.projects';

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
const API = 'https://script.googleapis.com/v1';

// 1. Buat / pakai project script
if (!SCRIPT_ID) {
  console.log('Membuat Apps Script project (bound ke spreadsheet)...');
  let created = null;
  try {
    created = (await request('POST', `${API}/projects`, {
      headers: H,
      body: { title: 'SIAP ALSINTAN API', parentId: SS_ID },
    })).json;
  } catch (e) {
    console.log('Gagal dengan parentId, coba standalone... (' + e.message.split('\n')[0] + ')');
    created = (await request('POST', `${API}/projects`, {
      headers: H,
      body: { title: 'SIAP ALSINTAN API' },
    })).json;
  }
  SCRIPT_ID = created.scriptId;
  console.log('scriptId:', SCRIPT_ID);
} else {
  console.log('Pakai project existing:', SCRIPT_ID);
}

// 2. Push kode
const codeSource = fs.readFileSync(path.join(ROOT, 'apps-script', 'Code.gs'), 'utf8');
const manifest = {
  timeZone: 'Asia/Jakarta',
  exceptionLogging: 'STACKDRIVER',
  runtimeVersion: 'V8',
  oauthScopes: ['https://www.googleapis.com/auth/spreadsheets'],
  webapp: { executeAs: 'USER_DEPLOYING', access: 'ANYONE_ANONYMOUS' },
};
await request('PUT', `${API}/projects/${SCRIPT_ID}/content`, {
  headers: H,
  body: {
    files: [
      { name: 'appsscript', type: 'JSON', source: JSON.stringify(manifest, null, 2) },
      { name: 'Code', type: 'SERVER_JS', source: codeSource },
    ],
  },
});
console.log('Kode Code.gs ter-push');

// 3. Deploy sebagai Web App (idempoten: pakai deployment existing bila ada)
let webAppUrl = null;
let deploymentId = null;
const deps = (await request('GET', `${API}/projects/${SCRIPT_ID}/deployments`, { headers: H })).json;
const existing = (deps.deployments || []).find((d) =>
  (d.entryPoints || []).some((ep) => ep.entryPointType === 'WEB_APP'),
);
if (existing) {
  deploymentId = existing.deploymentId;
  const ep = existing.entryPoints.find((e) => e.entryPointType === 'WEB_APP');
  webAppUrl = ep && ep.webApp && ep.webApp.url;
  console.log('Deployment WEB_APP sudah ada:', deploymentId);
} else {
  const dep = (await request('POST', `${API}/projects/${SCRIPT_ID}/deployments`, {
    headers: H,
    body: {
      deploymentConfig: {
        description: 'SIAP ALSINTAN Web App v1',
        manifestFileName: 'appsscript',
        entryPoint: {
          entryPointType: 'WEB_APP',
          webApp: { executeAs: 'USER_DEPLOYING', access: 'ANYONE_ANONYMOUS' },
        },
      },
    },
  })).json;
  deploymentId = dep.deploymentId;
  const ep = (dep.entryPoints || []).find((e) => e.entryPointType === 'WEB_APP');
  webAppUrl = ep && ep.webApp && ep.webApp.url;
  console.log('Deployment baru dibuat:', deploymentId);
}

console.log('\n=== HASIL ===');
console.log('scriptId     :', SCRIPT_ID);
console.log('deploymentId :', deploymentId);
console.log('editor       : https://script.google.com/home/projects/' + SCRIPT_ID + '/edit');
console.log('webAppUrl    :', webAppUrl || `https://script.google.com/macros/s/${deploymentId}/exec`);

// 4. Simpan ke .env.local
if (webAppUrl) {
  const envPath = path.join(ROOT, '.env.local');
  let env = fs.readFileSync(envPath, 'utf8');
  const setEnv = (key, val) => {
    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(env)) env = env.replace(re, `${key}=${val}`);
    else env += `\n${key}=${val}\n`;
  };
  setEnv('VITE_GAS_API_URL', webAppUrl);
  setEnv('GAS_SCRIPT_ID', SCRIPT_ID);
  fs.writeFileSync(envPath, env);
  console.log('.env.local diperbarui (VITE_GAS_API_URL + GAS_SCRIPT_ID)');
}
