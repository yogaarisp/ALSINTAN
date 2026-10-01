/**
 * SIAP ALSINTAN — Apps Script Web App (middleware web <-> spreadsheet)
 * ============================================================
 * Deploy: Extensions -> Apps Script (spreadsheet "SIAP ALSINTAN - Baseline")
 *         Deploy > New deployment > Web app
 *         Execute as: Me | Who has access: Anyone
 *
 * Kontrak API: lihat API.md (response wrapper { success, data, error, timestamp })
 * Action GET  : ping, getDashboardKPI, getWilayah, getProspek, getAnalis, getSurvey, getPoktan
 * Action POST : createProspek, updateProspek, deleteProspek, restoreProspek,
 *               createSurvey, createAnalis, updateAnalisStatus, authCheck
 * Catatan     : deleteProspek = nonaktifkan (soft delete), bukan hapus baris,
 *               supaya baris DATA_SURVEY yang mereferensikan ID_PROSPEK tidak yatim.
 * Catatan POST: frontend mengirim Content-Type text/plain (hindari preflight CORS)
 */

var SPREADSHEET_ID = '1EZ3XYXRaCkJmHhLbhVkrzKqcFrtcN7DX3k7BNZc20F4';
var TZ = 'Asia/Jakarta';

var SHEETS = {
  WILAYAH: 'MASTER_WILAYAH',
  DESA: 'MASTER_DESA',
  PROSPEK: 'DATA_PROSPEK',
  SURVEY: 'DATA_SURVEY',
  PENCAIRAN: 'REKAP_PENCAIRAN',
  ANALIS: 'MASTER_ANALIS',
  USERS: 'USERS',
  CONFIG: 'CONFIG_PRIORITAS',
};

// Spreadsheet sumber lain di folder ALSINTAN — dibaca live oleh web (read-only)
var SOURCES = [
  { key: 'poktan', nama: 'Poktan 2026', kategori: 'Gapoktan', id: '1xd4G2iCUBvyqUwuTni3anBOJhoQwmb-TNW1qOE4YBzg' },
  { key: 'padi_sawah', nama: 'Produksi Padi Sawah 2025', kategori: 'Produksi', id: '1NEEZarMvHL11z2rXx0dS31KuiI0tAMJCIH_b11eYFQo' },
  { key: 'padi_ladang', nama: 'Produksi Padi Ladang 2025', kategori: 'Produksi', id: '1G3x0B9Oxi4rfMoWTBJ3Ie-rIL2-dCrPV9vlh0BahvqQ' },
  { key: 'beras', nama: 'Produksi Beras 2025', kategori: 'Produksi', id: '1s41NFQjZBdlQWW_6d-NBNMnEkYLufyf-Z-bCgaxOiC4' },
  { key: 'rekap_alsintan', nama: 'Rekap Alsintan s.d. April 2026', kategori: 'Alsintan', id: '1z5zDzvksX5xT6C_OvM_Kv_cFYPuGdOPvAKxsxp7LBoY' },
  { key: 'rekap_bulanan', nama: 'Rekap Bulanan SP TP', kategori: 'SP TP', id: '1DzlqupA0M-6Ehs6QSwTo_o7oU_g7uVYROCSr8aiuzt8' },
  { key: 'baseline', nama: 'SIAP ALSINTAN - Baseline (MASTER)', kategori: 'Database', id: '1EZ3XYXRaCkJmHhLbhVkrzKqcFrtcN7DX3k7BNZc20F4' },
];

// ----------------------------------------------------------- entry points
function doGet(e) {
  return handle(e && e.parameter ? e.parameter : {});
}

function doPost(e) {
  var params = {};
  try {
    if (e && e.postData && e.postData.contents) params = JSON.parse(e.postData.contents) || {};
  } catch (err) {
    return json({ success: false, error: 'Body POST bukan JSON valid' });
  }
  if (e && e.parameter) {
    for (var k in e.parameter) {
      if (!(k in params)) params[k] = e.parameter[k];
    }
  }
  return handle(params);
}

function handle(p) {
  var action = String(p && p.action || '');
  try {
    var data;
    switch (action) {
      case 'ping': data = { ok: true, time: new Date().toISOString() }; break;
      case 'getDashboardKPI': data = getDashboardKPI(); break;
      case 'getWilayah': data = apiGetWilayah(p); break;
      case 'getProspek': data = apiGetProspek(p); break;
      case 'getSurvey': data = apiGetSurvey(p); break;
      case 'getAnalis': data = apiGetAnalis(); break;
      case 'getSources': data = apiGetSources(); break;
      case 'getSourceData': data = apiGetSourceData(p); break;
      case 'getPoktan': data = apiGetPoktan(p); break;
      case 'createProspek': data = apiCreateProspek(p); break;
      case 'updateProspek': data = apiUpdateProspek(p); break;
      case 'deleteProspek': data = apiDeleteProspek(p); break;
      case 'restoreProspek': data = apiRestoreProspek(p); break;
      case 'createSurvey': data = apiCreateSurvey(p); break;
      case 'updateSurvey': data = apiUpdateSurvey(p); break;
      case 'getRekapPencairan': data = apiGetRekapPencairan(p); break;
      case 'createAnalis': data = apiCreateAnalis(p); break;
      case 'updateAnalisStatus': data = apiUpdateAnalisStatus(p); break;
      case 'authCheck': data = apiAuthCheck(p); break;
      case 'getPriorityConfig': data = apiGetPriorityConfig(); break;
      case 'updatePriorityConfig': data = apiUpdatePriorityConfig(p); break;
      // Alias lama (AO) — tetap dilayani agar tab browser lama tidak error saat deploy
      case 'getAO': data = apiGetAnalis(); break;
      case 'createAO': data = apiCreateAnalis(p); break;
      case 'updateAOStatus': data = apiUpdateAnalisStatus(p); break;
      default: return json({ success: false, error: 'Unknown action: ' + action });
    }
    return json({ success: true, data: data, timestamp: new Date().toISOString() });
  } catch (err) {
    return json({
      success: false,
      error: String(err && err.message ? err.message : err),
      timestamp: new Date().toISOString(),
    });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Smoke test untuk otorisasi: jalankan sekali dari editor (Run)
function setup() {
  var log = [];
  [SHEETS.WILAYAH, SHEETS.PROSPEK, SHEETS.SURVEY, SHEETS.ANALIS].forEach(function (name) {
    log.push(name + ': ' + readRows(name).length + ' baris');
  });
  Logger.log(log.join('\n'));
  Logger.log(JSON.stringify(getDashboardKPI()));
}

// ----------------------------------------------------------- helpers
function ss() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function str(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  var s = String(v).trim();
  if (!s) return null;
  if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) s = s.replace(/\./g, '').replace(/,/g, '.');
  else s = s.replace(/,/g, '.');
  var n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function dateStr(v) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  }
  return String(v).trim();
}

function isoStr(v) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return v.toISOString();
  return String(v).trim();
}

function splitList(v) {
  return str(v)
    .split(',')
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s !== ''; });
}

// Alias nama tab lama -> dipakai sebagai fallback supaya urutan deploy
// (spreadsheet lebih dulu vs Apps Script lebih dulu) tidak berpengaruh.
var SHEET_ALIAS = {
  MASTER_ANALIS: ['MASTER_AO'],
};

