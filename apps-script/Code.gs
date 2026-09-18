/**
 * SIAP ALSINTAN — Apps Script Web App (middleware web <-> spreadsheet)
 * ============================================================
 * Deploy: Extensions -> Apps Script (spreadsheet "SIAP ALSINTAN - Baseline")
 *         Deploy > New deployment > Web app
 *         Execute as: Me | Who has access: Anyone
 *
 * Kontrak API: lihat API.md (response wrapper { success, data, error, timestamp })
 * Action GET  : ping, getDashboardKPI, getWilayah, getProspek, getAO, getSurvey
 * Action POST : createProspek, createSurvey, createAO, updateAOStatus
 * Catatan POST: frontend mengirim Content-Type text/plain (hindari preflight CORS)
 */

var SPREADSHEET_ID = '1o46DOJyyd9ghgqgBqfMR2_QRj-sNcnK6H9c8cFnxGdg';
var TZ = 'Asia/Jakarta';

var SHEETS = {
  WILAYAH: 'MASTER_WILAYAH',
  DESA: 'MASTER_DESA',
  PROSPEK: 'DATA_PROSPEK',
  SURVEY: 'DATA_SURVEY',
  AO: 'MASTER_AO',
  USERS: 'USERS',
};

// Spreadsheet sumber lain di folder ALSINTAN — dibaca live oleh web (read-only)
var SOURCES = [
  { key: 'poktan', nama: 'Poktan 2026', kategori: 'Gapoktan', id: '1qyRZ2St8k8pB2f0YlA6JTjXEHTYEL8dyLCm3NqrHBOU' },
  { key: 'padi_sawah', nama: 'Produksi Padi Sawah 2025', kategori: 'Produksi', id: '1qiP1pYHlo-dHEaelhPwSqletw09xGqAGR5xjDWHaXlA' },
  { key: 'padi_ladang', nama: 'Produksi Padi Ladang 2025', kategori: 'Produksi', id: '18NAxNkcXtFcseYut-ghtjw3kgiZf0IFjRan663j6Q0M' },
  { key: 'beras', nama: 'Produksi Beras 2025', kategori: 'Produksi', id: '1eFhHC22k0zOSiODB4NvKlwBYI8Mk27x29fNnLvFx6ec' },
  { key: 'rekap_alsintan', nama: 'Rekap Alsintan s.d. April 2026', kategori: 'Alsintan', id: '1T8lNnB8KLe9Ri0osKirOB_Sk6a8UKqkAnPZ7936i4w4' },
  { key: 'rekap_bulanan', nama: 'Rekap Bulanan SP TP', kategori: 'SP TP', id: '1yyVQbpWPXRmcfbTS7XVDdrlRth1y_4W5Ow8GyVTfyWM' },
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
      case 'getAO': data = apiGetAO(); break;
      case 'getSources': data = apiGetSources(); break;
      case 'getSourceData': data = apiGetSourceData(p); break;
      case 'createProspek': data = apiCreateProspek(p); break;
      case 'createSurvey': data = apiCreateSurvey(p); break;
      case 'createAO': data = apiCreateAO(p); break;
      case 'updateAOStatus': data = apiUpdateAOStatus(p); break;
      case 'authCheck': data = apiAuthCheck(p); break;
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
  [SHEETS.WILAYAH, SHEETS.PROSPEK, SHEETS.SURVEY, SHEETS.AO].forEach(function (name) {
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

function readRows(name) {
  var sheet = ss().getSheetByName(name);
  if (!sheet) throw new Error('Sheet tidak ditemukan: ' + name);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var header = values[0].map(function (h) { return str(h).toUpperCase(); });
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
    var m = String(r[idColumn] || '').match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  var n = max + 1;
  return prefix + (n < 10 ? '00' + n : n < 100 ? '0' + n : String(n));
}

function appendRow(sheetName, headers, obj) {
  var sheet = ss().getSheetByName(sheetName);
  var row = headers.map(function (h) {
    var v = obj[h];
    if (v === undefined || v === null) return '';
    if (typeof v === 'string' && /^[=+\-@]/.test(v)) v = "'" + v;
    return v;
  });
  sheet.appendRow(row);
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
  return {
    idProspek: str(r['ID_PROSPEK']),
    idKecamatan: str(r['ID_KECAMATAN']),
    kecamatan: str(r['KECAMATAN']),
    namaGapoktan: str(r['NAMA_GAPOKTAN']),
    komoditas: str(r['KOMODITAS']),
    idAO: str(r['ID_AO']),
    namaAO: str(r['NAMA_AO']),
    status: str(r['STATUS']),
    tanggal: dateStr(r['TANGGAL']),
    estimasiKebutuhan: str(r['ESTIMASI_ALSINTAN']),
    catatan: str(r['CATATAN']),
  };
}

function mapSurvey(r) {
  return {
    idSurvey: str(r['ID_SURVEY']),
    idProspek: str(r['ID_PROSPEK']),
    namaGapoktan: str(r['NAMA_GAPOKTAN']),
    jumlahAnggota: num(r['JUMLAH_ANGGOTA']),
    luasSawah: num(r['LUAS_SAWAH_AKTUAL']),
    jenisAlsintan: str(r['JENIS_ALSINTAN']),
    estimasiHarga: num(r['ESTIMASI_HARGA']),
    latitude: num(r['LATITUDE']),
    longitude: num(r['LONGITUDE']),
    accuracy: num(r['ACCURACY_M']),
    catatan: str(r['CATATAN']),
    idAO: str(r['ID_AO']),
    namaAO: str(r['NAMA_AO']),
    timestamp: isoStr(r['TIMESTAMP']),
    status: str(r['STATUS']),
    fotoUrl: str(r['FOTO_URL']),
  };
}

function mapAO(r) {
  return {
    idAO: str(r['ID_AO']),
    namaAO: str(r['NAMA_AO']),
    wilayah: splitList(r['WILAYAH']),
    status: str(r['STATUS']),
    email: str(r['EMAIL']),
  };
}

// ----------------------------------------------------------- read actions
function getDashboardKPI() {
  var wil = readRows(SHEETS.WILAYAH).map(mapWilayah);
  var prosp = readRows(SHEETS.PROSPEK).map(mapProspek);
  var ao = readRows(SHEETS.AO).map(mapAO);
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
    prospekBaru: prosp.filter(function (p) { return p.status === 'BARU'; }).length,
    aoAktif: ao.filter(function (a) { return a.status === 'AKTIF'; }).length,
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
  if (p.idAO) data = data.filter(function (x) { return x.idAO === str(p.idAO); });
  if (p.komoditas) data = data.filter(function (x) { return x.komoditas === str(p.komoditas); });
  if (p.kecamatan) {
    var kc = str(p.kecamatan).toLowerCase();
    data = data.filter(function (x) { return x.kecamatan.toLowerCase().indexOf(kc) >= 0; });
  }
  if (p.search) {
    var q = str(p.search).toLowerCase();
    data = data.filter(function (x) {
      return x.namaGapoktan.toLowerCase().indexOf(q) >= 0 ||
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
  if (p.idAO) data = data.filter(function (x) { return x.idAO === str(p.idAO); });
  data.sort(function (a, b) { return a.idSurvey < b.idSurvey ? -1 : 1; });
  return paginate(data, p);
}

function apiGetAO() {
  var ao = readRows(SHEETS.AO).map(mapAO);
  var prosp = readRows(SHEETS.PROSPEK);
  var surv = readRows(SHEETS.SURVEY);
  ao.forEach(function (a) {
    a.totalProspek = prosp.filter(function (r) { return str(r['ID_AO']) === a.idAO; }).length;
    a.totalSurvey = surv.filter(function (r) { return str(r['ID_AO']) === a.idAO; }).length;
  });
  ao.sort(function (x, y) { return x.idAO < y.idAO ? -1 : 1; });
  return ao;
}

// ----------------------------------------------------------- auth
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
    role: str(found['ROLE']),
    idAO: str(found['ID_AO']),
  };
}

// ----------------------------------------------------------- write actions
function apiCreateProspek(p) {
  if (!str(p.idKecamatan) || !str(p.namaGapoktan)) {
    throw new Error('idKecamatan dan namaGapoktan wajib diisi');
  }
  var wil = apiGetWilayah({ idKecamatan: str(p.idKecamatan) });
  if (!wil) throw new Error('idKecamatan tidak dikenal: ' + str(p.idKecamatan));
  var idAO = str(p.idAO) || 'AO001';
  var ao = readRows(SHEETS.AO).map(mapAO).filter(function (a) { return a.idAO === idAO; })[0];
  var obj = {
    'ID_PROSPEK': nextId(SHEETS.PROSPEK, 'ID_PROSPEK', 'P'),
    'ID_KECAMATAN': wil.idKecamatan,
    'KECAMATAN': wil.kecamatan,
    'NAMA_GAPOKTAN': str(p.namaGapoktan),
    'KOMODITAS': str(p.komoditas) || 'Padi',
    'ID_AO': idAO,
    'NAMA_AO': ao ? ao.namaAO : str(p.namaAO) || 'Budi Santoso',
    'STATUS': str(p.status) || 'BARU',
    'TANGGAL': str(p.tanggal) || Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'),
    'ESTIMASI_ALSINTAN': str(p.estimasiKebutuhan),
    'CATATAN': str(p.catatan),
  };
  appendRow(SHEETS.PROSPEK, Object.keys(obj), obj);
  return mapProspek(obj);
}

function apiCreateSurvey(p) {
  if (!str(p.idProspek)) throw new Error('idProspek wajib diisi');
  var prosp = apiGetProspek({ idProspek: str(p.idProspek) });
  if (!prosp) throw new Error('idProspek tidak dikenal: ' + str(p.idProspek));
  var idSurvey = nextId(SHEETS.SURVEY, 'ID_SURVEY', 'S');
  var fotoUrl = '';
  if (str(p.fotoBase64) && str(p.fotoName)) {
    fotoUrl = saveFotoSurvey(str(p.fotoBase64), str(p.fotoName), idSurvey);
  }
  var obj = {
    'ID_SURVEY': idSurvey,
    'ID_PROSPEK': prosp.idProspek,
    'NAMA_GAPOKTAN': str(p.namaGapoktan) || prosp.namaGapoktan,
    'JUMLAH_ANGGOTA': num(p.jumlahAnggota),
    'LUAS_SAWAH_AKTUAL': num(p.luasSawah),
    'JENIS_ALSINTAN': str(p.jenisAlsintan),
    'ESTIMASI_HARGA': num(p.estimasiHarga),
    'LATITUDE': num(p.latitude),
    'LONGITUDE': num(p.longitude),
    'ACCURACY_M': num(p.accuracy),
    'CATATAN': str(p.catatan),
    'ID_AO': str(p.idAO) || prosp.idAO,
    'NAMA_AO': str(p.namaAO) || prosp.namaAO,
    'TIMESTAMP': str(p.timestamp) || new Date().toISOString(),
    'STATUS': str(p.status) || 'SURVEY_SELESAI',
    'FOTO_URL': fotoUrl,
  };
  appendRow(SHEETS.SURVEY, Object.keys(obj), obj);
  return mapSurvey(obj);
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

function apiCreateAO(p) {
  if (!str(p.namaAO)) throw new Error('namaAO wajib diisi');
  var obj = {
    'ID_AO': str(p.idAO) || nextId(SHEETS.AO, 'ID_AO', 'AO'),
    'NAMA_AO': str(p.namaAO),
    'WILAYAH': Array.isArray(p.wilayah) ? p.wilayah.join(', ') : str(p.wilayah),
    'STATUS': str(p.status) || 'AKTIF',
    'EMAIL': str(p.email),
  };
  appendRow(SHEETS.AO, Object.keys(obj), obj);
  return mapAO(obj);
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

function apiUpdateAOStatus(p) {
  var idAO = str(p.idAO);
  var status = str(p.status) || 'AKTIF';
  var rows = readRows(SHEETS.AO);
  var target = null;
  rows.forEach(function (r) {
    if (str(r['ID_AO']) === idAO) target = r;
  });
  if (!target) throw new Error('AO tidak ditemukan: ' + idAO);
  var sheet = ss().getSheetByName(SHEETS.AO);
  var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return str(h).toUpperCase(); });
  var colStatus = header.indexOf('STATUS') + 1;
  var statusVal = status;
  if (typeof statusVal === 'string' && /^[=+\-@]/.test(statusVal)) statusVal = "'" + statusVal;
  sheet.getRange(target._row, colStatus).setValue(statusVal);
  var obj = {};
  header.forEach(function (h, i) { obj[h] = sheet.getRange(target._row, i + 1).getValue(); });
  return mapAO(obj);
}
