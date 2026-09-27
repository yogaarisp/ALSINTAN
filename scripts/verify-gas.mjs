/**
 * verify-gas.mjs — SIAP ALSINTAN
 * Cek end-to-end: web app -> Apps Script -> Spreadsheet.
 * Reports per-spreadsheet supaya kelihatan file mana yang belum punya izin.
 *
 * Pakai:
 *   node scripts/verify-gas.mjs                       (pakai VITE_GAS_API_URL)
 *   node scripts/verify-gas.mjs --url=https://.../exec
 *   node scripts/verify-gas.mjs --email=akun@...      (menambahkan tes authCheck)
 *   node scripts/verify-gas.mjs --no-sources          (lewati 6 spreadsheet sumber, lebih cepat)
 *
 * Exit code 0 = semua wajib lolos, 1 = ada yang gagal.
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { loadDotEnv } from './xlsx-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
loadDotEnv(path.join(ROOT, '.env.local'));
loadDotEnv(path.join(ROOT, '.env'));

// ---------------------------------------------------------------- args
const argv = process.argv.slice(2);
const argOf = (name, dflt) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : dflt;
};
const URL_GAS = (argOf('url', process.env.VITE_GAS_API_URL) || '').trim();
const AUTH_EMAIL = (argOf('email', '') || '').trim().toLowerCase();
const SKIP_SOURCES = argv.includes('--no-sources');
const TIMEOUT = parseInt(argOf('timeout', '45000'), 10);

if (!URL_GAS) {
  console.error('ERROR: URL Apps Script belum diisi.');
  console.error('  Cara: --url=https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec');
  console.error('  atau set VITE_GAS_API_URL di .env.local');
  process.exit(1);
}

// ---------------------------------------------------------------- http
// CATATAN PENTING: endpoint /exec Apps Script membalas 302 ke
// script.googleusercontent.com/macros/echo?user_content_key=...
// Browser & axios mengikuti redirect otomatis, tapi Node TIDAK.
// Tanpa mengikuti redirect, responsnya HTML kosong -> dianggap "bukan JSON".
function httpJson(method, url, bodyObj, hop = 0) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const body = bodyObj ? Buffer.from(JSON.stringify(bodyObj)) : null;
    const started = Date.now();
    const req = https.request(
      u,
      {
        method,
        headers: {
          // zagel "Not Google" supaya dapat respons HTML, bukan JSON
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) siap-alsintan-verify/1.0',
          ...(body ? { 'Content-Type': 'text/plain;charset=utf-8', 'Content-Length': body.length } : {}),
        },
        timeout: TIMEOUT,
      },
      (res) => {
        const loc = res.headers.location;
        if (res.statusCode >= 300 && res.statusCode < 400 && loc && hop < 4) {
          res.resume(); // buang body redirect
          const next = new URL(loc, u).toString();
          resolve(httpJson('GET', next, null, hop + 1).then((r) => ({ ...r, ms: Date.now() - started })));
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {
            /* bukan JSON (biasanya halaman error Google) */
          }
          resolve({ status: res.statusCode, json, text, ms: Date.now() - started });
        });
      },
    );
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, json: null, text: `timeout > ${TIMEOUT}ms`, ms: Date.now() - started });
    });
    req.on('error', (e) => resolve({ status: 0, json: null, text: e.message, ms: Date.now() - started }));
    if (body) req.write(body);
    req.end();
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** GAS kadang balik HTML 404 sesaat saat ada trafik — retry 2x. */
async function gasGet(params) {
  let last = null;
  for (let i = 0; i < 3; i++) {
    const url = new URL(URL_GAS);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
    const res = await httpJson('GET', url.toString());
    last = res;
    if (res.json && 'success' in res.json) return res;
    if (i < 2) await sleep(2000);
  }
  return last;
}

async function gasPost(payload) {
  let last = null;
  for (let i = 0; i < 3; i++) {
    const res = await httpJson('POST', URL_GAS, payload);
    last = res;
    if (res.json && 'success' in res.json) return res;
    if (i < 2) await sleep(2000);
  }
  return last;
}

// ---------------------------------------------------------------- output
const G = (s) => `\x1b[32m${s}\x1b[0m`;
const Y = (s) => `\x1b[33m${s}\x1b[0m`;
const R = (s) => `\x1b[31m${s}\x1b[0m`;
const D = (s) => `\x1b[2m${s}\x1b[0m`;
const B = (s) => `\x1b[1m${s}\x1b[0m`;