// Alias nama kolom lama -> kolom baru. Header dinormalisasi saat baca baris,
// sehingga spreadsheet yang belum dimigrasi tetap bisa dibaca.
var HEADER_ALIAS = {
  ID_AO: 'ID_ANALIS',
  NAMA_AO: 'NAMA_ANALIS',
  NAMA_GAPOKTAN: 'NAMA_PROSPEK',
  PLAFON: 'ESTIMASI_PLAFON',
  HARGA: 'ESTIMASI_HARGA',
};

function getSheet(name) {
  var sheet = ss().getSheetByName(name);
  if (sheet) return sheet;
  var aliases = SHEET_ALIAS[name] || [];
  for (var i = 0; i < aliases.length; i++) {
    var alt = ss().getSheetByName(aliases[i]);
    if (alt) return alt;
  }
  return null;
}

function readRows(name) {
  var sheet = getSheet(name);
  if (!sheet) throw new Error('Sheet tidak ditemukan: ' + name);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var header = values[0].map(function (h) {
    var key = str(h).toUpperCase();
    return HEADER_ALIAS[key] || key;
  });
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var empty = true;
    for (var c = 0; c < row.length; c++) {
      if (str(row[c]) !== '') { empty = false; break; }
    }
    if (empty) continue;
    var obj = {};
    for (var c2 = 0; c2 < header.length; c2++) {
      if (header[c2]) obj[header[c2]] = row[c2];
    }
    obj._row = i + 1;
    rows.push(obj);
  }
  return rows;
}

function nextId(sheetName, idColumn, prefix) {
  var rows = readRows(sheetName);
  var max = 0;
  rows.forEach(function (r) {
    var v = str(r[idColumn]);
    // Hanya ID dengan prefix yang sama yang ikut dihitung. Kolom ID_PROSPEK
    // juga berisi ID Poktan numerik (mis. 5098431) dari Master Poktan 2026 dan
    // itu tidak boleh menggeser nomor urut P001, P002, ...
    if (prefix && v.toUpperCase().indexOf(String(prefix).toUpperCase()) !== 0) return;
    var m = v.match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  var n = max + 1;
  return prefix + (n < 10 ? '00' + n : n < 100 ? '0' + n : String(n));
}

function appendRow(sheetName, headers, obj) {
  var sheet = getSheet(sheetName);
  if (!sheet) throw new Error('Sheet tidak ditemukan: ' + sheetName);
  var row = headers.map(function (h) {
    var v = obj[h];
    if (v === undefined || v === null) return '';
    if (typeof v === 'string' && /^[=+\-@]/.test(v)) v = "'" + v;
    return v;
  });
  sheet.appendRow(row);
}

// Tulis ulang beberapa sel pada satu baris yang sudah ada, dicocokkan lewat
// nama kolom (bukan nomor kolom) supaya aman terhadap susunan header yang
// berbeda. Nilai kosong/undefined dihapus supaya tidak menimpa kolom lain.
function updateRowCells(sheetName, rowIdx, valuesByColumn) {
  var sheet = getSheet(sheetName);
  if (!sheet) throw new Error('Sheet tidak ditemukan: ' + sheetName);
  var lastCol = sheet.getLastColumn();
  var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    var key = str(h).toUpperCase();
    return HEADER_ALIAS[key] || key;
  });
  Object.keys(valuesByColumn).forEach(function (col) {
    var idx = header.indexOf(String(col).toUpperCase());
    if (idx < 0) {
      throw new Error('Kolom tidak ditemukan di ' + sheetName + ': ' + col);
    }
    var v = valuesByColumn[col];
    if (v === undefined) return; // kolom tidak dikirim -> jangan sentuh
    if (v === null) v = '';
    if (typeof v === 'string' && /^[=+\-@]/.test(v)) v = "'" + v;
    sheet.getRange(rowIdx, idx + 1).setValue(v);
  });
  var obj = {};
  header.forEach(function (h, i) {
    if (h) obj[h] = sheet.getRange(rowIdx, i + 1).getValue();
  });
  return obj;
}

// ----------------------------------------------------------- mappers
function mapWilayah(r) {
  return {
    idKecamatan: str(r['ID_KECAMATAN']),
    kecamatan: str(r['KECAMATAN']),
    kabupaten: str(r['KABUPATEN']),
    luasLahan: num(r['LUAS_LAHAN_HA']),
    dataPanen: num(r['DATA_PANEN_TON']),
    jumlahGapoktan: num(r['JUMLAH_GAPOKTAN']),
    komoditas: splitList(r['KOMODITAS']),
    koordinatLat: num(r['LATITUDE']),
    koordinatLng: num(r['LONGITUDE']),
  };
}

function mapProspek(r) {
  var nama = str(r['NAMA_PROSPEK']) || str(r['NAMA_GAPOKTAN']);
  return {
    idProspek: str(r['ID_PROSPEK']),
    idKecamatan: str(r['ID_KECAMATAN']),
    kecamatan: str(r['KECAMATAN']),
    namaProspek: nama,
    namaGapoktan: nama,
    komoditas: str(r['KOMODITAS']),
    idAnalis: str(r['ID_ANALIS']),
    namaAnalis: str(r['NAMA_ANALIS']),
    status: str(r['STATUS']),
    tanggal: dateStr(r['TANGGAL']),
    estimasiKebutuhan: str(r['ESTIMASI_ALSINTAN']),
    estimasiPlafon: num(r['ESTIMASI_PLAFON']) || 0,
    catatan: str(r['CATATAN']),
  };
}

function mapSurvey(r) {
  var nama = str(r['NAMA_PROSPEK']) || str(r['NAMA_GAPOKTAN']);
  return {
    idSurvey: str(r['ID_SURVEY']),
    idProspek: str(r['ID_PROSPEK']),
    namaProspek: nama,
    namaGapoktan: nama,
    namaKetua: str(r['NAMA_KETUA']),
    jumlahAnggota: num(r['JUMLAH_ANGGOTA']),
    luasSawah: num(r['LUAS_SAWAH_AKTUAL']),
    jenisAlsintan: str(r['JENIS_ALSINTAN']),
    estimasiHarga: num(r['ESTIMASI_HARGA']) || 0,
    estimasiPlafon: num(r['ESTIMASI_HARGA']) || 0,
    latitude: num(r['LATITUDE']),
    longitude: num(r['LONGITUDE']),
    accuracy: num(r['ACCURACY_M']),
    catatan: str(r['CATATAN']),
    idAnalis: str(r['ID_ANALIS']),
    namaAnalis: str(r['NAMA_ANALIS']),
    timestamp: isoStr(r['TIMESTAMP']),
    status: str(r['STATUS']),
    fotoUrl: str(r['FOTO_URL']),
  };
}

function mapRekapPencairan(r) {
  return {
    idPencairan: str(r['ID_PENCAIRAN']),
    tanggalPencairan: dateStr(r['TANGGAL_PENCAIRAN']),
    idProspek: str(r['ID_PROSPEK']),
    idSurvey: str(r['ID_SURVEY']),
    namaProspek: str(r['NAMA_PROSPEK']),
    kecamatan: str(r['KECAMATAN']),
    jenisAlsintan: str(r['JENIS_ALSINTAN']),
    plafonPencairan: num(r['PLAFON_PENCAIRAN']) || 0,
    idAnalis: str(r['ID_ANALIS']),
    namaAnalis: str(r['NAMA_ANALIS']),
    catatan: str(r['CATATAN']),
  };
}

