// ===== Google Apps Script — يُلصق في: Extensions > Apps Script (من داخل الـ Google Sheet) =====

const TOTAL_SHEET = 'الكل';                       // الصفحة التي فيها الدائرتان معا
const DAIRA_SHEETS = ['تيسة تاونات', 'القرية غفساي']; // صفحة لكل دائرة (نفس القيم الموجودة في الاستمارة)

// [عنوان العمود, اسم الحقل في الاستمارة]
const FIELDS = [
  ['الاسم الكامل', 'fullName'],
  ['رقم البطاقة الوطنية', 'cin'],
  ['تاريخ الازدياد', 'birthDate'],
  ['المهنة', 'job'],
  ['الجهة', 'region'],
  ['الإقليم', 'province'],
  ['الدائرة', 'dairah'],
  ['الجماعة', 'commune'],
  ['رقم الهاتف', 'phone'],
  ['البريد الإلكتروني', 'email'],
  ['المستوى الدراسي', 'educationLevel'],
  ['التخصص', 'specialty'],
  ['اللغات', 'languages'],
  ['العضوية في الحزب', 'partyMember'],
  ['الجمعيات', 'associations'],
  ['تجارب سابقة', 'experience']
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const p = e.parameter;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const stamp = Utilities.formatDate(new Date(), 'Africa/Casablanca', 'yyyy-MM-dd HH:mm:ss');
    const row = [stamp].concat(FIELDS.map(f => p[f[1]] || ''));

    appendRow_(ss, TOTAL_SHEET, row);                              // الكل
    if (DAIRA_SHEETS.indexOf(p.dairah) !== -1) {
      appendRow_(ss, p.dairah, row);                               // صفحة الدائرة
    }
    return json_({ result: 'success' });
  } catch (err) {
    return json_({ result: 'error', message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function appendRow_(ss, name, row) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    const headers = ['تاريخ التسجيل'].concat(FIELDS.map(f => f[0]));
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setRightToLeft(true);
    sheet.setFrozenRows(1);
  }
  const r = sheet.getLastRow() + 1;
  const range = sheet.getRange(r, 1, 1, row.length);
  range.setNumberFormat('@');          // نص: باش ما يضيع الصفر ديال 06... و CIN
  range.setValues([row]);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
