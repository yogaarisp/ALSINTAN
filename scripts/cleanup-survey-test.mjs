/** Bersihkan semua baris uji TEST-SURVEY-E2E dari DATA_PROSPEK & DATA_SURVEY */
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

const meta = (await request('GET', api('?fields=sheets.properties'), { headers: H })).json;
const sheetId = (title) => meta.sheets.find((s) => s.properties.title === title).properties.sheetId;

const requests = [];
for (const [title, colIdx, marker] of [['DATA_PROSPEK', 3, 'TEST-SURVEY-E2E'], ['DATA_SURVEY', 2, 'TEST-SURVEY-E2E']]) {
  const rows = (await request('GET', api(`/values/${encodeURIComponent(title)}!A1:Z1000`), { headers: H })).json.values || [];
  rows.forEach((r, i) => {
    if (i > 0 && String(r[colIdx] || '').includes(marker)) {
      requests.push({ deleteDimension: { range: { sheetId: sheetId(title), dimension: 'ROWS', startIndex: i, endIndex: i + 1 } } });
      console.log(`${title} row ${i + 1} ditandai hapus (${String(r[colIdx] || '').slice(0, 30)})`);
    }
  });
}
if (requests.length) {
  requests.reverse();
  for (let i = 0; i < requests.length; i++) {
    await request('POST', api(':batchUpdate'), { headers: H, body: { requests: [requests[i]] } });
  }
}
console.log(`Cleanup selesai: ${requests.length} baris dihapus`);