const results = [];
function record(icon, name, sheets, detail, ms) {
  results.push({ icon, name, sheets, detail, ms });
  const t = ms != null ? D(` ${String(ms).padStart(5)}ms`) : '';
  console.log(`  ${icon} ${name.padEnd(16)} ${(sheets || '').padEnd(42)} ${detail || ''}${t}`);
}

const errOf = (res) => {
  if (!res.json) return (res.text || 'respons bukan JSON').slice(0, 120).replace(/\s+/g, ' ');
  if (res.json.success === false) return String(res.json.error || 'unknown error').slice(0, 120);
  return `HTTP ${res.status} — ${(res.text || '').slice(0, 100).replace(/\s+/g, ' ')}`;
};

// ---------------------------------------------------------------- tests
console.log('');
console.log(B('=== VERIFIKASI KONEKSI SIAP ALSINTAN ==='));
console.log(`URL   : ${URL_GAS.length > 60 ? URL_GAS.slice(0, 57) + '...' : URL_GAS}`);
console.log('');

// 1. ping
{
  const res = await gasGet({ action: 'ping' });
  if (res.json?.success) record(G('OK '), 'ping', '(tanpa spreadsheet)', 'server hidup', res.ms);
  else record(R('ERR'), 'ping', '(tanpa spreadsheet)', errOf(res), res.ms);
}

// 2. KPI
{
  const res = await gasGet({ action: 'getDashboardKPI' });
  if (res.json?.success) {
    const d = res.json.data || {};
    record(G('OK '), 'getDashboardKPI', 'MASTER_WILAYAH+PROSPEK+ANALIS',
      `${d.totalKecamatan} kec · ${d.totalGapoktan} gapoktan · ${d.totalLuasLahan} ha`, res.ms);
  } else record(R('ERR'), 'getDashboardKPI', 'MASTER_WILAYAH+PROSPEK+ANALIS', errOf(res), res.ms);
}

// 3. wilayah
{
  const res = await gasGet({ action: 'getWilayah' });
  if (res.json?.success) {
    const d = Array.isArray(res.json.data) ? res.json.data : [];
    const tanpaKoordinat = d.filter((w) => w.koordinatLat == null || w.koordinatLng == null).length;
    record(G('OK '), 'getWilayah', 'MASTER_WILAYAH',
      `${d.length} kecamatan${tanpaKoordinat ? ` · ${tanpaKoordinat} tanpa koordinat` : ' · semua ada koordinat'}`, res.ms);
  } else record(R('ERR'), 'getWilayah', 'MASTER_WILAYAH', errOf(res), res.ms);
}

// 4. prospek
{
  const res = await gasGet({ action: 'getProspek', page: 1, limit: 5 });
  if (res.json?.success) {
    const d = res.json.data || {};
    record(G('OK '), 'getProspek', 'DATA_PROSPEK', `${d.total} total · 5 baris ditampilkan`, res.ms);
  } else record(R('ERR'), 'getProspek', 'DATA_PROSPEK', errOf(res), res.ms);
}

// 5. survey
{
  const res = await gasGet({ action: 'getSurvey', page: 1, limit: 5 });
  if (res.json?.success) {
    const d = res.json.data || {};
    record(G('OK '), 'getSurvey', 'DATA_SURVEY', `${d.total} survey tercatat`, res.ms);
  } else record(R('ERR'), 'getSurvey', 'DATA_SURVEY', errOf(res), res.ms);
}

// 6. Analis
{
  const res = await gasGet({ action: 'getAnalis' });
  if (res.json?.success) {
    const d = Array.isArray(res.json.data) ? res.json.data : [];
    const aktif = d.filter((a) => a.status === 'AKTIF').length;
    record(G('OK '), 'getAnalis', 'MASTER_ANALIS+PROSPEK+SURVEY', `${d.length} Analis (${aktif} aktif)`, res.ms);
  } else record(R('ERR'), 'getAnalis', 'MASTER_ANALIS+PROSPEK+SURVEY', errOf(res), res.ms);
}

