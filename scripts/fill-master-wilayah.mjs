/**
 * fill-master-wilayah.mjs — isi kolom DATA_PANEN_TON & JUMLAH_GAPOKTAN (& KOMODITAS)
 * di sheet MASTER_WILAYAH (spreadsheet baseline) dari file excel lokal:
 *  - Poktan 2026.xlsx           -> jumlah kelompok tani per kecamatan
 *  - Produksi Padi Sawah 2025.xlsx (tab "Produksi", kolom Produksi (Ton)) -> panen padi sawah
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadDotEnv,
  request,
  getAuthHeader,
  readZip,
  parseWorkbook,
  parseSharedStrings,
  parseStyles,
  parseSheetXml,
  normKey,
  toNum,
} from './xlsx-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
loadDotEnv(path.join(ROOT, '.env.local'));
loadDotEnv(path.join(ROOT, '.env'));

const SA_FILE = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const SS_ID = process.env.SIAP_SPREADSHEET_ID;
const EXCEL_DIR = path.join(ROOT, 'excel');
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
const KOMODITAS = 'Padi Sawah, Padi Ladang, Jagung, Kedele, Kacang Hijau, Kacang Tanah, Ubi Kayu, Ubi Jalar';

function loadSheets(file) {
  const files = readZip(fs.readFileSync(file));
  const shared = parseSharedStrings(files);
  const styles = parseStyles(files);
  return parseWorkbook(files).map((s) => ({
    name: s.name,
    rows: parseSheetXml(files[s.file].toString('utf8'), { shared, styles }),
  }));
}

// ---------------------------------------------------------------- 1. gapoktan
const poktanSheets = loadSheets(path.join(EXCEL_DIR, 'Poktan 2026.xlsx'));
const gapoktan = new Map(); // normKey(kecamatan) -> { name, count, anggota }
for (const sh of poktanSheets) {
  let count = 0;
  let anggota = 0;
  for (const { cells } of sh.rows) {
    const nama = (cells[1] || '').trim();
    if (!nama) continue;
    if (/^(no|nama poktan|jumlah|total)$/i.test(nama) || /jumlah/i.test(nama)) continue;
    count++;
    anggota += toNum(cells[3]) || 0;
  }
  gapoktan.set(normKey(sh.name), { name: sh.name.toUpperCase(), count, anggota: Math.round(anggota) });
}

// ---------------------------------------------------------------- 2. produksi padi sawah
const prodSheets = loadSheets(path.join(EXCEL_DIR, 'Produksi Padi Sawah 2025.xlsx'));
const prodTab = prodSheets.find((s) => s.name.toLowerCase() === 'produksi');
const produksi = new Map(); // normKey(kecamatan) -> ton (padi sawah)
for (const { cells } of prodTab.rows) {
  const no = toNum(cells[0]);
  const kec = (cells[1] || '').trim();
  if (no === null || !kec || /jumlah|total/i.test(kec)) continue;
  const ton = toNum(cells[5]);
  if (ton === null) continue;
  produksi.set(normKey(kec), { name: kec.replace(/\s+/g, ' ').toUpperCase(), ton });
}

// ---------------------------------------------------------------- 3. tulis ke MASTER_WILAYAH
async function main() {
  const sa = JSON.parse(fs.readFileSync(path.join(ROOT, SA_FILE), 'utf8'));
  const auth = await getAuthHeader(sa);
  const base = `${SHEETS}/${SS_ID}`;

  const cur = (
    await request('GET', `${base}/values/${encodeURIComponent('MASTER_WILAYAH')}!A1:J100`, { headers: auth })
  ).json.values || [];
  const header = cur[0];
  console.log('Header MASTER_WILAYAH :', header.join(' | '));

  const updated = [header];
  const report = [];
  for (let i = 1; i < cur.length; i++) {
    const row = cur[i];
    const kec = (row[1] || '').trim();
    if (!kec) {
      updated.push(row);
      continue;
    }
    const g = gapoktan.get(normKey(kec));
    const p = produksi.get(normKey(kec));
    if (!g) report.push(`  ! ${kec}: sheet Poktan tidak ditemukan`);
    if (!p) report.push(`  ! ${kec}: baris produksi tidak ditemukan`);
    const next = [...row];
    while (next.length < 10) next.push('');
    next[4] = p ? Math.round(p.ton * 1000) / 1000 : next[4]; // E: DATA_PANEN_TON
    next[5] = g ? g.count : next[5]; // F: JUMLAH_GAPOKTAN
    next[6] = KOMODITAS; // G: KOMODITAS
    updated.push(next);
    report.push(
      `  ${kec.padEnd(12)} gapoktan=${String(g ? g.count : '-').padStart(4)}  anggota=${String(g ? g.anggota : '-').padStart(5)}  produksi_ton=${p ? p.ton.toFixed(2) : '-'}`,
    );
  }

  console.log('\nRingkasan pengisian:');
  for (const line of report) console.log(line);

  const res = (
    await request('PUT', `${base}/values/${encodeURIComponent('MASTER_WILAYAH')}!A1?valueInputOption=RAW`, {
      headers: auth,
      body: { values: updated },
    })
  ).json;
  console.log(`\nMASTER_WILAYAH diperbarui: ${res.updatedRows} baris, ${res.updatedCells} sel`);
  console.log(`URL: https://docs.google.com/spreadsheets/d/${SS_ID}/edit`);
}

main().catch((e) => {
  console.error('\nGAGAL: ' + (e && e.message ? e.message : e));
  process.exit(1);
});
