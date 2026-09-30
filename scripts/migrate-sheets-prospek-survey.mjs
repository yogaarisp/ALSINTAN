import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAccessToken, request, loadDotEnv } from './xlsx-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
loadDotEnv(path.join(ROOT, '.env.local'));
loadDotEnv(path.join(ROOT, '.env'));

const sa = JSON.parse(fs.readFileSync(path.resolve(ROOT, process.env.GOOGLE_SERVICE_ACCOUNT_JSON), 'utf8'));
const token = await getAccessToken(sa);
const H = { Authorization: `Bearer ${token}` };
const ssId = process.env.SIAP_SPREADSHEET_ID;
const api = (p) => `https://sheets.googleapis.com/v4/spreadsheets/${ssId}${p}`;

console.log('=== MIGRASI SPREADSHEET SIAP ALSINTAN ===');
console.log('Spreadsheet ID:', ssId);

// 1. Ambil metadata sheet
const meta = (await request('GET', api('?fields=sheets.properties'), { headers: H })).json;
const titles = meta.sheets.map((s) => s.properties.title);
console.log('Sheet existing:', titles.join(', '));

// 2. Buat sheet REKAP_PENCAIRAN jika belum ada
if (!titles.includes('REKAP_PENCAIRAN')) {
  console.log('Membuat sheet REKAP_PENCAIRAN...');
  await request('POST', api(':batchUpdate'), {
    headers: H,
    body: {
      requests: [{
        addSheet: {
          properties: {
            title: 'REKAP_PENCAIRAN',
            gridProperties: { rowCount: 1000, columnCount: 12 }
          }
        }
      }]
    }
  });
  console.log('Sheet REKAP_PENCAIRAN berhasil dibuat.');
} else {
  console.log('Sheet REKAP_PENCAIRAN sudah ada.');
}

// 3. Header REKAP_PENCAIRAN
const rekapHeader = [
  'ID_PENCAIRAN',
  'TANGGAL_PENCAIRAN',
  'ID_PROSPEK',
  'ID_SURVEY',
  'NAMA_PROSPEK',
  'KECAMATAN',
  'JENIS_ALSINTAN',
  'PLAFON_PENCAIRAN',
  'ID_ANALIS',
  'NAMA_ANALIS',
  'CATATAN'
];
const rRekap = await request('GET', api('/values/REKAP_PENCAIRAN!A1:Z1'), { headers: H });
if (!rRekap.json.values || rRekap.json.values.length === 0 || rRekap.json.values[0].length === 0) {
  await request('PUT', api('/values/REKAP_PENCAIRAN!A1?valueInputOption=USER_ENTERED'), {
    headers: H,
    body: { values: [rekapHeader] }
  });
  console.log('Header REKAP_PENCAIRAN berhasil ditulis.');
} else {
  console.log('Header REKAP_PENCAIRAN existing:', rRekap.json.values[0].join(' | '));
}

// 4. Update header DATA_PROSPEK
// Header baru: ID_PROSPEK, ID_KECAMATAN, KECAMATAN, NAMA_PROSPEK, KOMODITAS, ID_ANALIS, NAMA_ANALIS, STATUS, TANGGAL, ESTIMASI_ALSINTAN, ESTIMASI_PLAFON, CATATAN
const prospekHeader = [
  'ID_PROSPEK',
  'ID_KECAMATAN',
  'KECAMATAN',
  'NAMA_PROSPEK',
  'KOMODITAS',
  'ID_ANALIS',
  'NAMA_ANALIS',
  'STATUS',
  'TANGGAL',
  'ESTIMASI_ALSINTAN',
  'ESTIMASI_PLAFON',
  'CATATAN'
];

// Baca baris 1 s/d selesai di DATA_PROSPEK
const rProspek = await request('GET', api('/values/DATA_PROSPEK!A1:L1000'), { headers: H });
const pRows = rProspek.json.values || [];
console.log('Total baris di DATA_PROSPEK:', pRows.length);

if (pRows.length > 0) {
  const oldHeader = pRows[0];
  console.log('Header lama DATA_PROSPEK:', oldHeader.join(' | '));
  // Jika kolom 4 masih NAMA_GAPOKTAN dan belum ada ESTIMASI_PLAFON
  if (oldHeader[3] === 'NAMA_GAPOKTAN' || !oldHeader.includes('ESTIMASI_PLAFON')) {
    // Siapkan baris data baru dengan header baru
    const newPRows = [];
    newPRows.push(prospekHeader);
    for (let i = 1; i < pRows.length; i++) {
      const r = pRows[i];
      // Lama: [ID_PROSPEK(0), ID_KECAMATAN(1), KECAMATAN(2), NAMA_GAPOKTAN(3), KOMODITAS(4), ID_ANALIS(5), NAMA_ANALIS(6), STATUS(7), TANGGAL(8), ESTIMASI_ALSINTAN(9), CATATAN(10)]
      // Baru: [ID_PROSPEK(0), ID_KECAMATAN(1), KECAMATAN(2), NAMA_PROSPEK(3), KOMODITAS(4), ID_ANALIS(5), NAMA_ANALIS(6), STATUS(7), TANGGAL(8), ESTIMASI_ALSINTAN(9), ESTIMASI_PLAFON(10), CATATAN(11)]
      const idProspek = r[0] || '';
      const idKec = r[1] || '';
      const kec = r[2] || '';
      const nama = r[3] || '';
      const kom = r[4] || '';
      const idAnalis = r[5] || '';
      const namaAnalis = r[6] || '';
      const status = r[7] || '';
      const tgl = r[8] || '';
      const estAlsintan = r[9] || '';
      const estPlafon = 0;
      const catatan = r[10] || '';
      newPRows.push([idProspek, idKec, kec, nama, kom, idAnalis, namaAnalis, status, tgl, estAlsintan, estPlafon, catatan]);
    }

    // Tulis ulang DATA_PROSPEK
    await request('PUT', api('/values/DATA_PROSPEK!A1?valueInputOption=USER_ENTERED'), {
      headers: H,
      body: { values: newPRows }
    });
    console.log('DATA_PROSPEK berhasil diperbarui dengan header baru!');
  } else {
    console.log('DATA_PROSPEK sudah menggunakan header baru.');
  }
}

// 5. Cek DATA_SURVEY
const rSurvey = await request('GET', api('/values/DATA_SURVEY!A1:Z1'), { headers: H });
if (rSurvey.json.values && rSurvey.json.values.length > 0) {
  const sHeader = rSurvey.json.values[0];
  console.log('Header DATA_SURVEY:', sHeader.join(' | '));
  // Jika kolom C (index 2) adalah NAMA_GAPOKTAN, kita ubah jadi NAMA_PROSPEK
  if (sHeader[2] === 'NAMA_GAPOKTAN') {
    await request('PUT', api('/values/DATA_SURVEY!C1?valueInputOption=USER_ENTERED'), {
      headers: H,
      body: { values: [['NAMA_PROSPEK']] }
    });
    console.log('Header DATA_SURVEY C1 berhasil diubah ke NAMA_PROSPEK');
  }
}

console.log('=== MIGRASI SPREADSHEET SELESAI ===');