// 7. authCheck (opsional)
if (AUTH_EMAIL) {
  const res = await gasPost({ action: 'authCheck', email: AUTH_EMAIL });
  if (res.json?.success) {
    const d = res.json.data || {};
    record(G('OK '), 'authCheck', 'USERS', `${d.nama} · role=${d.role} · ${d.idAnalis || '-'}`, res.ms);
  } else record(Y('ERR'), 'authCheck', 'USERS', errOf(res), res.ms);
} else {
  console.log(`  ${D('...')} authCheck         USERS                               ${D('(lewati — pakai --email=... untuk menguji)')}`);
}

// 8. 6 spreadsheet sumber
const sourceStates = [];
if (!SKIP_SOURCES) {
  console.log('');
  console.log(D('  6 spreadsheet sumber (read-only):'));
  const res = await gasGet({ action: 'getSources' });
  if (res.json?.success && Array.isArray(res.json.data)) {
    for (const s of res.json.data) {
      const good = s.status === 'OK';
      const nTab = Array.isArray(s.tabs) ? s.tabs.length : 0;
      sourceStates.push({ key: s.key, nama: s.nama, ok: good, status: s.status, nTab });
      console.log(
        `     ${good ? G('OK ') : R('ERR')} ${String(s.key).padEnd(16)} ${String(s.nama).padEnd(30)} ` +
          `${good ? `${nTab} tab` : String(s.status).slice(0, 60)}`,
      );
    }
    // uji baca isi satu tab dari sumber pertama yang OK
    const firstOk = res.json.data.find((s) => s.status === 'OK' && Array.isArray(s.tabs) && s.tabs.length);
    if (firstOk) {
      const tab = firstOk.tabs[0].nama;
      const r2 = await gasGet({ action: 'getSourceData', key: firstOk.key, tab, page: 1, limit: 5 });
      if (r2.json?.success) {
        const d = r2.json.data || {};
        record(G('OK '), 'getSourceData', `${firstOk.key}/${tab}`, `${d.total} baris · ${(d.header || []).length} kolom`, r2.ms);
      } else {
        record(R('ERR'), 'getSourceData', `${firstOk.key}/${tab}`, errOf(r2), r2.ms);
      }
    }
  } else {
    console.log('     ' + R('ERR ') + errOf(res));
    sourceStates.push({ key: 'getSources', ok: false, status: errOf(res), nTab: 0 });
  }
} else {
  console.log('');
  console.log(D('  6 spreadsheet sumber: dilewati (--no-sources)'));
}

// ---------------------------------------------------------------- summary
const errs = results.filter((r) => r.icon === R('ERR'));
const warns = results.filter((r) => r.icon === Y('ERR'));
const srcBad = sourceStates.filter((s) => !s.ok);

console.log('');
console.log(B('=== RINGKASAN ==='));
console.log(`Endpoint wajib  : ${results.length - warns.length - errs.length}/${results.length} lolos`);
console.log(`Spreadsheet sumber: ${sourceStates.length - srcBad.length}/${sourceStates.length} OK`);

if (errs.length === 0 && srcBad.length === 0) {
  console.log('');
  console.log(G('SEMUA LOLOS ✓ — mesin Apps Script + spreadsheet siap dipakai.'));
  console.log('');
  process.exit(0);
}

console.log('');
if (errs.length) {
  console.log(R('GAGAL:'));
  for (const e of errs) console.log(R(`  • ${e.name} [${e.sheets}] → ${e.detail}`));
}
if (srcBad.length) {
  console.log(R('Spreadsheet sumber bermasalah:'));
  for (const s of srcBad) console.log(R(`  • ${s.key || '?'} — ${String(s.status).slice(0, 80)}`));
  console.log('');
  console.log(Y('  → Share-kan akun baru ke FOLDER ALSINTAN (bukan per-file):'));
  console.log(Y('     node scripts/grant-access.mjs --email=<akun-baru>'));
  console.log(Y('  → Catatan: link sharing "Anyone with link" hanya ada di spreadsheet baseline;'));
  console.log(Y('     folder & 6 spreadsheet sumber perlu di-share eksplisit ke akun baru.'));
}
if (warns.length) {
  console.log(Y('Perhatian (tidak fatal):'));
  for (const w of warns) console.log(Y(`  • ${w.name} → ${w.detail}`));
}
console.log('');
process.exit(1);
