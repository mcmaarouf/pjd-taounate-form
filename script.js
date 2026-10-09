// استبدل الرابط أدناه برابط Google Apps Script الخاص بك
const scriptURL = 'https://script.google.com/macros/s/AKfycbz7nvOQfRUyb_sMVTxsQgIB5oDSHa7bo8mbEX3JqPiJKky9jykQU01-6cHF4JAj9mo0/exec';

// بيانات الجماعات لكل دائرة (دائرتان فقط)
const communesData = {
    "تيسة تاونات": [
        "واد الجمعة", "مساسة", "مزراوة", "فناسة باب الحيط", "عين معطوف",
        "عين مديونة", "عين لكدح", "عين عائشة", "طهر السوق", "سيدي امحمد بن لحسن",
        "راس الواد", "تيسة", "تمضيت", "تاونات", "بوهودة", "بوعروس", "بوعادل",
        "بني ولنجل تافراوت", "بني وليد", "أولاد عياد", "أولاد داود", "أوطابوعبان",
        "الزريزر", "الخلالفة", "البسابسا", "ارغيوة"
    ],
    "القرية غفساي": [
        "ودكة", "مولاي بوشتى", "كيسان", "كلاف", "قرية با محمد", "غفساي",
        "سيدي يحيى بني زروال", "سيدي المخفي", "سيدي الحاج امحمد", "تمزكانة",
        "تبودة", "تافرانت", "بوشابل", "بني سنوس", "أورتزاغ", "الولجة",
        "المكانسة", "الغوازي", "الرتبة", "البيبان", "اجبابرة"
    ]
};

const OTHER_LABEL = 'أخرى (غير موجودة في اللائحة)';

const form = document.getElementById('taounateForm');
const dairahSelect = document.getElementById('dairah');
const searchInput = document.getElementById('communeSearch');
const hiddenCommune = document.getElementById('commune');
const list = document.getElementById('communeList');
const otherWrap = document.getElementById('otherWrap');
const otherInput = document.getElementById('otherCommune');
const submitBtn = document.getElementById('submitBtn');
const loading = document.getElementById('loading');
const canvas = document.getElementById('captchaCanvas');
const captchaInput = document.getElementById('captchaInput');