function mapAnalis(r) {
  return {
    idAnalis: str(r['ID_ANALIS']),
    namaAnalis: str(r['NAMA_ANALIS']),
    wilayah: splitList(r['WILAYAH']),
    status: str(r['STATUS']),
    email: str(r['EMAIL']),
  };
}

// ----------------------------------------------------------- read actions
function getDashboardKPI() {
  var wil = readRows(SHEETS.WILAYAH).map(mapWilayah);
  var prospek = readRows(SHEETS.PROSPEK).map(mapProspek);
  var analis = readRows(SHEETS.ANALIS).map(mapAnalis);
  var totalLuasLahan = 0;
  var totalGapoktan = 0;
  wil.forEach(function (w) {
    totalLuasLahan += w.luasLahan || 0;
    totalGapoktan += w.jumlahGapoktan || 0;
  });
  return {
    totalKecamatan: wil.length,
    totalGapoktan: Math.round(totalGapoktan),
    totalLuasLahan: Math.round(totalLuasLahan * 100) / 100,
    prospekBaru: prospek.filter(function (p) { return p.status === 'BARU'; }).length,
    analisAktif: analis.filter(function (a) { return a.status === 'AKTIF'; }).length,
  };
}

function apiGetWilayah(p) {
  var data = readRows(SHEETS.WILAYAH).map(mapWilayah);
  if (p.idKecamatan) {
    return data.filter(function (w) { return w.idKecamatan === str(p.idKecamatan); })[0] || null;
  }
  if (p.kabupaten) {
    var kb = str(p.kabupaten).toLowerCase();
    data = data.filter(function (w) { return w.kabupaten.toLowerCase() === kb; });
  }
  if (p.kecamatan) {
    var kc = str(p.kecamatan).toLowerCase();
    data = data.filter(function (w) { return w.kecamatan.toLowerCase().indexOf(kc) >= 0; });
  }
  if (p.komoditas) {
    var km = str(p.komoditas).toLowerCase();
    data = data.filter(function (w) {
      return w.komoditas.some(function (k) { return k.toLowerCase() === km; });
    });
  }
  data.sort(function (a, b) { return a.idKecamatan < b.idKecamatan ? -1 : 1; });
  return data;
}

