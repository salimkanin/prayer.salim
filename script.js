// ============================================
// الإعدادات الأساسية
// ============================================

const LOCATION_INFO = {
    city: "مسقط",
    governorate: "محافظة مسقط",
    country: "سلطنة عمان",
    calculationMethod: "وزارة الأوقاف والشؤون الدينية"
};

const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const prayerNames = {
    'fajr': 'الفجر',
    'dhuhr': 'الظهر',
    'asr': 'العصر',
    'maghrib': 'المغرب',
    'isha': 'العشاء'
};

const weekDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const gregorianMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const hijriMonths = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];

let prayerDataArray = [];
let currentDate = new Date();
let lastUpdateSecond = -1;

// ============================================
// دوال مساعدة
// ============================================

function formatTimeNumber(num) {
    return num.toString().padStart(2, '0');
}

function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// تحويل الوقت إلى ثواني منذ منتصف الليل
function timeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours * 3600) + (minutes * 60);
}

// تحويل الوقت الحالي إلى ثواني منذ منتصف الليل
function getCurrentSeconds() {
    const now = new Date();
    return (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
}

function convertTo12Hour(timeStr) {
    if (!timeStr) return '--:-- --';
    let [hours, minutes] = timeStr.split(':').map(Number);
    const ampm = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12 || 12;
    return `${formatTimeNumber(hours)}:${formatTimeNumber(minutes)} ${ampm}`;
}

function formatCurrentTime(date) {
    let hours = date.getHours();
    const minutes = formatTimeNumber(date.getMinutes());
    const seconds = formatTimeNumber(date.getSeconds());
    const ampm = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12 || 12;
    return `${formatTimeNumber(hours)}:${minutes}:${seconds} ${ampm}`;
}

function getApproximateHijriDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const hijriYear = Math.floor(year - 622 + (year - 622) / 33);
    const hijriMonth = Math.floor((month + 1) * 1.03) % 12;
    const hijriDay = Math.floor(day * 0.97);
    return `${hijriDay} ${hijriMonths[hijriMonth]} ${hijriYear} هـ`;
}

function parseDateFromString(dateStr) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const year = parseInt(parts[2]);
        return new Date(year, month, day);
    }
    return null;
}

function getDateKey(date) {
    return `${date.getFullYear()}-${formatTimeNumber(date.getMonth() + 1)}-${formatTimeNumber(date.getDate())}`;
}

function getTodayPrayerTimes() {
    const todayKey = getDateKey(currentDate);
    const todayData = prayerDataArray.find(item => {
        const itemDate = parseDateFromString(item.date);
        if (!itemDate) return false;
        return getDateKey(itemDate) === todayKey;
    });
    return todayData;
}

function updateDate() {
    const now = new Date();
    document.getElementById('hijri-date').textContent = getApproximateHijriDate();
    
    const day = now.getDate();
    const month = gregorianMonths[now.getMonth()];
    const year = now.getFullYear();
    const weekDay = weekDays[now.getDay()];
    document.getElementById('gregorian-date').textContent = `${weekDay}، ${day} ${month} ${year} م`;
    document.getElementById('current-time').textContent = formatCurrentTime(now);
}

// ============================================
// حساب الوقت المنقضي (المصحح بدقة)
// ============================================
function calculateElapsedTime(prayerTimeStr) {
    if (!prayerTimeStr) return { formatted: '--:--:--' };
    
    const prayerSeconds = timeToSeconds(prayerTimeStr);
    const currentSeconds = getCurrentSeconds();
    
    let elapsedSeconds = currentSeconds - prayerSeconds;
    
    // إذا كانت الصلاة من اليوم السابق (مثل العشاء بعد منتصف الليل)
    if (elapsedSeconds < 0) {
        elapsedSeconds += 24 * 3600;
    }
    
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    
    return {
        hours,
        minutes,
        seconds,
        formatted: `${formatTimeNumber(hours)}:${formatTimeNumber(minutes)}:${formatTimeNumber(seconds)}`
    };
}

