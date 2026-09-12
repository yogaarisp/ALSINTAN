/**
 * xlsx-lib.mjs — helper bersama untuk membaca xlsx (tanpa dependency)
 * dan berkomunikasi dengan Google Sheets/Drive API via service account.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import https from 'node:https';
import crypto from 'node:crypto';

// ---------------------------------------------------------------- env
export function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}

// ---------------------------------------------------------------- http
export function request(method, url, { headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    let data = null;
    if (typeof body === 'string') data = Buffer.from(body);
    else if (Buffer.isBuffer(body)) data = body;
    else if (body != null) data = Buffer.from(JSON.stringify(body));
    const req = https.request(
      u,
      {
        method,
        headers: {
          ...headers,
          ...(data
            ? {
                'Content-Type': headers['Content-Type'] || 'application/json',
                'Content-Length': data.length,
              }
            : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {
            /* ignore */
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, json, text });
          } else {
            const err = new Error(`${method} ${url} -> HTTP ${res.statusCode}\n${text.slice(0, 800)}`);
            err.status = res.statusCode;
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

// ---------------------------------------------------------------- auth (JWT RS256)
const b64u = (buf) =>
  Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const SCOPE =
  'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive';

export async function getAccessToken(sa) {
  const iat = Math.floor(Date.now() / 1000);
  const input =
    b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) +
    '.' +
    b64u(
      JSON.stringify({
        iss: sa.client_email,
        scope: SCOPE,
        aud: 'https://oauth2.googleapis.com/token',
        iat,
        exp: iat + 3600,
      }),
    );
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

export async function getAuthHeader(sa) {
  const token = await getAccessToken(sa);
  return { Authorization: `Bearer ${token}` };
}

// ---------------------------------------------------------------- ZIP
export function readZip(buf) {
  let eocd = -1;
  const minOff = Math.max(0, buf.length - 22 - 65535);
  for (let i = buf.length - 22; i >= minOff; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('ZIP: End of Central Directory tidak ditemukan');
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const files = {};
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50)
      throw new Error(`ZIP: central directory rusak di offset ${off}`);
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commLen = buf.readUInt16LE(off + 32);
    const lho = buf.readUInt32LE(off + 42);
    const name = buf.toString('utf8', off + 46, off + 46 + nameLen);
    if (!name.endsWith('/')) {
      const lnLen = buf.readUInt16LE(lho + 26);
      const leLen = buf.readUInt16LE(lho + 28);
      const start = lho + 30 + lnLen + leLen;
      const comp = buf.subarray(start, start + compSize);
      files[name] = method === 0 ? Buffer.from(comp) : zlib.inflateRawSync(comp);
    }
    off += 46 + nameLen + extraLen + commLen;
  }
  return files;
}

// ---------------------------------------------------------------- XML / XLSX
export const decodeXml = (s) =>
  String(s)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

export function parseSharedStrings(files) {
  const f = files['xl/sharedStrings.xml'];
  if (!f) return [];
  const xml = f.toString('utf8');
  const out = [];
  const re = /<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = re.exec(xml))) out.push(decodeXml(m[1].replace(/<[^>]+>/g, '')));
  return out;
}