function paginate(list, p) {
  var page = Math.max(1, parseInt(p.page, 10) || 1);
  var limit = parseInt(p.limit, 10);
  if (!limit || limit < 1) limit = 20;
  if (limit > 100) limit = 100;
  var total = list.length;
  var start = (page - 1) * limit;
  return {
    items: list.slice(start, start + limit),
    total: total,
    page: page,
    limit: limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

function apiGetProspek(p) {
  var data = readRows(SHEETS.PROSPEK).map(mapProspek);
  if (p.idProspek) {
    return data.filter(function (x) { return x.idProspek === str(p.idProspek); })[0] || null;
  }
  if (p.status) data = data.filter(function (x) { return x.status === str(p.status); });
  if (p.idAnalis) data = data.filter(function (x) { return x.idAnalis === str(p.idAnalis); });
  if (p.komoditas) data = data.filter(function (x) { return x.komoditas === str(p.komoditas); });
  if (p.kecamatan) {
    var kc = str(p.kecamatan).toLowerCase();
    data = data.filter(function (x) { return x.kecamatan.toLowerCase().indexOf(kc) >= 0; });
  }
  if (p.search) {
    var q = str(p.search).toLowerCase();
    data = data.filter(function (x) {
      var n = (x.namaProspek || x.namaGapoktan || '').toLowerCase();
      return n.indexOf(q) >= 0 ||
        x.kecamatan.toLowerCase().indexOf(q) >= 0 ||
        x.komoditas.toLowerCase().indexOf(q) >= 0;
    });
  }
  if (p.dateFrom) data = data.filter(function (x) { return x.tanggal >= str(p.dateFrom); });
  if (p.dateTo) data = data.filter(function (x) { return x.tanggal <= str(p.dateTo); });
  data.sort(function (a, b) { return a.idProspek < b.idProspek ? -1 : 1; });
  return paginate(data, p);
}

function apiGetSurvey(p) {
  var data = readRows(SHEETS.SURVEY).map(mapSurvey);
  if (p.idSurvey) {
    return data.filter(function (x) { return x.idSurvey === str(p.idSurvey); })[0] || null;
  }
  if (p.idProspek) data = data.filter(function (x) { return x.idProspek === str(p.idProspek); });
  if (p.status) data = data.filter(function (x) { return x.status === str(p.status); });
  if (p.idAnalis) data = data.filter(function (x) { return x.idAnalis === str(p.idAnalis); });
  data.sort(function (a, b) { return a.idSurvey < b.idSurvey ? -1 : 1; });
  return paginate(data, p);
}

function apiGetRekapPencairan(p) {
  var data = readRows(SHEETS.PENCAIRAN).map(mapRekapPencairan);
  if (p.idProspek) data = data.filter(function (x) { return x.idProspek === str(p.idProspek); });
  if (p.kecamatan) {
    var kc = str(p.kecamatan).toLowerCase();
    data = data.filter(function (x) { return x.kecamatan.toLowerCase().indexOf(kc) >= 0; });
  }
  if (p.search) {
    var q = str(p.search).toLowerCase();
    data = data.filter(function (x) {
      return (x.namaProspek || '').toLowerCase().indexOf(q) >= 0 ||
        (x.kecamatan || '').toLowerCase().indexOf(q) >= 0 ||
        (x.jenisAlsintan || '').toLowerCase().indexOf(q) >= 0;
    });
  }
  data.sort(function (a, b) { return a.idPencairan < b.idPencairan ? 1 : -1; });
  return paginate(data, p);
}

function apiGetAnalis() {
  var analis = readRows(SHEETS.ANALIS).map(mapAnalis);
  var prospek = readRows(SHEETS.PROSPEK);
  var survey = readRows(SHEETS.SURVEY);
  analis.forEach(function (a) {
    a.totalProspek = prospek.filter(function (r) { return str(r['ID_ANALIS']) === a.idAnalis; }).length;
    a.totalSurvey = survey.filter(function (r) { return str(r['ID_ANALIS']) === a.idAnalis; }).length;
  });
  analis.sort(function (x, y) { return x.idAnalis < y.idAnalis ? -1 : 1; });
  return analis;
}

// ----------------------------------------------------------- auth
// Normalisasi role: sheet USERS masih bisa berisi 'AO' (penamaan lama) -> 'ANALIS'
function normalisasiRole(v) {
  var r = str(v).toUpperCase();
  if (r === 'AO' || r === 'ACCOUNT OFFICER') return 'ANALIS';
  return r;
}

// Login Google: verifikasi email terdaftar di sheet USERS
function apiAuthCheck(p) {
  var email = str(p.email).toLowerCase();
  if (!email) throw new Error('Email wajib diisi');
  var rows = readRows(SHEETS.USERS);
  var found = null;
  rows.forEach(function (r) {
    if (str(r['EMAIL']).toLowerCase() === email) found = r;
  });
  if (!found) throw new Error('Email ' + email + ' tidak terdaftar sebagai pengguna SIAP ALSINTAN');
  var status = str(found['STATUS']) || 'AKTIF';
  if (status !== 'AKTIF') throw new Error('Akun tidak aktif. Hubungi admin.');
  return {
    email: email,
    nama: str(found['NAMA']),
    role: normalisasiRole(found['ROLE']),
    idAnalis: str(found['ID_ANALIS']) || str(found['ID_AO']),
  };
}

// ----------------------------------------------------------- write actions
function apiCreateProspek(p) {
  var nama = str(p.namaProspek) || str(p.namaGapoktan);
  if (!str(p.idKecamatan) || !nama) {
    throw new Error('idKecamatan dan namaProspek wajib diisi');
  }
  var wil = apiGetWilayah({ idKecamatan: str(p.idKecamatan) });
  if (!wil) throw new Error('idKecamatan tidak dikenal: ' + str(p.idKecamatan));
  // Analis penanggung jawab mengikuti pengguna yang sedang login. Tanpa payload
  // idAnalis (mis. panggilan lama dari integrasi lain) tetap jatuh ke AN001
  // supaya perilakunya sama seperti sebelumnya.
  var idAnalis = str(p.idAnalis) || 'AN001';
  var analis = readRows(SHEETS.ANALIS).map(mapAnalis).filter(function (a) { return a.idAnalis === idAnalis; })[0];
  if (!analis) throw new Error('idAnalis tidak dikenal: ' + idAnalis);
  var obj = {
    'ID_PROSPEK': nextId(SHEETS.PROSPEK, 'ID_PROSPEK', 'P'),
    'ID_KECAMATAN': wil.idKecamatan,
    'KECAMATAN': wil.kecamatan,
    'NAMA_PROSPEK': nama,
    'KOMODITAS': str(p.komoditas) || 'Padi',
    'ID_ANALIS': analis.idAnalis,
    'NAMA_ANALIS': analis.namaAnalis,
    'STATUS': str(p.status) || 'BARU',
    'TANGGAL': str(p.tanggal) || Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'),
    'ESTIMASI_ALSINTAN': str(p.estimasiKebutuhan) || str(p.kebutuhanAlat),
    'ESTIMASI_PLAFON': num(p.estimasiPlafon) || 0,
    'CATATAN': str(p.catatan),
  };
  appendRow(SHEETS.PROSPEK, Object.keys(obj), obj);
  return mapProspek(obj);
}

// Status yang sah untuk DATA_PROSPEK. Dipakai updateProspek agar tidak ada
// salah ketik yang mengacaukan filter status di frontend.
var STATUS_PROSPEK = [
  'BARU', 'DALAM_PROSPEK', 'SURVEY', 'POTENSIAL',
  'TIDAK_POTENSIAL', 'CLOSING', 'DISBURSE', 'CAIR',
];

function findProspekRow(idProspek) {
  var rows = readRows(SHEETS.PROSPEK);
  var found = null;
  rows.forEach(function (r) {
    if (str(r['ID_PROSPEK']) === idProspek) found = r;
  });
  if (!found) throw new Error('Prospek tidak ditemukan: ' + idProspek);
  return found;
}

// Ubah isi satu prospek. ID_PROSPEK, ID_KECAMATAN, KECAMATAN, dan TANGGAL
// sengaja tidak bisa diubah: ID jadi kunci relasi ke DATA_SURVEY, dan
// kecamatan/Tanggal adalah jejak registrasi.
function apiUpdateProspek(p) {
  var idProspek = str(p.idProspek);
  if (!idProspek) throw new Error('idProspek wajib diisi');
  var target = findProspekRow(idProspek);

  var patch = {};
  if (p.namaProspek !== undefined) patch['NAMA_PROSPEK'] = str(p.namaProspek);
  else if (p.namaGapoktan !== undefined) patch['NAMA_PROSPEK'] = str(p.namaGapoktan);
  if (p.komoditas !== undefined) patch['KOMODITAS'] = str(p.komoditas);
  if (p.estimasiKebutuhan !== undefined) patch['ESTIMASI_ALSINTAN'] = str(p.estimasiKebutuhan);
  else if (p.kebutuhanAlat !== undefined) patch['ESTIMASI_ALSINTAN'] = str(p.kebutuhanAlat);
  if (p.estimasiPlafon !== undefined) patch['ESTIMASI_PLAFON'] = num(p.estimasiPlafon);
  if (p.catatan !== undefined) patch['CATATAN'] = str(p.catatan);

  if (p.status !== undefined && str(p.status)) {
    var st = str(p.status).toUpperCase();
    if (STATUS_PROSPEK.indexOf(st) < 0) {
      throw new Error('Status tidak dikenal: ' + p.status + '. Pilihan: ' + STATUS_PROSPEK.join(', '));
    }
    patch['STATUS'] = st;
    if (st === 'DISBURSE' || st === 'CAIR') {
      try {
        catatRekapPencairan({
          idProspek: idProspek,
          idSurvey: '',
          namaProspek: patch['NAMA_PROSPEK'] || str(target['NAMA_PROSPEK']) || str(target['NAMA_GAPOKTAN']),
          kecamatan: str(target['KECAMATAN']),
          jenisAlsintan: patch['ESTIMASI_ALSINTAN'] || str(target['ESTIMASI_ALSINTAN']),
          plafonPencairan: patch['ESTIMASI_PLAFON'] !== undefined ? patch['ESTIMASI_PLAFON'] : (num(target['ESTIMASI_PLAFON']) || 0),
          idAnalis: patch['ID_ANALIS'] || str(target['ID_ANALIS']),
          namaAnalis: patch['NAMA_ANALIS'] || str(target['NAMA_ANALIS']),
          catatan: 'Disburse dari pipeline prospek'
        });
      } catch (err) {}
    }
  }

  if (p.idAnalis !== undefined && str(p.idAnalis)) {
    var idAnalis = str(p.idAnalis);
    var analis = readRows(SHEETS.ANALIS).map(mapAnalis).filter(function (a) {
      return a.idAnalis === idAnalis;
    })[0];
    if (!analis) throw new Error('idAnalis tidak dikenal: ' + idAnalis);
    if (analis.status !== 'AKTIF') {
      throw new Error('Analis ' + idAnalis + ' berstatus ' + analis.status + ', tidak bisa ditugaskan');
    }
    patch['ID_ANALIS'] = analis.idAnalis;
    patch['NAMA_ANALIS'] = analis.namaAnalis;
  }

  if (!Object.keys(patch).length) {
    throw new Error('Tidak ada perubahan yang dikirim');
  }
  var obj = updateRowCells(SHEETS.PROSPEK, target._row, patch);
  return mapProspek(obj);
}

// Hapus prospek = nonaktifkan (soft delete): status jadi TIDAK_POTENSIAL dan
// CATATAN diberi penanda, barisnya tetap di sheet. Alasannya: baris di
// DATA_SURVEY mereferensikan ID_PROSPEK, jadi menghapus baris induknya
// membuat data lapangan yatim dan KPI/monitoring ikut rusak.
function apiDeleteProspek(p) {
  var idProspek = str(p.idProspek);
  if (!idProspek) throw new Error('idProspek wajib diisi');
  var target = findProspekRow(idProspek);

  var survey = readRows(SHEETS.SURVEY).filter(function (r) {
    return str(r['ID_PROSPEK']) === idProspek;
  });
  if (str(target['STATUS']).toUpperCase() === 'TIDAK_POTENSIAL') {
    return {
      ok: true, sudahNonaktif: true, jumlahSurvey: survey.length,
      prospek: mapProspek(target),
    };
  }

  var alasan = str(p.alasan);
  var stempel = 'Dinonaktifkan ' + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm');
  if (alasan) stempel += ' — ' + alasan;
  var catatan = str(target['CATATAN']);
  var catatanBaru = catatan ? catatan + ' | ' + stempel : stempel;

  var obj = updateRowCells(SHEETS.PROSPEK, target._row, {
    'STATUS': 'TIDAK_POTENSIAL',
    'CATATAN': catatanBaru,
  });
  return {
    ok: true, sudahNonaktif: false, jumlahSurvey: survey.length,
    prospek: mapProspek(obj),
  };
}

// Balikkan prospek yang dinonaktifkan supaya bisa dipakai lagi tanpa kehilangan
// riwayat. Status dikembalikan ke nilai yang diminta (default BARU).
function apiRestoreProspek(p) {
  var idProspek = str(p.idProspek);
  if (!idProspek) throw new Error('idProspek wajib diisi');
  var target = findProspekRow(idProspek);
  var status = str(p.status).toUpperCase() || 'BARU';
  if (STATUS_PROSPEK.indexOf(status) < 0) {
    throw new Error('Status tidak dikenal: ' + p.status);
  }
  var catatan = str(target['CATATAN']).replace(
    /\s*\|\s*Dinonaktifkan \d{4}-\d{2}-\d{2} \d{2}:\d{2}[^|]*$/, ''
  );
  var obj = updateRowCells(SHEETS.PROSPEK, target._row, {
    'STATUS': status,
    'CATATAN': catatan,
  });
  return mapProspek(obj);
}

// Form survey mengirim idProspek berupa ID Poktan dari Master Poktan 2026
// (mis. 5098431). Kalau poktan itu belum punya baris di DATA_PROSPEK, buat
// otomatis supaya KPI, monitoring, dan hitungan "prospek per Analis" ikut
// terhitung. Idempoten: baris kedua untuk poktan yang sama memakai ID yang sama.
function ensureProspekDariPoktan(pok, p) {
  var idAnalis = str(p.idAnalis) || 'AN001';
  var analis = readRows(SHEETS.ANALIS).map(mapAnalis).filter(function (a) { return a.idAnalis === idAnalis; })[0];
  var wil = wilayahByNama(pok.kecamatan);
  var obj = {
    'ID_PROSPEK': pok.idPoktan,
    'ID_KECAMATAN': wil ? wil.idKecamatan : '',
    'KECAMATAN': wil ? wil.kecamatan : str(pok.kecamatan).toUpperCase(),
    'NAMA_PROSPEK': pok.namaPoktan,
    'KOMODITAS': 'Padi',
    'ID_ANALIS': idAnalis,
    'NAMA_ANALIS': analis ? analis.namaAnalis : str(p.namaAnalis) || 'Budi Santoso',
    'STATUS': 'BARU',
    'TANGGAL': str(p.tanggal) || Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'),
    'ESTIMASI_ALSINTAN': str(p.jenisAlsintan),
    'ESTIMASI_PLAFON': num(p.estimasiHarga) || num(p.estimasiPlafon) || 0,
    'CATATAN': 'Master Poktan 2026 · ID Poktan ' + pok.idPoktan + (pok.desa ? ' · Desa ' + pok.desa : ''),
  };
  appendRow(SHEETS.PROSPEK, Object.keys(obj), obj);
  return mapProspek(obj);
}

function catatRekapPencairan(item) {
  var sheet = getSheet(SHEETS.PENCAIRAN);
  if (!sheet) return;
  var existing = readRows(SHEETS.PENCAIRAN);
  var sudahAda = existing.some(function (r) {
    if (item.idSurvey && str(r['ID_SURVEY']) === item.idSurvey) return true;
    if (item.idProspek && str(r['ID_PROSPEK']) === item.idProspek && !item.idSurvey) return true;
    return false;
  });
  if (sudahAda) return;

  var idPencairan = nextId(SHEETS.PENCAIRAN, 'ID_PENCAIRAN', 'CAIR');
  var tgl = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  var headers = [
    'ID_PENCAIRAN', 'TANGGAL_PENCAIRAN', 'ID_PROSPEK', 'ID_SURVEY',
    'NAMA_PROSPEK', 'KECAMATAN', 'JENIS_ALSINTAN', 'PLAFON_PENCAIRAN',
    'ID_ANALIS', 'NAMA_ANALIS', 'CATATAN'
  ];
  var obj = {
    'ID_PENCAIRAN': idPencairan,
    'TANGGAL_PENCAIRAN': tgl,
    'ID_PROSPEK': str(item.idProspek),
    'ID_SURVEY': str(item.idSurvey),
    'NAMA_PROSPEK': str(item.namaProspek),
    'KECAMATAN': str(item.kecamatan),
    'JENIS_ALSINTAN': str(item.jenisAlsintan),
    'PLAFON_PENCAIRAN': num(item.plafonPencairan) || 0,
    'ID_ANALIS': str(item.idAnalis),
    'NAMA_ANALIS': str(item.namaAnalis),
    'CATATAN': str(item.catatan),
  };
  appendRow(SHEETS.PENCAIRAN, headers, obj);
}

function apiCreateSurvey(p) {
  var idProspek = str(p.idProspek);
  var prosp = null;
  if (idProspek && idProspek !== 'BARU') {
    prosp = apiGetProspek({ idProspek: idProspek });
    if (!prosp) {
      var pok = lookupPoktan(idProspek);
      if (pok) prosp = ensureProspekDariPoktan(pok, p);
    }
  }
  if (!prosp) {
    var namaProsp = str(p.namaProspek) || str(p.namaGapoktan);
    if (!namaProsp) throw new Error('Nama prospek wajib diisi');
    var statusAwal = str(p.status).toUpperCase() === 'DISBURSE' ? 'DISBURSE' : (str(p.status).toUpperCase() === 'ANALISA' ? 'POTENSIAL' : 'SURVEY');
    prosp = apiCreateProspek({
      kecamatan: str(p.kecamatan),
      namaProspek: namaProsp,
      estimasiKebutuhan: str(p.jenisAlsintan) || str(p.kebutuhanAlat),
      estimasiPlafon: num(p.estimasiHarga) || num(p.estimasiPlafon) || 0,
      idAnalis: str(p.idAnalis),
      namaAnalis: str(p.namaAnalis),
      status: statusAwal,
    });
  }
  var idSurvey = nextId(SHEETS.SURVEY, 'ID_SURVEY', 'S');
  var fotoUrl = '';
  if (str(p.fotoBase64) && str(p.fotoName)) {
    fotoUrl = saveFotoSurvey(str(p.fotoBase64), str(p.fotoName), idSurvey);
  }
  var nama = str(p.namaProspek) || str(p.namaGapoktan) || prosp.namaProspek || prosp.namaGapoktan;
  var statusSurvey = str(p.status).toUpperCase() || 'SURVEY';
  var estPlafon = num(p.estimasiHarga) || num(p.estimasiPlafon) || prosp.estimasiPlafon || 0;
  var jenisAls = str(p.jenisAlsintan) || str(p.kebutuhanAlat) || prosp.estimasiKebutuhan;

  var obj = {
    'ID_SURVEY': idSurvey,
    'ID_PROSPEK': prosp.idProspek,
    'NAMA_PROSPEK': nama,
    'NAMA_KETUA': str(p.namaKetua),
    'JUMLAH_ANGGOTA': num(p.jumlahAnggota),
    'LUAS_SAWAH_AKTUAL': num(p.luasSawah),
    'JENIS_ALSINTAN': jenisAls,
    'ESTIMASI_HARGA': estPlafon,
    'LATITUDE': num(p.latitude),
    'LONGITUDE': num(p.longitude),
    'ACCURACY_M': num(p.accuracy),
    'CATATAN': str(p.catatan),
    'ID_ANALIS': str(p.idAnalis) || prosp.idAnalis,
    'NAMA_ANALIS': str(p.namaAnalis) || prosp.namaAnalis,
    'TIMESTAMP': str(p.timestamp) || new Date().toISOString(),
    'STATUS': statusSurvey,
    'FOTO_URL': fotoUrl,
  };
  appendRow(SHEETS.SURVEY, Object.keys(obj), obj);

  if (statusSurvey === 'DISBURSE') {
    try {
      apiUpdateProspek({ idProspek: prosp.idProspek, status: 'DISBURSE' });
    } catch (e) {}
    try {
      catatRekapPencairan({
        idProspek: prosp.idProspek,
        idSurvey: idSurvey,
        namaProspek: nama,
        kecamatan: prosp.kecamatan,
        jenisAlsintan: jenisAls,
        plafonPencairan: estPlafon,
        idAnalis: str(p.idAnalis) || prosp.idAnalis,
        namaAnalis: str(p.namaAnalis) || prosp.namaAnalis,
        catatan: str(p.catatan) || 'Disburse dari hasil survey lapangan'
      });
    } catch (e) {}
  } else if (statusSurvey === 'ANALISA') {
    try {
      apiUpdateProspek({ idProspek: prosp.idProspek, status: 'POTENSIAL' });
    } catch (e) {}
  }

  return mapSurvey(obj);
}

function findSurveyRow(idSurvey) {
  var rows = readRows(SHEETS.SURVEY);
  var found = null;
  rows.forEach(function (r) {
    if (str(r['ID_SURVEY']) === idSurvey) found = r;
  });
  if (!found) throw new Error('Survey tidak ditemukan: ' + idSurvey);
  return found;
}

function apiUpdateSurvey(p) {
  var idSurvey = str(p.idSurvey);
  if (!idSurvey) throw new Error('idSurvey wajib diisi');
  var target = findSurveyRow(idSurvey);

  var patch = {};
  if (p.namaProspek !== undefined) patch['NAMA_PROSPEK'] = str(p.namaProspek);
  if (p.jenisAlsintan !== undefined) patch['JENIS_ALSINTAN'] = str(p.jenisAlsintan);
  if (p.estimasiHarga !== undefined) patch['ESTIMASI_HARGA'] = num(p.estimasiHarga);
  if (p.catatan !== undefined) patch['CATATAN'] = str(p.catatan);

  if (p.status !== undefined && str(p.status)) {
    var st = str(p.status).toUpperCase();
    patch['STATUS'] = st;
    if (st === 'DISBURSE') {
      var idProspek = str(target['ID_PROSPEK']);
      if (idProspek) {
        try {
          apiUpdateProspek({ idProspek: idProspek, status: 'DISBURSE' });
        } catch (e) {}
      }
      try {
        var prosp = idProspek ? apiGetProspek({ idProspek: idProspek }) : null;
        catatRekapPencairan({
          idProspek: idProspek,
          idSurvey: idSurvey,
          namaProspek: patch['NAMA_PROSPEK'] || str(target['NAMA_PROSPEK']) || str(target['NAMA_GAPOKTAN']),
          kecamatan: (prosp ? prosp.kecamatan : '') || str(target['KECAMATAN']),
          jenisAlsintan: patch['JENIS_ALSINTAN'] || str(target['JENIS_ALSINTAN']),
          plafonPencairan: patch['ESTIMASI_HARGA'] !== undefined ? patch['ESTIMASI_HARGA'] : num(target['ESTIMASI_HARGA']),
          idAnalis: str(target['ID_ANALIS']),
          namaAnalis: str(target['NAMA_ANALIS']),
          catatan: patch['CATATAN'] || str(target['CATATAN']) || 'Disburse dari data survey'
        });
      } catch (e) {}
    } else if (st === 'ANALISA') {
      var idProspek2 = str(target['ID_PROSPEK']);
      if (idProspek2) {
        try {
          apiUpdateProspek({ idProspek: idProspek2, status: 'POTENSIAL' });
        } catch (e) {}
      }
    }
  }

  var updated = updateRowCells(SHEETS.SURVEY, target._row, patch);
  return mapSurvey(updated);
}

// Simpan foto survey (base64) ke folder Drive khusus, return link
function saveFotoSurvey(base64, fileName, idSurvey) {
  if (base64.length > 8 * 1024 * 1024) {
    throw new Error('Ukuran foto terlalu besar (maksimal sekitar 5MB)');
  }
  var folders = DriveApp.getFoldersByName('SIAP ALSINTAN - Foto Survey');
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder('SIAP ALSINTAN - Foto Survey');
  var dot = fileName.lastIndexOf('.');
  var ext = dot >= 0 ? fileName.slice(dot).toLowerCase() : '.jpg';
  var mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), mime, idSurvey + ext);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function apiCreateAnalis(p) {
  if (!str(p.namaAnalis)) throw new Error('namaAnalis wajib diisi');
  var obj = {
    'ID_ANALIS': str(p.idAnalis) || nextId(SHEETS.ANALIS, 'ID_ANALIS', 'AN'),
    'NAMA_ANALIS': str(p.namaAnalis),
    'WILAYAH': Array.isArray(p.wilayah) ? p.wilayah.join(', ') : str(p.wilayah),
    'STATUS': str(p.status) || 'AKTIF',
    'EMAIL': str(p.email),
  };
  appendRow(SHEETS.ANALIS, Object.keys(obj), obj);
  return mapAnalis(obj);
}

// ----------------------------------------------------------- source actions
function apiGetSources() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('sources_meta');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }
  var res = SOURCES.map(function (s) {
    try {
      var file = SpreadsheetApp.openById(s.id);
      var tabs = file.getSheets().map(function (sh) {
        return {
          nama: sh.getName(),
          baris: sh.getLastRow(),
          kolom: sh.getLastColumn(),
        };
      });
      return {
        key: s.key,
        nama: s.nama,
        kategori: s.kategori,
        url: 'https://docs.google.com/spreadsheets/d/' + s.id + '/edit',
        status: 'OK',
        tabs: tabs,
      };
    } catch (err) {
      return {
        key: s.key,
        nama: s.nama,
        kategori: s.kategori,
        url: '',
        status: 'ERROR: ' + String(err && err.message ? err.message : err),
        tabs: [],
      };
    }
  });
  try {
    cache.put('sources_meta', JSON.stringify(res), 21600); // Cache 6 jam
  } catch (e) {}
  return res;
}