// ============================================
// حساب الوقت المتبقي (المصحح بدقة)
// ============================================
function calculateRemainingTime(prayerTimeStr, isTomorrow = false) {
    if (!prayerTimeStr) return { formatted: '--:--:--' };
    
    const prayerSeconds = timeToSeconds(prayerTimeStr);
    let currentSeconds = getCurrentSeconds();
    
    let targetSeconds = prayerSeconds;
    
    // إذا كانت الصلاة غداً أو الوقت قد تجاوز وقت الصلاة اليوم
    if (isTomorrow || targetSeconds <= currentSeconds) {
        targetSeconds += 24 * 3600;
    }
    
    const remainingSeconds = targetSeconds - currentSeconds;
    
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    
    return {
        hours,
        minutes,
        seconds,
        formatted: `${formatTimeNumber(hours)}:${formatTimeNumber(minutes)}:${formatTimeNumber(seconds)}`
    };
}

// ============================================
// تحديد الصلاة الحالية والقادمة (المصحح)
// ============================================
function getCurrentAndNextPrayer(times) {
    if (!times) return { current: null, next: null, isNextTomorrow: false };
    
    const currentSeconds = getCurrentSeconds();
    
    // تحويل جميع أوقات الصلاة إلى ثواني
    const prayerSeconds = {
        fajr: timeToSeconds(times.fajr),
        dhuhr: timeToSeconds(times.dhuhr),
        asr: timeToSeconds(times.asr),
        maghrib: timeToSeconds(times.maghrib),
        isha: timeToSeconds(times.isha)
    };
    
    const prayerList = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    let currentPrayer = null;
    let nextPrayer = null;
    let isNextTomorrow = false;
    
    // حالة خاصة: قبل الفجر
    if (currentSeconds < prayerSeconds.fajr) {
        return { current: 'isha', next: 'fajr', isNextTomorrow: false };
    }
    
    // البحث عن الصلاة الحالية والقادمة
    for (let i = 0; i < prayerList.length; i++) {
        const prayer = prayerList[i];
        const prayerSec = prayerSeconds[prayer];
        
        if (currentSeconds >= prayerSec) {
            currentPrayer = prayer;
            if (i + 1 < prayerList.length) {
                nextPrayer = prayerList[i + 1];
                isNextTomorrow = false;
            } else {
                // بعد العشاء، الصلاة القادمة فجر الغد
                nextPrayer = 'fajr';
                isNextTomorrow = true;
            }
        } else if (nextPrayer === null) {
            nextPrayer = prayer;
            currentPrayer = prayerList[i - 1] || prayerList[prayerList.length - 1];
            break;
        }
    }
    
    // معالجة حالة بعد العشاء مباشرة
    if (currentPrayer === 'isha' && currentSeconds >= prayerSeconds.isha) {
        nextPrayer = 'fajr';
        isNextTomorrow = true;
    }
    
    return {
        current: currentPrayer,
        next: nextPrayer,
        isNextTomorrow
    };
}

// ============================================
// تحديث حالة الصلاة في الواجهة
// ============================================
function updatePrayerStatus(times) {
    if (!times) return;
    
    const { current, next, isNextTomorrow } = getCurrentAndNextPrayer(times);
    
    // تحديث الوقت المنقضي
    if (current && times[current]) {
        const elapsed = calculateElapsedTime(times[current]);
        document.getElementById('current-prayer-name').textContent = prayerNames[current];
        document.getElementById('since-last').textContent = elapsed.formatted;
        highlightActivePrayer(current);
    }
    
    // تحديث الوقت المتبقي
    if (next && times[next]) {
        const remaining = calculateRemainingTime(times[next], isNextTomorrow);
        const nextNameElement = document.getElementById('next-prayer-name');
        
        if (isNextTomorrow) {
            nextNameElement.innerHTML = `${prayerNames[next]} <span style="font-size: 11px;">(غداً)</span>`;
        } else {
            nextNameElement.innerHTML = prayerNames[next];
        }
        
        document.getElementById('until-next').textContent = remaining.formatted;
        
        // تحذير عند اقتراب وقت الصلاة (أقل من 5 دقائق)
        if (remaining.hours === 0 && remaining.minutes <= 5 && remaining.seconds >= 0) {
            document.getElementById('until-next').style.color = '#d4b87a';
            document.getElementById('until-next').style.animation = 'pulse 0.8s ease-in-out infinite';
        } else {
            document.getElementById('until-next').style.color = '#ece8e0';
            document.getElementById('until-next').style.animation = 'pulse 2s ease-in-out infinite';
        }
    }
}

