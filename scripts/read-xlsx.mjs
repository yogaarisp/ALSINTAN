/**
 * read-xlsx.mjs — SIAP ALSINTAN
 * Baca file .xlsx lokal tanpa dependency tambahan (unzip + parse XML sendiri).
 * Dipakai untuk melihat isi arsip excel/import/*.xlsx tanpa perlu upload dulu.
 *
 * Usage:
 *   node scripts/read-xlsx.mjs <file.xlsx> --sheets
 *   node scripts/read-xlsx.mjs <file.xlsx> --sheet "Nama Tab" --rows 10
 *   node scripts/read-xlsx.mjs <file.xlsx> --sheet 1 --rows 5 --cols 12
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// ── ZIP reader minimal ──────────────────────────────────────────────
function readZip(file) {
  const buf = fs.readFileSync(file);
  // Cari End Of Central Directory
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Bukan file .xlsx / zip valid (EOCD tidak ditemukan)');

  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const entries = new Map();

  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) break;
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.toString('utf8', off + 46, off + 46 + nameLen);
    entries.set(name, { method, compSize, localOff });
    off += 46 + nameLen + extraLen + commentLen;
  }

  function read(name) {
    const e = entries.get(name);
    if (!e) return null;
    const lh = e.localOff;
    if (buf.readUInt32LE(lh) !== 0x04034b50) throw new Error('Header lokal rusak: ' + name);
    const nameLen = buf.readUInt16LE(lh + 26);
    const extraLen = buf.readUInt16LE(lh + 28);
    const start = lh + 30 + nameLen + extraLen;
    const raw = buf.subarray(start, start + e.compSize);
    return e.method === 0 ? raw : zlib.inflateRawSync(raw);
  }

  function names() {
    return [...entries.keys()];
  }

  return { names, read };
}

// ── Parser XML sederhana ────────────────────────────────────────────
const decode = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, '&');

function colToNum(ref) {
  const letters = ref.match(/^[A-Z]+/)[0];
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parseSharedStrings(xml) {
  const out = [];
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>|<si\b[^>]*\/>/g;
  let m;
  while ((m = siRe.exec(xml))) {
    if (!m[1]) {
      out.push('');
      continue;
    }
    let txt = '';
    const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let t;
    while ((t = tRe.exec(m[1]))) txt += t[1];
    out.push(decode(txt));
  }
  return out;
}

function parseSheet(xml, shared) {
  const rows = [];
  const rowRe = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
  let rm;
  while ((rm = rowRe.exec(xml))) {
    const rAttr = rm[1];
    const rNum = Number((rAttr.match(/\br="(\d+)"/) || [])[1] || rows.length + 1);
    const cells = [];
    const cRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm;
    while ((cm = cRe.exec(rm[2]))) {
      const attrs = cm[1] || '';
      const inner = cm[2] || '';
      const ref = (attrs.match(/\br="([A-Z]+\d+)"/) || [])[1];
      const type = (attrs.match(/\bt="([^"]+)"/) || [])[1];
      let val = '';
      if (type === 'inlineStr') {
        let txt = '';
        const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
        let t;
        while ((t = tRe.exec(inner))) txt += t[1];
        val = decode(txt);
      } else {
        const v = (inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/) || [])[1];
        val = v === undefined ? '' : decode(v);
        if (type === 's') val = shared[Number(val)] ?? '';
      }
      if (val !== '') cells[colToNum(ref || 'A1')] = val;
    }
    rows[rNum - 1] = cells;
  }
  for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
  return rows;
}

// ── Main ────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith('--'));
const flag = (n) => argv.includes('--' + n);
const val = (n) => {
  const hit = argv.find((a) => a.startsWith(`--${n}=`));
  if (hit) return hit.slice(n.length + 3);
  const i = argv.indexOf('--' + n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
};

if (!file || !fs.existsSync(file)) {
  console.error('Usage: node scripts/read-xlsx.mjs <file.xlsx> --sheets | --sheet "Tab" [--rows N] [--cols N]');
  process.exit(1);
}

const zip = readZip(file);
const wbXml = zip.read('xl/workbook.xml')?.toString('utf8') || '';
const relsXml = zip.read('xl/_rels/workbook.xml.rels')?.toString('utf8') || '';
const sharedXml = zip.read('xl/sharedStrings.xml')?.toString('utf8') || '';
const shared = sharedXml ? parseSharedStrings(sharedXml) : [];

const relMap = {};
for (const m of relsXml.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
  relMap[m[1]] = m[2].replace(/^\/?xl\//, '').replace(/^\.\//, '');
}

const sheets = [];
for (const m of wbXml.matchAll(/<sheet\b[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*\/?>/g)) {
  const target = relMap[m[2]] || `worksheets/sheet${sheets.length + 1}.xml`;
  const dim = (wbXml.match(new RegExp(`<sheet[^>]*name="${m[1]}"[^>]*>`)) || [])[0] || '';
  sheets.push({ name: decode(m[1]), file: `xl/${target}` });
}

if (!flag('json')) {
  console.log(`File   : ${file}`);
  console.log(`Sheet  : ${sheets.length} tab | sharedStrings: ${shared.length}`);
}

if (flag('sheets') || !val('sheet')) {
  sheets.forEach((s, i) => console.log(`  [${i + 1}] ${s.name}`));
  process.exit(0);
}

const want = val('sheet');
const idx = /^\d+$/.test(want) ? Number(want) - 1 : sheets.findIndex((s) => s.name.toLowerCase() === want.toLowerCase());
if (idx < 0 || !sheets[idx]) {
  console.error(`Tab "${want}" tidak ada.-available: ${sheets.map((s) => s.name).join(' | ')}`);
  process.exit(1);
}
const sheet = sheets[idx];
const rows = parseSheet(zip.read(sheet.file)?.toString('utf8') || '', shared);
const maxRows = Number(val('rows') || 12);
const maxCols = Number(val('cols') || 10);

// --json: keluarkan isi sheet apa adanya (newline di dalam sel dipertahankan)
// supaya bisa dipakai sebagai bahan uji parser tanpa kehilangan karakter.
if (flag('json')) {
  const out = rows.map((cells) => {
    const width = Math.min(maxCols || cells.length, Math.max(cells.length, maxCols || 0));
    const row = [];
    for (let c = 0; c < width; c++) row.push(String(cells[c] ?? ''));
    return row;
  });
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

console.log(`\n=== ${sheet.name} (${rows.length} baris terbaca) ===`);
for (let r = 0; r < Math.min(rows.length, maxRows); r++) {
  const cells = rows[r] || [];
  const parts = [];
  for (let c = 0; c < Math.min(maxCols, Math.max(cells.length, maxCols)); c++) {
    const v = cells[c] ?? '';
    const str = String(v);
    const out = flag('full') ? str : str.length > 26 ? str.slice(0, 24) + '..' : str;
    parts.push(out.replace(/\r?\n/g, ' / '));
  }
  while (parts.length && parts[parts.length - 1] === '') parts.pop();
  console.log(String(r + 1).padStart(3) + ' | ' + parts.join(' | '));
}
if (rows.length > maxRows) console.log(`  ... (${rows.length - maxRows} baris lagi)`);