function apiGetSourceData(p) {
  var key = str(p.key);
  var tab = str(p.tab);
  if (!key || !tab) throw new Error('Parameter key dan tab wajib diisi');
  var src = null;
  SOURCES.forEach(function (s) { if (s.key === key) src = s; });
  if (!src) throw new Error('Sumber tidak dikenal: ' + key);
  var sheet = SpreadsheetApp.openById(src.id).getSheetByName(tab);
  if (!sheet) throw new Error('Tab tidak ditemukan: ' + tab);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (!lastRow || !lastCol) {
    return {
      sumber: { key: src.key, nama: src.nama },
      tab: tab,
      header: [],
      rows: [],
      total: 0,
      page: 1,
      limit: 200,
      totalPages: 1,
      updatedAt: new Date().toISOString(),
    };
  }
  var maxCols = Math.min(lastCol, 60);
  var values = sheet.getRange(1, 1, lastRow, maxCols).getValues();
  // Deteksi baris header: baris pertama yang punya >= 3 sel terisi
  // (baris judul seperti "List Kelompok Tani" biasanya 1-2 sel)
  var headerIdx = 0;
  for (var h = 0; h < Math.min(values.length, 10); h++) {
    var cnt = 0;
    for (var cc = 0; cc < values[h].length; cc++) {
      if (str(values[h][cc]) !== '') cnt++;
    }
    if (cnt >= 3) { headerIdx = h; break; }
  }
  var header = values[headerIdx].map(function (h2, i) { return str(h2) || 'Kolom ' + (i + 1); });
  var rows = [];
  for (var i = headerIdx + 1; i < values.length; i++) {
    var empty = true;
    for (var c = 0; c < values[i].length; c++) {
      if (str(values[i][c]) !== '') { empty = false; break; }
    }
    if (!empty) rows.push(values[i]);
  }
  var q = str(p.q).toLowerCase();
  if (q) {
    rows = rows.filter(function (row) {
      for (var j = 0; j < row.length; j++) {
        if (str(row[j]).toLowerCase().indexOf(q) >= 0) return true;
      }
      return false;
    });
  }
  var page = Math.max(1, parseInt(p.page, 10) || 1);
  var limit = parseInt(p.limit, 10);
  if (!limit || limit < 1) limit = 200;
  if (limit > 2000) limit = 2000;
  var total = rows.length;
  var start = (page - 1) * limit;
  return {
    sumber: { key: src.key, nama: src.nama },
    tab: tab,
    header: header,
    rows: rows.slice(start, start + limit),
    total: total,
    page: page,
    limit: limit,
    totalPages: Math.ceil(total / limit) || 1,
    updatedAt: new Date().toISOString(),
  };
}

