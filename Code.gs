const SHEET_ID = '1kRsFJhycUpL8NP4R31x4JxbJhaRZyF-umlI2zuQlAeg';

const TOTAL_SHEET = 'الكل';
const DAIRA_SHEETS = ['تيسة تاونات', 'القرية غفساي'];
const MAX_PER_MINUTE = 60;   // الحد الأقصى للطلبات فالدقيقة (حماية من الإغراق)

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
  ['العضوية في الحزب', 'partyMember'],
  ['الجمعيات', 'associations'],
  ['تجارب سابقة', 'experience']
];

const LABEL = {};
FIELDS.forEach(f => LABEL[f[1]] = f[0]);

// القيم المسموح بها فقط
const ALLOWED = {
  region: ['فاس مكناس'],
  province: ['تاونات'],
  dairah: DAIRA_SHEETS,
  educationLevel: ['بدون', 'ابتدائي', 'إعدادي', 'ثانوي', 'باكالوريا', 'جامعي (إجازة)', 'ماستر أو دكتوراه', 'آخر'],
  partyMember: ['نعم', 'لا']
};

const NAME_RE = /^[\u0600-\u06FFA-Za-z][\u0600-\u06FFA-Za-z\s'’.\-]*$/;

function doGet() {
  return ContentService.createTextOutput('OK');
}

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};

    if (p.website) return json_({ result: 'success' });          // فخ للبوتات (خانة مخفية)
    if (isThrottled_()) {
      return json_({ result: 'error', message: 'عدد الطلبات كبير حاليا، المرجو المحاولة بعد قليل.' });
    }

    const v = validate_(p);
    if (v.bad.length) {
      return json_({ result: 'error', message: 'المرجو التحقق من الحقول التالية: ' + v.bad.join('، ') });
    }
    const d = v.d;
    const stamp = Utilities.formatDate(new Date(), 'Africa/Casablanca', 'yyyy-MM-dd HH:mm:ss');
    const row = [stamp].concat(FIELDS.map(f => d[f[1]] || ''));

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const ss = SpreadsheetApp.openById(SHEET_ID);
      if (!cinExists_(ss, d.cin)) {                              // التكرار كيتتجاهل بصمت
        appendRow_(ss, TOTAL_SHEET, row);
        appendRow_(ss, d.dairah, row);
      }
    } finally {
      lock.releaseLock();
    }
    return json_({ result: 'success' });
  } catch (err) {
    console.error(err);                                          // التفاصيل كتبقى فسجل Apps Script فقط
    return json_({ result: 'error', message: 'حدث خطأ، المرجو المحاولة لاحقاً.' });
  }
}

// تنظيف النص: حذف الرموز الخفية، تقليص الفراغات، منع الصيغ (= + - @)، وتحديد الطول
function clean_(v, max) {
  return String(v == null ? '' : v)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[=+\-@]+/, '')
    .slice(0, max);
}

function validate_(p) {
  const d = {};
  const bad = [];

  d.fullName = clean_(p.fullName, 80);
  if (d.fullName.length < 3 || !NAME_RE.test(d.fullName)) bad.push(LABEL.fullName);

  d.cin = clean_(p.cin, 12).replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{1,2}\d{5,6}$/.test(d.cin)) bad.push(LABEL.cin);

  d.birthDate = String(p.birthDate || '').trim();
  const bd = new Date(d.birthDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.birthDate) || isNaN(bd) ||
      bd > new Date() || bd < new Date('1900-01-01')) bad.push(LABEL.birthDate);

  d.job = clean_(p.job, 100);

  ['region', 'province', 'dairah', 'educationLevel', 'partyMember'].forEach(k => {
    d[k] = clean_(p[k], 60);
    if (ALLOWED[k].indexOf(d[k]) === -1) bad.push(LABEL[k]);
  });

  d.commune = clean_(p.commune, 60);
  if (d.commune.length < 2 || !NAME_RE.test(d.commune)) bad.push(LABEL.commune);

  const phone = String(p.phone || '').replace(/[\s.\-()]/g, '');
  const m = phone.match(/^(?:\+212|00212|0)([5-7]\d{8})$/);
  if (m) { d.phone = '0' + m[1]; } else { d.phone = ''; bad.push(LABEL.phone); }

  d.email = clean_(p.email, 100);
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) bad.push(LABEL.email);

  d.associations = clean_(p.associations, 500);
  d.experience = clean_(p.experience, 500);

  return { bad: bad, d: d };
}

function isThrottled_() {
  const cache = CacheService.getScriptCache();
  const key = 'rate_' + Math.floor(Date.now() / 60000);
  const n = Number(cache.get(key) || 0);
  if (n >= MAX_PER_MINUTE) return true;
  cache.put(key, String(n + 1), 120);
  return false;
}

function cinExists_(ss, cin) {
  const sheet = ss.getSheetByName(TOTAL_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return false;
  const col = 2 + FIELDS.findIndex(f => f[1] === 'cin');         // العمود الأول هو تاريخ التسجيل
  const vals = sheet.getRange(2, col, sheet.getLastRow() - 1, 1).getValues();
  return vals.some(r => String(r[0]).toUpperCase() === cin);
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
  range.setNumberFormat('@');
  range.setValues([row]);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