function highlightActivePrayer(currentPrayer) {
    const prayerCells = document.querySelectorAll('.prayer-cell');
    prayerCells.forEach(cell => {
        cell.classList.remove('active');
        const prayerAttr = cell.getAttribute('data-prayer');
        if (prayerAttr && prayerAttr.toLowerCase() === currentPrayer.toLowerCase()) {
            cell.classList.add('active');
        }
    });
}

function updateDisplay() {
    updateDate();
    const todayTimes = getTodayPrayerTimes();
    if (todayTimes) {
        document.getElementById('fajr-time').textContent = convertTo12Hour(todayTimes.fajr);
        document.getElementById('dhuhr-time').textContent = convertTo12Hour(todayTimes.dhuhr);
        document.getElementById('asr-time').textContent = convertTo12Hour(todayTimes.asr);
        document.getElementById('maghrib-time').textContent = convertTo12Hour(todayTimes.maghrib);
        document.getElementById('isha-time').textContent = convertTo12Hour(todayTimes.isha);
        updatePrayerStatus(todayTimes);
        const loadingMsg = document.getElementById('loading-message');
        if (loadingMsg) loadingMsg.classList.remove('show');
    } else {
        const loadingMsg = document.getElementById('loading-message');
        if (loadingMsg) {
            loadingMsg.innerHTML = '<span>لا توجد مواقيت لهذا اليوم</span>';
            loadingMsg.classList.add('show');
        }
    }
}

function checkDateChange() {
    const now = new Date();
    if (now.getDate() !== currentDate.getDate() ||
        now.getMonth() !== currentDate.getMonth() ||
        now.getFullYear() !== currentDate.getFullYear()) {
        currentDate = now;
        updateDisplay();
    }
}

async function loadPrayerData() {
    const loadingMsg = document.getElementById('loading-message');
    if (loadingMsg) loadingMsg.classList.add('show');
    try {
        const response = await fetch('prayers.json');
        if (!response.ok) throw new Error('فشل تحميل ملف المواقيت');
        prayerDataArray = await response.json();
        if (prayerDataArray.length > 0 && prayerDataArray[0].date === 'تاريخ') {
            prayerDataArray = prayerDataArray.slice(1);
        }
        updateDisplay();
        if (loadingMsg) loadingMsg.classList.remove('show');
    } catch (error) {
        console.error('خطأ:', error);
        if (loadingMsg) {
            loadingMsg.innerHTML = '<span>فشل تحميل مواقيت الصلاة</span>';
            loadingMsg.classList.add('show');
        }
    }
}

function startRealTimeUpdates() {
    setInterval(() => {
        const now = new Date();
        const currentSecond = now.getSeconds();
        
        // تحديث الوقت الحالي
        document.getElementById('current-time').textContent = formatCurrentTime(now);
        
        // تحديث المؤقتات فقط عندما تتغير الثواني
        if (currentSecond !== lastUpdateSecond) {
            lastUpdateSecond = currentSecond;
            const todayTimes = getTodayPrayerTimes();
            if (todayTimes) {
                updatePrayerStatus(todayTimes);
            }
        }
        
        // التحقق من تغير اليوم
        checkDateChange();
    }, 100);
}

// ============================================
// تهيئة التطبيق عند تحميل الصفحة
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    loadPrayerData().then(function() {
        startRealTimeUpdates();
    });
});