export function parseWorkbook(files) {
  const wb = files['xl/workbook.xml'].toString('utf8');
  const rels = files['xl/_rels/workbook.xml.rels'].toString('utf8');
  const relMap = {};
  let m;
  const reRel = /<Relationship\b[^>]*>/g;
  while ((m = reRel.exec(rels))) {
    const id = (m[0].match(/Id="([^"]+)"/) || [])[1];
    const target = (m[0].match(/Target="([^"]+)"/) || [])[1];
    if (id && target) relMap[id] = decodeXml(target);
  }
  const sheets = [];
  const reSheet = /<sheet\b[^>]*>/g;
  while ((m = reSheet.exec(wb))) {
    const name = decodeXml((m[0].match(/name="([^"]*)"/) || [])[1] || '');
    const rid = (m[0].match(/r:id="([^"]+)"/) || m[0].match(/id="([^"]+)"/) || [])[1];
    const state = (m[0].match(/state="([^"]*)"/) || [])[1] || 'visible';
    let target = relMap[rid] || '';
    if (target.startsWith('/')) target = target.slice(1);
    else if (target && !target.startsWith('xl/')) target = 'xl/' + target;
    if (name && target && files[target]) sheets.push({ name, file: target, state });
  }
  return sheets;
}

// styles: deteksi sel bertipe tanggal (numFmtId)
const BUILTIN_DATE_FMTS = new Set([
  14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47,
  50, 51, 52, 53, 54, 55, 56, 57, 58,
]);

export function parseStyles(files) {
  const f = files['xl/styles.xml'];
  if (!f) return { xfNumFmt: [], customFmt: {} };
  const xml = f.toString('utf8');
  const customFmt = {};
  const reFmt = /<numFmt\b[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"[^>]*\/?>/g;
  let m;
  while ((m = reFmt.exec(xml))) customFmt[parseInt(m[1], 10)] = decodeXml(m[2]);
  const xfNumFmt = [];
  const xfsBlock = xml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/);
  if (xfsBlock) {
    const reXf = /<xf\b[^>]*>/g;
    while ((m = reXf.exec(xfsBlock[1]))) {
      xfNumFmt.push(parseInt((m[0].match(/numFmtId="(\d+)"/) || [])[1] || '0', 10));
    }
  }
  return { xfNumFmt, customFmt };
}

function isDateFormat(numFmtId, customFmt) {
  if (BUILTIN_DATE_FMTS.has(numFmtId)) return true;
  const code = customFmt[numFmtId];
  if (!code) return false;
  const stripped = code.replace(/\[[^\]]*\]/g, '').replace(/"[^"]*"/g, '').replace(/\\./g, '');
  return /[dyhs]/i.test(stripped) && !/[#e]/i.test(stripped);
}

function serialToText(v) {
  const ms = Math.round((v - 25569) * 86400000);
  const d = new Date(ms);
  const date = d.toISOString().slice(0, 10);
  const frac = v - Math.floor(v);
  if (frac > 1e-6) {
    const hh = Math.floor(frac * 24);
    const mm = Math.floor(((frac * 1440) % 60) + 1e-9);
    const ss = Math.floor(((frac * 86400) % 60) + 1e-9);
    return `${date} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }
  return date;
}

export function colToIndex(ref) {
  let n = 0;
  for (const ch of ref) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function parseSheetXml(xml, { shared = [], styles = { xfNumFmt: [], customFmt: {} } } = {}) {
  const rows = [];
  const reRow = /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g;
  let m;
  while ((m = reRow.exec(xml))) {
    const rowNum = parseInt((m[1].match(/r="(\d+)"/) || [])[1] || '0', 10);
    const cells = {};
    const reCell = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let c;
    while ((c = reCell.exec(m[2] || ''))) {
      const attrs = c[1] || '';
      const body = c[2] || '';
      const ref = (attrs.match(/r="([A-Z]+)\d+"/) || [])[1] || '';
      const col = ref ? colToIndex(ref) : Object.keys(cells).length;
      const t = (attrs.match(/t="([^"]+)"/) || [])[1] || '';
      let v = '';
      const vm = body.match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/);
      const ism = body.match(/<is(?:\s[^>]*)?>([\s\S]*?)<\/is>/);
      if (vm) v = decodeXml(vm[1]);
      else if (ism) v = decodeXml(ism[1].replace(/<[^>]+>/g, ''));
      if (t === 's' && v !== '') v = shared[parseInt(v, 10)] ?? '';
      if (t === 'b') v = v === '1' ? 'TRUE' : 'FALSE';
      // tanggal: nilai numerik dengan format tanggal -> teks tanggal
      if (t === '' && v !== '' && /^-?\d+(\.\d+)?$/.test(v)) {
        const styleIdx = parseInt((attrs.match(/s="(\d+)"/) || [])[1] || '0', 10);
        const numFmtId = styles.xfNumFmt[styleIdx] || 0;
        if (numFmtId && isDateFormat(numFmtId, styles.customFmt)) {
          v = serialToText(parseFloat(v));
        }
      }
      cells[col] = v;
    }
    rows.push({ rowNum, cells });
  }
  return rows;
}

// ---------------------------------------------------------------- util
export const normKey = (s) => String(s).toUpperCase().replace(/[^A-Z]/g, '');

export function toNum(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (s === '') return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  if (/^-?\d+(,\d+)?$/.test(s)) return parseFloat(s.replace(',', '.'));
  const cleaned = s.replace(/\s/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}
