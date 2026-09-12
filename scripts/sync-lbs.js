/**
 * sync-lbs.js — SIAP ALSINTAN
 * Baca `excel/LBS  PER DESA fIX.xlsx` (LTT Padi Sawah Reguler Purworejo 2025),
 * bersihkan, validasi vs REKAP, lalu tulis ke Google Spreadsheet via Sheets API
 * memakai service account. Tanpa dependency eksternal.
 *
 * Usage:
 *   node scripts/sync-lbs.js           # validasi dulu; berhenti jika checksum selisih
 *   node scripts/sync-lbs.js --force   # tetap sync walau ada selisih (dilaporkan)
 *
 * Env (.env.local):
 *   GOOGLE_SERVICE_ACCOUNT_JSON  path ke file JSON service account (wajib)
 *   SIAP_SPREADSHEET_ID          jika ada -> update spreadsheet itu, jika kosong -> buat baru
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import https from 'node:https';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FORCE = process.argv.includes('--force');

// ---------------------------------------------------------------- config
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
const XLSX_FILE = path.join(ROOT, 'excel', 'LBS  PER DESA fIX.xlsx');
const SS_ID = process.env.SIAP_SPREADSHEET_ID || '';
const TITLE = 'SIAP ALSINTAN — Baseline LBS Padi Sawah Purworejo 2025';

const SHEET_IMPORT = 'IMPORT_BAKU_SAWAH_DESA';
const SHEET_REKAP = 'REKAP_KECAMATAN';
const SHEET_DESA = 'MASTER_DESA';
const SHEET_WILAYAH = 'MASTER_WILAYAH';

if (!SA_FILE) {
  console.error('ERROR: GOOGLE_SERVICE_ACCOUNT_JSON belum diset di .env.local');
  process.exit(1);
}

// ---------------------------------------------------------------- http
function request(method, url, { headers = {}, body = null } = {}) {
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
            const err = new Error(
              `${method} ${url} -> HTTP ${res.statusCode}\n${text.slice(0, 1000)}`,
            );
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

async function getAccessToken(sa) {
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
  const sig = crypto
    .createSign('RSA-SHA256')
    .update(input)
    .sign(sa.private_key);
  const res = await request('POST', 'https://oauth2.googleapis.com/token', {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${input}.${b64u(sig)}`,
    }).toString(),
  });
  return res.json.access_token;
}

// ---------------------------------------------------------------- minimal ZIP reader
function readZip(buf) {
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

// ---------------------------------------------------------------- minimal XLSX reader
const decodeXml = (s) =>
  s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

function parseSharedStrings(files) {
  const f = files['xl/sharedStrings.xml'];
  if (!f) return [];
  const xml = f.toString('utf8');
  const out = [];
  const re = /<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = re.exec(xml))) out.push(decodeXml(m[1].replace(/<[^>]+>/g, '')));
  return out;
}

function parseWorkbook(files) {
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
    let target = relMap[rid] || '';
    if (target.startsWith('/')) target = target.slice(1);
    else if (target && !target.startsWith('xl/')) target = 'xl/' + target;
    if (name && target && files[target]) sheets.push({ name, file: target });
  }
  return sheets;
}

function colToIndex(ref) {
  let n = 0;
  for (const ch of ref) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parseSheetXml(xml, shared) {
  const rows = [];
  const reRow = /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g;
  let m;
  while ((m = reRow.exec(xml))) {
    const rowNum = parseInt((m[1].match(/r="(\d+)"/) || [])[1] || '0', 10);
    const cells = {};
    const reCell = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let c;
    while ((c = reCell.exec(m[2] || ''))) {
      const ref = (c[1].match(/r="([A-Z]+)\d+"/) || [])[1] || '';
      const col = ref ? colToIndex(ref) : Object.keys(cells).length;
      const t = (c[1].match(/t="([^"]+)"/) || [])[1] || '';
      const body = c[2] || '';
      let v = '';
      const vm = body.match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/);
      const ism = body.match(/<is(?:\s[^>]*)?>([\s\S]*?)<\/is>/);
      if (vm) v = decodeXml(vm[1]);
      else if (ism) v = decodeXml(ism[1].replace(/<[^>]+>/g, ''));
      if (t === 's' && v !== '') v = shared[parseInt(v, 10)] ?? '';
      cells[col] = v;
    }
    rows.push({ rowNum, cells });
  }
  return rows;
}

// ---------------------------------------------------------------- normalisasi
const normKey = (s) => String(s).toUpperCase().replace(/[^A-Z]/g, '');

function toNum(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (s === '') return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  if (/^-?\d+(,\d+)?$/.test(s)) return parseFloat(s.replace(',', '.'));
  const cleaned = s.replace(/\s/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------- parse workbook jadi model
function extractModel(files) {
  const shared = parseSharedStrings(files);
  const sheets = parseWorkbook(files);
  console.log(`Sheets ditemukan: ${sheets.length} -> ${sheets.map((s) => s.name).join(', ')}`);

  const rekapRows = [];
  const desaRows = [];
  const dups = [];
  const gogoSkipped = [];
  const problems = [];
  const perKec = new Map(); // key -> { name, rows, sum, sheetJumlah }
  let rekapJumlah = null;

  for (const sh of sheets) {
    const kecName = sh.name.replace(/[.\s]+$/, '').replace(/\s+/g, ' ').toUpperCase();
    const rows = parseSheetXml(files[sh.file].toString('utf8'), shared);

    if (normKey(sh.name) === 'REKAP') {
      for (const { cells } of rows) {
        const b = (cells[1] || '').trim();
        const cRaw = (cells[2] || '').trim();
        if (!b) continue;
        if (/^JUMLAH$/i.test(b)) {
          rekapJumlah = toNum(cRaw);
          continue;
        }
        const val = toNum(cRaw);
        if (val === null) continue; // baris judul/header
        rekapRows.push({ kecamatan: b.replace(/\s+/g, ' ').toUpperCase(), ha: val });
      }
      continue;
    }

    // sheet kecamatan
    const entry = { name: kecName, sheet: sh.name, rows: [], sum: 0, sheetJumlah: null };
    perKec.set(normKey(kecName), entry);
    for (const { cells } of rows) {
      const b = (cells[1] || '').trim();
      const cRaw = (cells[2] || '').trim();
      if (!b) continue;
      if (/^JUMLAH$/i.test(b)) {
        entry.sheetJumlah = toNum(cRaw);
        continue;
      }
      if (/^DESA$/i.test(b)) continue; // baris header kolom
      if (/^\*GOGO$/i.test(b)) {
        gogoSkipped.push({ kecamatan: kecName, desa: b, nilai: cRaw });
        continue;
      }
      const val = toNum(cRaw);
      if (val === null) {
        problems.push(`${sh.name}: baris DESA="${b}" nilai kosong/tidak numerik ("${cRaw}")`);
        continue;
      }
      const display = b.replace(/\s+/g, ' ').toUpperCase();
      const key = normKey(display);
      const dup = entry.rows.find((r) => normKey(r.desa) === key);
      if (dup) {
        dups.push({ kecamatan: kecName, desa: display, kept: dup.desa, nilaiDup: val });
        continue;
      }
      entry.rows.push({ desa: display, ha: val });
      entry.sum += val;
    }
  }

  const rekapMap = new Map(rekapRows.map((r) => [normKey(r.kecamatan), r]));
  return { rekapRows, rekapMap, rekapJumlah, perKec, dups, gogoSkipped, problems };
}

// ---------------------------------------------------------------- validasi
function validate(model) {
  const { rekapMap, rekapJumlah, perKec, problems } = model;
  let failed = false;

  if (problems.length) {
    console.log('\n== MASALAH PARSING ==');
    for (const p of problems) console.log('  ! ' + p);
    failed = true;
  }

  const kecKeys = [...perKec.keys()];
  const rekapKeys = [...rekapMap.keys()];
  const onlySheet = kecKeys.filter((k) => !rekapMap.has(k));
  const onlyRekap = rekapKeys.filter((k) => !perKec.has(k));
  if (onlySheet.length || onlyRekap.length) {
    console.log('\n== KECAMATAN TIDAK SINKRON ==');
    if (onlySheet.length) console.log('  Hanya di sheet data : ' + onlySheet.join(', '));
    if (onlyRekap.length) console.log('  Hanya di REKAP      : ' + onlyRekap.join(', '));
    failed = true;
  }

  console.log('\n== CHECKSUM per Kecamatan (hasil bersih vs REKAP) ==');
  console.log('  Kecamatan     Desa  HasilBersih    REKAP     Selisih  Status');
  let totalBersih = 0;
  let totalRekap = 0;
  const notes = [];
  for (const k of rekapKeys) {
    const e = perKec.get(k);
    if (!e) continue;
    const r = rekapMap.get(k).ha;
    const diff = Math.round((e.sum - r) * 1000) / 1000;
    const ok = Math.abs(diff) <= 0.011;
    if (!ok) {
      failed = true;
      notes.push(
        `${e.name}: total asli sheet/REKAP=${r} vs jumlah desa=${Math.round(e.sum * 1000) / 1000} (selisih ${diff}). ` +
          `Periksa baris yang mungkin tidak ikut terhitung di file asli.`,
      );
    }
    totalBersih += e.sum;
    totalRekap += r;
    console.log(
      '  ' +
        e.name.padEnd(13) +
        String(e.rows.length).padStart(5) +
        String(e.sum.toFixed(2)).padStart(12) +
        String(r.toFixed(2)).padStart(10) +
        String(diff.toFixed(3)).padStart(11) +
        (ok ? '  OK' : '  SELISIH'),
    );
  }
  console.log(
    '  ' + 'TOTAL'.padEnd(13) +
      String([...perKec.values()].reduce((a, e) => a + e.rows.length, 0)).padStart(5) +
      String(totalBersih.toFixed(2)).padStart(12) +
      String(totalRekap.toFixed(2)).padStart(10) +
      String((totalBersih - totalRekap).toFixed(3)).padStart(11),
  );

  if (rekapJumlah != null && Math.abs(rekapJumlah - totalRekap) > 0.011) {
    console.log(`  ! Baris JUMLAH di REKAP (${rekapJumlah}) != penjumlahan kolom (${totalRekap.toFixed(2)})`);
    failed = true;
  }

  return { failed, notes, totalBersih };
}

// ---------------------------------------------------------------- tulis ke Google Sheets
async function writeSpreadsheet(model, totals) {
  const sa = JSON.parse(fs.readFileSync(path.join(ROOT, SA_FILE), 'utf8'));
  console.log(`\nService account: ${sa.client_email} (project: ${sa.project_id || '?'})`);
  const token = await getAccessToken(sa);
  const auth = { Authorization: `Bearer ${token}` };
  const base = 'https://sheets.googleapis.com/v4/spreadsheets';

  // urutan kecamatan mengikuti REKAP
  const kecOrdered = model.rekapRows
    .map((r) => model.perKec.get(normKey(r.kecamatan)))
    .filter(Boolean);

  // MASTER ids
  let d = 0;
  const masterDesaRows = [];
  for (let w = 0; w < kecOrdered.length; w++) {
    const e = kecOrdered[w];
    const idKec = 'W' + String(w + 1).padStart(3, '0');
    for (const r of e.rows) {
      d++;
      masterDesaRows.push([
        'D' + String(d).padStart(3, '0'),
        idKec,
        e.name,
        r.desa,
        r.ha,
      ]);
    }
  }

  const noteByKec = new Map(totals.notes.map((n) => [normKey(n.slice(0, n.indexOf(':'))), n]));

  const values = {
    [SHEET_IMPORT]: [
      ['kecamatan', 'desa', 'baku_sawah_ha'],
      ...kecOrdered.flatMap((e) => e.rows.map((r) => [e.name, r.desa, r.ha])),
    ],
    [SHEET_REKAP]: [
      ['kecamatan', 'lbs_rekap_ha'],
      ...model.rekapRows.map((r) => [r.kecamatan, r.ha]),
      ['JUMLAH', model.rekapJumlah],
    ],
    [SHEET_DESA]: [
      ['id_desa', 'id_kecamatan', 'kecamatan', 'desa', 'baku_sawah_ha'],
      ...masterDesaRows,
    ],
    [SHEET_WILAYAH]: [
      ['ID_KECAMATAN', 'KECAMATAN', 'KABUPATEN', 'LUAS_LAHAN_HA', 'DATA_PANEN_TON', 'JUMLAH_GAPOKTAN', 'KOMODITAS', 'LATITUDE', 'LONGITUDE', 'CATATAN'],
      ...kecOrdered.map((e, i) => [
        'W' + String(i + 1).padStart(3, '0'),
        e.name,
        'Purworejo',
        Math.round(e.sum * 100) / 100,
        '',
        '',
        '',
        '',
        '',
        noteByKec.get(normKey(e.name)) || '',
      ]),
    ],
  };
  const sheetTitles = [SHEET_IMPORT, SHEET_REKAP, SHEET_DESA, SHEET_WILAYAH];

  // 1) pakai spreadsheet existing (wajib dishare Editor ke service account)
  let ssId = SS_ID;
  if (!ssId) {
    if (!process.argv.includes('--create-new')) {
      console.error(
        'SIAP_SPREADSHEET_ID belum diset di .env.local.\n' +
          `Langkah: buat spreadsheet kosong -> share Editor ke ${sa.client_email} -> isi ID-nya (bagian /d/<ID>/edit) ke .env.local\n` +
          'Alternatif: node scripts/sync-lbs.js --create-new (butuh role serviceusage.serviceUsageConsumer untuk SA).',
      );
      process.exit(1);
    }
    console.log('Mencoba membuat spreadsheet baru via spreadsheets.create...');
    try {
      const ss = (
        await request('POST', base, {
          headers: auth,
          body: {
            properties: { title: TITLE },
            sheets: sheetTitles.map((t) => ({ properties: { title: t } })),
          },
        })
      ).json;
      ssId = ss.spreadsheetId;
      console.log(`Spreadsheet dibuat: ${ss.spreadsheetUrl}`);
    } catch (e) {
      console.error(
        'Gagal membuat spreadsheet otomatis. Catatan: service account tanpa role tidak bisa create\n' +
          'dan punya storage Drive 0. Solusi: buat spreadsheet kosong secara manual, share Editor ke\n' +
          `service account, lalu set SIAP_SPREADSHEET_ID di .env.local.\nDetail: ${e.message.split('\n')[0]}`,
      );
      process.exit(1);
    }
  }
  console.log(`Target spreadsheet: ${ssId}`);
  const ssMeta = (await request('GET', `${base}/${ssId}`, { headers: auth })).json;
  console.log(`Judul: "${ssMeta.properties.title}" (pemilik: kamu, karena dibuat manual & dishare)`);
  const existing = new Set(ssMeta.sheets.map((s) => s.properties.title));
  const missing = sheetTitles.filter((t) => !existing.has(t));
  if (missing.length) {
    await request('POST', `${base}/${ssId}:batchUpdate`, {
      headers: auth,
      body: { requests: missing.map((t) => ({ addSheet: { properties: { title: t } } })) },
    });
    console.log(`Sheet ditambahkan: ${missing.join(', ')}`);
  }
  // hapus Sheet1 bawaan jika masih kosong
  if (existing.has('Sheet1')) {
    const probe = await request('GET', `${base}/${ssId}/values/Sheet1!A1:B2`, { headers: auth });
    if (!probe.json.values || probe.json.values.length === 0) {
      await request('POST', `${base}/${ssId}:batchUpdate`, {
        headers: auth,
        body: { requests: [{ deleteSheet: { sheetId: ssMeta.sheets.find((s) => s.properties.title === 'Sheet1').properties.sheetId } }] },
      });
      console.log('Sheet1 bawaan (kosong) dihapus.');
    } else {
      console.log('Sheet1 tidak kosong, dibiarkan.');
    }
  }

  // 2) tulis nilai
  for (const t of sheetTitles) {
    const res = (
      await request(
        'PUT',
        `${base}/${ssId}/values/${encodeURIComponent(t)}!A1?valueInputOption=RAW`,
        { headers: auth, body: { values: values[t] } },
      )
    ).json;
    console.log(`  ${t.padEnd(24)} ${res.updatedRows} baris, ${res.updatedCells} sel`);
  }

  // 3) selesai — spreadsheet milik pengguna, tidak perlu share tambahan

  return { ssId, url: `https://docs.google.com/spreadsheets/d/${ssId}/edit`, counts: Object.fromEntries(sheetTitles.map((t) => [t, values[t].length - 1])) };
}

// ---------------------------------------------------------------- main
async function main() {
  console.log('=== SIAP ALSINTAN — sync LBS per desa ke Google Spreadsheet ===\n');
  console.log(`Sumber : ${path.relative(ROOT, XLSX_FILE)}`);

  const files = readZip(fs.readFileSync(XLSX_FILE));
  const model = extractModel(files);

  if (model.dups.length) {
    console.log(`\nDuplikat dibuang (dedupe): ${model.dups.length} baris`);
    for (const d of model.dups) console.log(`  - ${d.kecamatan}/${d.desa} (dipertahankan: ${d.kept})`);
  }
  if (model.gogoSkipped.length) {
    console.log(`Baris *Gogo dilewati: ${model.gogoSkipped.length}`);
    for (const g of model.gogoSkipped) console.log(`  - ${g.kecamatan}/${g.desa} = ${g.nilai}`);
  }

  const totals = validate(model);
  if (totals.failed) {
    if (!FORCE) {
      console.log(
        '\nSTOP: ada selisih/ masalah di atas. Periksa dulu; jalankan `node scripts/sync-lbs.js --force` ' +
          'jika selisih sudah dipahami dan tetap ingin lanjut (selisih akan dicatat di kolom CATATAN).',
      );
      process.exit(1);
    }
    console.log('\n--force aktif: melanjutkan meski ada selisih (tercatat di CATATAN).');
  }

  const { ssId, url, counts } = await writeSpreadsheet(model, totals);

  console.log('\n=== SELESAI ===');
  console.log(`URL        : ${url}`);
  console.log(`ID         : ${ssId}`);
  console.log(`Baris data : ` + Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(', '));
  console.log('\nTambahkan baris ini ke .env.local untuk re-run idempoten:');
  console.log(`SIAP_SPREADSHEET_ID=${ssId}`);
}

main().catch((e) => {
  console.error('\nGAGAL: ' + (e && e.message ? e.message : e));
  process.exit(1);
});
