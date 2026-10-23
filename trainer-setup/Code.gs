/**
 * Trainer back end for the Electronic Mechanic practicals site.
 * Paste this whole file into Extensions > Apps Script of a Google Sheet (see SETUP.md).
 *
 *  - Trainees' "Send to trainer" button POSTs the practical record here.
 *  - The record is saved as a PDF in your Drive (one folder per batch) and one row is
 *    added or updated in the "Submissions" tab (one row per trainee + practical).
 *  - The /trainer page on the site reads the list back with your trainer key.
 *
 * Tabs (made by "Trainer tools > Set up sheets"):
 *   Batches     Batch | Code     which batches may send, and the code each batch types in
 *   Roster      Batch | Roll | Name   optional; lets the dashboard show who has sent nothing
 *   Submissions filled in by this script
 */

var SUBMISSIONS = 'Submissions';
var BATCHES = 'Batches';
var ROSTER = 'Roster';
var FOLDER_NAME = 'EMT Practical Submissions';
var MAX_HTML = 1000000;

var COLS = ['Id', 'Batch', 'Roll', 'Name', 'Practical', 'Title', 'Date', 'Submitted', 'Attempts', 'Steps done', 'Steps total', 'Correct', 'Wrong', 'PDF', 'File id', 'Readings'];
var C = {};
COLS.forEach(function (n, i) { C[n] = i; });

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Trainer tools')
    .addItem('Set up sheets', 'setup')
    .addItem('Show trainer key', 'showTrainerKey')
    .addToUi();
}

/** Makes the three tabs and the trainer key. Safe to run again. */
function setup() {
  var ss = SpreadsheetApp.getActive();
  tab_(ss, SUBMISSIONS, COLS);
  var batches = tab_(ss, BATCHES, ['Batch', 'Code']);
  tab_(ss, ROSTER, ['Batch', 'Roll', 'Name']);
  if (batches.getLastRow() < 2) batches.appendRow(['Batch A', randomCode_(6)]);
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('TRAINER_KEY')) props.setProperty('TRAINER_KEY', randomCode_(16));
  SpreadsheetApp.getUi().alert('Done. Edit the Batches tab, then use Trainer tools > Show trainer key.');
}

function showTrainerKey() {
  var key = PropertiesService.getScriptProperties().getProperty('TRAINER_KEY');
  SpreadsheetApp.getUi().alert(key ? 'Your trainer key (type it on the /trainer page):\n\n' + key : 'Run Trainer tools > Set up sheets first.');
}

function tab_(ss, name, head) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(head);
    sh.getRange(1, 1, 1, head.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function randomCode_(n) {
  var chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  var out = '';
  for (var i = 0; i < n; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function norm_(s) {
  return String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Cell text. Sheets turns a typed date into a Date, so give it back as yyyy-mm-dd. */
function txt_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v == null ? '' : v);
}

function clip_(s, n) {
  return String(s == null ? '' : s).slice(0, n);
}

// ---------- trainee: send a practical ----------

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    var d = JSON.parse(e.postData.contents);
    if (d.action !== 'submit') return json_({ok: false, error: 'Unknown request.'});
    return json_(submit_(d));
  } catch (err) {
    return json_({ok: false, error: 'The server had a problem: ' + err.message});
  } finally {
    lock.releaseLock();
  }
}

