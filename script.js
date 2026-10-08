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

// استبدل الرابط أدناه برابط Google Apps Script الخاص بك
const scriptURL = 'https://script.google.com/macros/s/AKfycbzpnRjCyZKuLD65SiGDkcQRcsmsmkkA9GlhH71CFjjfHka-bcoQl2Me5BYoW96Fxh_q/exec';

const form = document.getElementById('taounateForm');
const dairahSelect = document.getElementById('dairah');
const communeSelect = document.getElementById('commune');
const submitBtn = document.getElementById('submitBtn');
const loading = document.getElementById('loading');
const canvas = document.getElementById('captchaCanvas');
const captchaInput = document.getElementById('captchaInput');
let captchaCode = '';

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- الجماعات ---------- */
function updateCommunes() {
    const selected = dairahSelect.value;
    communeSelect.innerHTML = '<option value="">-- اختر الجماعة --</option>';
    (communesData[selected] || []).forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        communeSelect.appendChild(option);
    });
}
dairahSelect.addEventListener('change', updateCommunes);

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
drawCaptcha();

/* ---------- الإرسال ---------- */
function validate() {
    let ok = true;
    form.querySelectorAll('[required]').forEach(el => {
        const bad = el.type === 'checkbox' ? !el.checked : !el.value.trim();
        el.classList.toggle('invalid', bad);
        if (bad) ok = false;
    });
    if (!ok) {
        alert('المرجو ملء جميع الحقول الإجبارية والموافقة على الشروط.');
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
    data.delete('languages');
    data.append('languages', [...form.querySelectorAll('input[name="languages"]:checked')]
        .map(c => c.value).join('، '));

    submitBtn.style.display = 'none';
    loading.style.display = 'block';

    fetch(scriptURL, { method: 'POST', body: data })
        .then(() => {
            alert('تم إرسال معلوماتك بنجاح، شكراً لك!');
            form.reset();
            updateCommunes();
            drawCaptcha();
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