// ----------------------------------------------------------- master poktan
// Sumber: spreadsheet "Poktan 2026" (SOURCES key 'poktan') — 16 tab, satu per
// kecamatan, total 3.242 poktan. Struktur tiap tab:
//   baris 1 = judul ("List Kelompok Tani ...")
//   baris 2 = header (No | Nama Poktan | ID Poktan | Jumlah Anggota | Nama Desa |
//                    Nama Ketua | Alamat Sekretariat)
//   baris 3+ = data
//
// CATATAN: daftar ini berisi POKTAN (kelompok tani), bukan gapoktan. Satu baris
// = satu poktan dengan satu ketua. "Gapoktan" arti resminya gabungan beberapa
// poktan, jadi istilah itu tidak tepat untuk data ini.
//
// Sel "Nama Poktan" tidak bersih: nama poktan di awal sel, disusul label UI
// eksportir ("Tambah Anggota", "Ubah", "Hapus", ...) setelah rentetan spasi
// panjang — karena itu nama diambil dari segmen pertama saja.
var POKTAN_CACHE_TABS = 'poktan2026:tabs';
var POKTAN_CACHE_PREFIX = 'poktan2026:tab:';
var POKTAN_CACHE_TTL = 21600; // 6 jam

function namaPoktanDari(v) {
  var segmen = str(v).split(/[\r\n]+|\s{2,}/);
  for (var i = 0; i < segmen.length; i++) {
    if (str(segmen[i])) return str(segmen[i]);
  }
  return '';
}