function submit_(d) {
  var ss = SpreadsheetApp.getActive();
  var batch = clip_(d.trainee && d.trainee.batch, 60).trim();
  var roll = clip_(d.trainee && d.trainee.roll, 30).trim();
  var name = clip_(d.trainee && d.trainee.name, 80).trim();
  var no = clip_(d.practical && d.practical.no, 20).trim();
  if (!batch || !roll || !name || !no) return {ok: false, error: 'Name, roll no., batch and practical are needed.'};
  if (!/^\d+\.\d+\.\d+$/.test(no)) return {ok: false, error: 'Unknown practical.'};

  var codes = ss.getSheetByName(BATCHES);
  if (!codes) return {ok: false, error: 'The trainer has not set up the sheet yet.'};
  var allowed = codes.getDataRange().getValues().slice(1).some(function (r) {
    return norm_(r[0]) === norm_(batch) && String(r[1]).trim() === String(d.batchCode || '').trim() && String(r[1]).trim() !== '';
  });
  if (!allowed) return {ok: false, error: 'Batch or batch code is not correct. Ask your trainer.'};

  var html = String(d.html || '');
  if (html.length > MAX_HTML) return {ok: false, error: 'The record is too large to send.'};

  var title = clip_(d.practical.title, 200);
  var id = norm_(batch) + '|' + norm_(roll) + '|' + no;
  var sh = ss.getSheetByName(SUBMISSIONS);
  var rows = sh.getDataRange().getValues();
  var at = -1;
  for (var i = 1; i < rows.length; i++) if (rows[i][C['Id']] === id) { at = i; break; }

  // PDF in Drive: Batch folder > "<roll> <name> - <practical>.pdf". A resend replaces the old file.
  var doc = '<html><head><meta charset="utf-8"><style>' +
    'body{font-family:Arial,sans-serif;font-size:11px}h1,h3{font-size:16px;margin:2px 0}h4{font-size:13px;margin:12px 0 4px}' +
    'table{border-collapse:collapse;width:100%}th,td{border:1px solid #777;padding:3px 5px;text-align:left;vertical-align:top}th{background:#eee}' +
    '</style></head><body>' + html + '</body></html>';
  var fname = safeName_(roll + ' ' + name + ' - ' + no) + '.pdf';
  var pdf = Utilities.newBlob(doc, 'text/html', 'record.html').getAs('application/pdf').setName(fname);
  var folder = batchFolder_(batch);
  if (at >= 0 && rows[at][C['File id']]) {
    try { DriveApp.getFileById(rows[at][C['File id']]).setTrashed(true); } catch (x) { /* already gone */ }
  }
  var file = folder.createFile(pdf);

  var now = Date.now();
  var row = [];
  row[C['Id']] = id;
  row[C['Batch']] = batch;
  row[C['Roll']] = roll;
  row[C['Name']] = name;
  row[C['Practical']] = no;
  row[C['Title']] = title;
  row[C['Date']] = clip_(d.trainee.date, 20);
  row[C['Submitted']] = now;
  row[C['Attempts']] = (at >= 0 ? Number(rows[at][C['Attempts']]) || 1 : 0) + 1;
  row[C['Steps done']] = Number(d.stepsDone) || 0;
  row[C['Steps total']] = Number(d.stepsTotal) || 0;
  row[C['Correct']] = Number(d.correct) || 0;
  row[C['Wrong']] = Number(d.wrong) || 0;
  row[C['PDF']] = file.getUrl();
  row[C['File id']] = file.getId();
  row[C['Readings']] = clip_(JSON.stringify(d.tables || []), 45000);

  if (at >= 0) sh.getRange(at + 1, 1, 1, COLS.length).setValues([row]);
  else sh.appendRow(row);
  return {ok: true, submitted: now, attempts: row[C['Attempts']]};
}

function safeName_(s) {
  return s.replace(/[\\\/:*?"<>|]/g, '-').slice(0, 120);
}

function mainFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (x) { /* deleted: make a new one */ }
  }
  var f = DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('FOLDER_ID', f.getId());
  return f;
}

function batchFolder_(batch) {
  var main = mainFolder_();
  var it = main.getFoldersByName(safeName_(batch));
  return it.hasNext() ? it.next() : main.createFolder(safeName_(batch));
}

// ---------- trainer: read the list ----------

function doGet(e) {
  var p = e.parameter || {};
  var key = PropertiesService.getScriptProperties().getProperty('TRAINER_KEY');
  if (!key || p.key !== key) return json_({ok: false, error: 'Wrong trainer key.'});
  var ss = SpreadsheetApp.getActive();

  if (p.action === 'detail') {
    var rows = ss.getSheetByName(SUBMISSIONS).getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][C['Id']] === p.id) {
        var tables = [];
        try { tables = JSON.parse(rows[i][C['Readings']] || '[]'); } catch (x) { /* cut off */ }
        return json_({ok: true, tables: tables});
      }
    }
    return json_({ok: false, error: 'Not found.'});
  }

  if (p.action === 'list') {
    var subs = ss.getSheetByName(SUBMISSIONS).getDataRange().getValues().slice(1).filter(function (r) { return r[C['Id']]; }).map(function (r) {
      return {
        id: r[C['Id']], batch: txt_(r[C['Batch']]), roll: txt_(r[C['Roll']]), name: txt_(r[C['Name']]),
        practical: txt_(r[C['Practical']]), title: txt_(r[C['Title']]), date: txt_(r[C['Date']]),
        submitted: Number(r[C['Submitted']]) || 0, attempts: Number(r[C['Attempts']]) || 1,
        stepsDone: Number(r[C['Steps done']]) || 0, stepsTotal: Number(r[C['Steps total']]) || 0,
        correct: Number(r[C['Correct']]) || 0, wrong: Number(r[C['Wrong']]) || 0, pdf: String(r[C['PDF']])
      };
    });
    var roster = (ss.getSheetByName(ROSTER) ? ss.getSheetByName(ROSTER).getDataRange().getValues().slice(1) : [])
      .filter(function (r) { return r[0] && r[2]; })
      .map(function (r) { return {batch: txt_(r[0]), roll: txt_(r[1]), name: txt_(r[2])}; });
    var batches = ss.getSheetByName(BATCHES).getDataRange().getValues().slice(1)
      .filter(function (r) { return r[0]; })
      .map(function (r) { return txt_(r[0]); });
    return json_({ok: true, submissions: subs, roster: roster, batches: batches});
  }

  return json_({ok: false, error: 'Unknown request.'});
}