let captchaCode = '';
let isOther = false;
let activeIndex = -1;
let currentItems = [];

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- البحث عن الجماعة ---------- */
// توحيد الحروف لتسهيل البحث (أ إ آ = ا ، ة = ه ، ى = ي ، حذف التشكيل)
const norm = s => s
    .replace(/[\u064B-\u0652\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

function closeList() {
    list.hidden = true;
    activeIndex = -1;
}

function resetCommune() {
    searchInput.value = '';
    hiddenCommune.value = '';
    otherInput.value = '';
    isOther = false;
    otherWrap.hidden = true;
    searchInput.classList.remove('invalid');
    otherInput.classList.remove('invalid');
    closeList();
    const hasDairah = !!communesData[dairahSelect.value];
    searchInput.disabled = !hasDairah;
    searchInput.placeholder = hasDairah ? 'اكتب للبحث عن الجماعة...' : 'اختر الدائرة أولاً';
}

function addItem(text, className, value) {
    const li = document.createElement('li');
    li.textContent = text;
    li.className = className;
    if (value !== undefined) li.dataset.value = value;
    list.appendChild(li);
}

function renderList() {
    const q = norm(searchInput.value);
    currentItems = (communesData[dairahSelect.value] || []).filter(n => norm(n).includes(q));
    list.innerHTML = '';
    currentItems.forEach(n => addItem(n, 'opt', n));
    if (!currentItems.length) addItem('لا توجد نتائج مطابقة', 'empty');
    addItem(OTHER_LABEL, 'opt other', OTHER_LABEL);
    activeIndex = -1;
    list.hidden = false;
}

function choose(value) {
    if (value === OTHER_LABEL) {
        isOther = true;
        hiddenCommune.value = '';
        searchInput.value = 'أخرى';
        searchInput.classList.remove('invalid');
        otherWrap.hidden = false;
        otherInput.focus();
    } else {
        isOther = false;
        hiddenCommune.value = value;
        searchInput.value = value;
        searchInput.classList.remove('invalid');
        otherWrap.hidden = true;
        otherInput.value = '';
    }
    closeList();
}

function highlight(opts) {
    opts.forEach((li, i) => li.classList.toggle('active', i === activeIndex));
    if (opts[activeIndex]) opts[activeIndex].scrollIntoView({ block: 'nearest' });
}

dairahSelect.addEventListener('change', resetCommune);

searchInput.addEventListener('focus', renderList);
searchInput.addEventListener('click', renderList);
searchInput.addEventListener('input', () => {
    isOther = false;
    hiddenCommune.value = '';
    otherWrap.hidden = true;
    renderList();
});

// mousedown (مع preventDefault) باش ما يضيعش التركيز قبل الاختيار
list.addEventListener('mousedown', e => {
    e.preventDefault();
    const li = e.target.closest('li.opt');
    if (li) choose(li.dataset.value);
});

searchInput.addEventListener('keydown', e => {
    const opts = [...list.querySelectorAll('li.opt')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (list.hidden) renderList();
        const all = [...list.querySelectorAll('li.opt')];
        if (!all.length) return;
        activeIndex = e.key === 'ArrowDown'
            ? (activeIndex + 1) % all.length
            : (activeIndex - 1 + all.length) % all.length;
        highlight(all);
    } else if (e.key === 'Enter' && !list.hidden) {
        e.preventDefault();
        const target = activeIndex >= 0 ? opts[activeIndex] : (currentItems.length ? opts[0] : null);
        if (target) choose(target.dataset.value);
    } else if (e.key === 'Escape') {
        closeList();
    }
});

searchInput.addEventListener('blur', () => {
    if (!isOther && !hiddenCommune.value) {
        const match = (communesData[dairahSelect.value] || [])
            .find(n => norm(n) === norm(searchInput.value));
        if (match) choose(match);
        else searchInput.value = '';
    }
    closeList();
});

/* ---------- التحقق الأمني (واجهة فقط) ---------- */
function drawCaptcha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    captchaCode = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#eef3f9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = 'rgba(11, 92, 173, .35)';
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.stroke();
    }
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = '#0b5cad';
    ctx.textBaseline = 'middle';
    [...captchaCode].forEach((ch, i) => {
        ctx.save();
        ctx.translate(12 + i * 20, canvas.height / 2);
        ctx.rotate((Math.random() - 0.5) * 0.5);
        ctx.fillText(ch, 0, 0);
        ctx.restore();
    });
}
document.getElementById('captchaRefresh').addEventListener('click', () => {
    drawCaptcha();
    captchaInput.value = '';
});

/* ---------- التحقق والإرسال ---------- */
function validate() {
    let ok = true;
    form.querySelectorAll('[required]').forEach(el => {
        const bad = el.type === 'checkbox' ? !el.checked : !el.value.trim();
        el.classList.toggle('invalid', bad);
        if (bad) ok = false;
    });

    // الجماعة: إما من اللائحة أو مكتوبة يدويا (أخرى)
    const otherBad = isOther && !otherInput.value.trim();
    const listBad = !isOther && !hiddenCommune.value;
    searchInput.classList.toggle('invalid', listBad);
    otherInput.classList.toggle('invalid', otherBad);
    if (otherBad || listBad) ok = false;

    if (!ok) {
        alert('المرجو ملء جميع الحقول الإجبارية (واختيار الجماعة) والموافقة على الشروط.');
        return false;
    }
    if (captchaInput.value.trim().toUpperCase() !== captchaCode) {
        alert('رمز التحقق غير صحيح، المرجو المحاولة من جديد.');
        drawCaptcha();
        captchaInput.value = '';
        return false;
    }
    return true;
}

form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validate()) return;

    const data = new FormData(form);
    data.set('commune', isOther ? otherInput.value.trim() : hiddenCommune.value);
    data.delete('languages');
    data.append('languages', [...form.querySelectorAll('input[name="languages"]:checked')]
        .map(c => c.value).join('، '));

    submitBtn.style.display = 'none';
    loading.style.display = 'block';

    fetch(scriptURL, { method: 'POST', body: data })
        .then(r => r.json())
        .then(res => {
            if (res.result === 'success') {
                alert('تم إرسال معلوماتك بنجاح، شكراً لك!');
                form.reset();
                resetCommune();
                drawCaptcha();
            } else {
                alert(res.message || 'حدث خطأ أثناء الإرسال، المرجو المحاولة لاحقاً.');
            }
        })
        .catch(error => {
            console.error('Error!', error.message);
            alert('حدث خطأ أثناء الإرسال، المرجو المحاولة لاحقاً.');
        })
        .finally(() => {
            submitBtn.style.display = 'block';
            loading.style.display = 'none';
        });
});

resetCommune();
drawCaptcha();
