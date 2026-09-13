/**
 * fill-koordinat.mjs — isi LATITUDE/LONGITUDE pusat kecamatan di MASTER_WILAYAH.
 * Koordinat = titik tengah kecamatan (aproksimasi). Idempoten: menimpa nilai lama.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDotEnv, request, getAuthHeader } from './xlsx-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
loadDotEnv(path.join(ROOT, '.env.local'));
loadDotEnv(path.join(ROOT, '.env'));

const sa = JSON.parse(fs.readFileSync(path.resolve(ROOT, process.env.GOOGLE_SERVICE_ACCOUNT_JSON), 'utf8'));
const SS_ID = process.env.SIAP_SPREADSHEET_ID;
const H = await getAuthHeader(sa);
const api = (p) => `https://sheets.googleapis.com/v4/spreadsheets/${SS_ID}${p}`;

// Titik tengah kecamatan Kab. Purworejo (aproksimasi)
const KOORD = {
  'BAGELEN': [-7.7950, 110.0620],
  'BANYUURIP': [-7.6770, 110.0400],
  'BAYAN': [-7.6120, 109.8480],
  'BENER': [-7.5400, 110.0380],
  'BRUNO': [-7.5600, 109.9420],
  'BUTUH': [-7.4780, 109.9110],
  'GEBANG': [-7.5280, 109.9900],
  'GRABAG': [-7.6730, 109.9530],
  'KALIGESING': [-7.5940, 109.7800],
  'KEMIRI': [-7.4500, 110.0120],
  'KUTOARJO': [-7.4780, 109.9680],
  'LOANO': [-7.5880, 109.9200],
  'NGOMBOL': [-7.6550, 109.9140],
  'PITURUH': [-7.6370, 109.8750],
  'PURWODADI': [-7.6620, 109.8100],
  'PURWOREJO': [-7.7120, 110.0080],
};

const rows = (await request('GET', api('/values/MASTER_WILAYAH!A1:J100'), { headers: H })).json.values;
const header = rows[0].map((h) => String(h).trim().toUpperCase());
const colId = header.indexOf('ID_KECAMATAN');
const colNama = header.indexOf('KECAMATAN');
const colLat = header.indexOf('LATITUDE');
const colLng = header.indexOf('LONGITUDE');
if (colLat < 0 || colLng < 0 || colNama < 0) {
  console.error('Kolom LATITUDE/LONGITUDE/KECAMATAN tidak ditemukan:', header.join(', '));
  process.exit(1);
}
const colLetter = (idx) => String.fromCharCode(65 + idx);

const valueRanges = [];
let filled = 0;
for (let i = 1; i < rows.length; i++) {
  const nama = String(rows[i][colNama] || '').trim().toUpperCase();
  const koord = KOORD[nama];
  if (!koord) {
    console.warn(`Lewati (tidak ada di daftar): ${nama}`);
    continue;
  }
  valueRanges.push({
    range: `MASTER_WILAYAH!${colLetter(colLat)}${i + 1}`,
    values: [[koord[0]]],
  });
  valueRanges.push({
    range: `MASTER_WILAYAH!${colLetter(colLng)}${i + 1}`,
    values: [[koord[1]]],
  });
  filled++;
}

if (valueRanges.length) {
  await request('POST', api('/values:batchUpdate'), {
    headers: H,
    body: { valueInputOption: 'USER_ENTERED', data: valueRanges },
  });
}
console.log(`Koordinat terisi untuk ${filled}/${rows.length - 1} kecamatan`);