// Rapatkan spasi/newline berlebih tanpa memotong isi (dipakai untuk alamat)
function rapikanTeks(v) {
  return str(v).replace(/\s+/g, ' ');
}

function intOr0(v) {
  var n = num(v);
  return n === null ? 0 : Math.round(n);
}

function poktanBook() {
  var src = null;
  SOURCES.forEach(function (s) { if (s.key === 'poktan') src = s; });
  if (!src) throw new Error('Sumber data poktan tidak terdaftar di SOURCES');
  return SpreadsheetApp.openById(src.id);
}

function poktanTabNames() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get(POKTAN_CACHE_TABS);
  if (hit) {
    try {
      return JSON.parse(hit);
    } catch (e) { /* cache rusak -> baca ulang dari spreadsheet */ }
  }
  var names = poktanBook()
    .getSheets()
    .map(function (s) { return str(s.getName()); })
    .filter(function (n) { return n !== ''; });
  try {
    cache.put(POKTAN_CACHE_TABS, JSON.stringify(names), POKTAN_CACHE_TTL);
  } catch (e) { /* cache penuh -> baca ulang spreadsheet */ }
  return names;
}

// Nama tab di Poktan 2026 (Title Case) dicocokkan case-insensitive karena
// MASTER_WILAYAH menyimpan nama kecamatan dalam huruf kapital.
function matchPoktanTab(names, wanted) {
  var target = str(wanted).toLowerCase();
  if (!target) return '';
  for (var i = 0; i < names.length; i++) {
    if (String(names[i]).toLowerCase() === target) return names[i];
  }
  return '';
}

// CacheService membatasi 100KB per key, jadi tiap tab disimpan sebagai array
// ringkas, bukan objek.
function poktanToCacheRow(p) {
  return [p.idPoktan, p.namaPoktan, p.jumlahAnggota, p.desa, p.ketua, p.alamat, p.kecamatan];
}

function poktanFromCacheRow(r) {
  return {
    idPoktan: str(r[0]),
    namaPoktan: str(r[1]),
    jumlahAnggota: num(r[2]) || 0,
    desa: str(r[3]),
    ketua: str(r[4]),
    alamat: str(r[5]),
    kecamatan: str(r[6]),
  };
}

function readPoktanSheet(sheet, kec) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (!lastRow || lastCol < 3) return [];
  var values = sheet.getRange(1, 1, lastRow, Math.min(lastCol, 12)).getValues();
  // Baris header = baris pertama dengan >= 3 sel terisi (baris judul cuma 1-2 sel)
  var headerIdx = 0;
  for (var h = 0; h < Math.min(values.length, 10); h++) {
    var filled = 0;
    for (var c = 0; c < values[h].length; c++) if (str(values[h][c]) !== '') filled++;
    if (filled >= 3) { headerIdx = h; break; }
  }
  var out = [];
  for (var i = headerIdx + 1; i < values.length; i++) {
    var row = values[i];
    var nama = namaPoktanDari(row[1]);
    var idNum = num(row[2]);
    if (!nama || idNum === null) continue; // baris tanpa nama atau tanpa ID Poktan
    out.push({
      idPoktan: String(Math.round(idNum)),
      namaPoktan: nama,
      jumlahAnggota: intOr0(row[3]),
      desa: rapikanTeks(row[4]),
      ketua: rapikanTeks(row[5]),
      alamat: rapikanTeks(row[6]),
      kecamatan: kec,
    });
  }
  return out;
}

function loadPoktanTab(kec) {
  var cache = CacheService.getScriptCache();
  var key = POKTAN_CACHE_PREFIX + str(kec).toLowerCase();
  var hit = cache.get(key);
  if (hit) {
    try {
      return JSON.parse(hit).map(poktanFromCacheRow);
    } catch (e) { /* cache rusak -> baca ulang dari spreadsheet */ }
  }
  var sheet = poktanBook().getSheetByName(kec);
  var rows = sheet ? readPoktanSheet(sheet, kec) : [];
  try {
    // CacheService menolak payload > 100KB. Kalau satu tab terlalu besar, data
    // tetap dikembalikan (hanya tidak di-cache) daripada gagal total.
    cache.put(key, JSON.stringify(rows.map(poktanToCacheRow)), POKTAN_CACHE_TTL);
  } catch (e) { /* cache penuh -> baca ulang spreadsheet */ }
  return rows;
}

function loadPoktan(tabs) {
  var out = [];
  for (var i = 0; i < tabs.length; i++) out = out.concat(loadPoktanTab(tabs[i]));
  return out;
}

function apiGetPoktan(p) {
  var names = poktanTabNames();
  var tabs = names;
  var kec = str(p.kecamatan);
  if (kec) {
    var tab = matchPoktanTab(names, kec);
    if (!tab) throw new Error('Kecamatan tidak ada di Master Poktan 2026: ' + kec);
    tabs = [tab];
  }
  if (p.idPoktan) {
    var id = str(p.idPoktan);
    return loadPoktan(tabs).filter(function (x) { return x.idPoktan === id; })[0] || null;
  }
  var data = loadPoktan(tabs);
  var q = str(p.q).toLowerCase();
  if (q) {
    data = data.filter(function (x) {
      return (
        x.namaPoktan.toLowerCase().indexOf(q) >= 0 ||
        x.desa.toLowerCase().indexOf(q) >= 0 ||
        x.ketua.toLowerCase().indexOf(q) >= 0 ||
        x.alamat.toLowerCase().indexOf(q) >= 0 ||
        x.idPoktan.indexOf(q) >= 0
      );
    });
  }
  data.sort(function (a, b) {
    return a.namaPoktan < b.namaPoktan ? -1 : a.namaPoktan > b.namaPoktan ? 1 : 0;
  });
  var page = Math.max(1, parseInt(p.page, 10) || 1);
  var limit = parseInt(p.limit, 10);
  if (!limit || limit < 1) limit = 500;
  if (limit > 1000) limit = 1000;
  return {
    items: data.slice((page - 1) * limit, page * limit),
    total: data.length,
    page: page,
    limit: limit,
    totalPages: Math.ceil(data.length / limit) || 1,
    kecamatan: names,
    updatedAt: new Date().toISOString(),
  };
}

function lookupPoktan(idPoktan) {
  if (!str(idPoktan)) return null;
  return apiGetPoktan({ idPoktan: str(idPoktan) });
}

function wilayahByNama(nama) {
  var target = str(nama).toLowerCase();
  if (!target) return null;
  var found = readRows(SHEETS.WILAYAH).map(mapWilayah).filter(function (w) {
    return w.kecamatan.toLowerCase() === target;
  })[0];
  return found || null;
}

function apiUpdateAnalisStatus(p) {
  var idAnalis = str(p.idAnalis);
  var status = str(p.status) || 'AKTIF';
  var rows = readRows(SHEETS.ANALIS);
  var target = null;
  rows.forEach(function (r) {
    if (str(r['ID_ANALIS']) === idAnalis) target = r;
  });
  if (!target) throw new Error('Analis tidak ditemukan: ' + idAnalis);
  var sheet = getSheet(SHEETS.ANALIS);
  if (!sheet) throw new Error('Sheet tidak ditemukan: ' + SHEETS.ANALIS);
  var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return str(h).toUpperCase(); });
  var colStatus = header.indexOf('STATUS') + 1;
  var statusVal = status;
  if (typeof statusVal === 'string' && /^[=+\-@]/.test(statusVal)) statusVal = "'" + statusVal;
  sheet.getRange(target._row, colStatus).setValue(statusVal);
  var obj = {};
  header.forEach(function (h, i) { obj[h] = sheet.getRange(target._row, i + 1).getValue(); });
  return mapAnalis(obj);
}

// ----------------------------------------------------------- Config Prioritas
function apiGetPriorityConfig() {
  var sheet = getSheet(SHEETS.CONFIG);
  if (!sheet) {
    return {
      weights: { luasLahan: 0.30, jumlahGapoktan: 0.25, produksi: 0.25, prospekExisting: 0.20 },
      thresholds: { tinggi: 70, sedang: 40 },
      lastUpdated: '',
      updatedBy: 'DEFAULT',
    };
  }
  var rows = readRows(SHEETS.CONFIG);
  if (!rows || rows.length === 0) {
    return {
      weights: { luasLahan: 0.30, jumlahGapoktan: 0.25, produksi: 0.25, prospekExisting: 0.20 },
      thresholds: { tinggi: 70, sedang: 40 },
      lastUpdated: '',
      updatedBy: 'DEFAULT',
    };
  }
  var r = rows[0];
  return {
    weights: {
      luasLahan: num(r['BOBOT_LUAS_LAHAN']) || 0.30,
      jumlahGapoktan: num(r['BOBOT_GAPOKTAN']) || 0.25,
      produksi: num(r['BOBOT_PRODUKSI']) || 0.25,
      prospekExisting: num(r['BOBOT_PROSPEK']) || 0.20,
    },
    thresholds: {
      tinggi: num(r['THRESHOLD_TINGGI']) || 70,
      sedang: num(r['THRESHOLD_SEDANG']) || 40,
    },
    lastUpdated: str(r['UPDATED_AT']) || '',
    updatedBy: str(r['UPDATED_BY']) || '',
  };
}

function apiUpdatePriorityConfig(p) {
  var sheet = getSheet(SHEETS.CONFIG);
  var headers = [
    'ID_CONFIG', 'BOBOT_LUAS_LAHAN', 'BOBOT_GAPOKTAN', 'BOBOT_PRODUKSI', 'BOBOT_PROSPEK',
    'THRESHOLD_TINGGI', 'THRESHOLD_SEDANG', 'UPDATED_AT', 'UPDATED_BY'
  ];
  if (!sheet) {
    sheet = ss().insertSheet(SHEETS.CONFIG);
    sheet.appendRow(headers);
  }
  var rows = readRows(SHEETS.CONFIG);
  var w = p && p.weights || {};
  var t = p && p.thresholds || {};

  var luasLahan = w.luasLahan !== undefined ? num(w.luasLahan) : 0.30;
  var jumlahGapoktan = w.jumlahGapoktan !== undefined ? num(w.jumlahGapoktan) : 0.25;
  var produksi = w.produksi !== undefined ? num(w.produksi) : 0.25;
  var prospekExisting = w.prospekExisting !== undefined ? num(w.prospekExisting) : 0.20;
  var tinggi = t.tinggi !== undefined ? num(t.tinggi) : 70;
  var sedang = t.sedang !== undefined ? num(t.sedang) : 40;
  var updatedBy = str(p && p.updatedBy || 'ADMIN');
  var updatedAt = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');

  var patch = {
    'BOBOT_LUAS_LAHAN': luasLahan,
    'BOBOT_GAPOKTAN': jumlahGapoktan,
    'BOBOT_PRODUKSI': produksi,
    'BOBOT_PROSPEK': prospekExisting,
    'THRESHOLD_TINGGI': tinggi,
    'THRESHOLD_SEDANG': sedang,
    'UPDATED_AT': updatedAt,
    'UPDATED_BY': updatedBy,
  };

  if (rows && rows.length > 0) {
    updateRowCells(SHEETS.CONFIG, rows[0]._row, patch);
  } else {
    patch['ID_CONFIG'] = 'CFG001';
    appendRow(SHEETS.CONFIG, headers, patch);
  }
  return apiGetPriorityConfig();
}

