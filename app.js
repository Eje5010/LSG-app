import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "YOUR_KEY", authDomain: "YOUR_DOMAIN", databaseURL: "YOUR_URL",
  projectId: "YOUR_ID", storageBucket: "YOUR_BUCKET", messagingSenderId: "YOUR_SENDER", appId: "YOUR_APP"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const studiesRef = ref(db, 'studies');
const prayersRef = ref(db, 'prayers');
const mealsRef = ref(db, 'meals');

const ADMIN_CODE = "Grace2026";
let allStudiesRawData = {};
let allPrayersData = null;
let allMealsData = {};
let currentStudyId = null;
let daysToDisplay = 14; 

let myId = localStorage.getItem('lsg_user_id') || ('user_' + Math.random().toString(36).substr(2, 9));
localStorage.setItem('lsg_user_id', myId);

const bibleMap = { "GENESIS":"GEN","EXODUS":"EXO","LEVITICUS":"LEV","NUMBERS":"NUM","DEUTERONOMY":"DEU","JOSHUA":"JOS","JUDGES":"JDG","RUTH":"RUT","1 SAMUEL":"1SA","2 SAMUEL":"2SA","1 KINGS":"1KI","2 KINGS":"2KI","1 CHRONICLES":"1CH","2 CHRONICLES":"2CH","EZRA":"EZR","NEHEMIAH":"NEH","ESTHER":"EST","JOB":"JOB","PSALMS":"PSA","PSALM":"PSA","PROVERBS":"PRO","ECCLESIASTES":"ECC","SONG OF SOLOMON":"SNG","SONG OF SONGS":"SNG","ISAIAH":"ISA","JEREMIAH":"JER","LAMENTATIONS":"LAM","EZEKIEL":"EZK","DANIEL":"DAN","HOSEA":"HOS","JOEL":"JOL","AMOS":"AMO","OBADIAH":"OBA","JONAH":"JON","MICAH":"MIC","NAHUM":"NAM","HABAKKUK":"HAB","ZEPHANIAH":"ZEP","HAGGAI":"HAG","ZECHARIAH":"ZEC","MALACHI":"MAL","MATTHEW":"MAT","MARK":"MRK","LUKE":"LUK","JOHN":"JHN","ACTS":"ACT","ROMANS":"ROM","1 CORINTHIANS":"1CO","2 CORINTHIANS":"2CO","GALATIANS":"GAL","EPHESIANS":"EPH","PHILIPPIANS":"PHP","COLOSSIANS":"COL","1 THESSALONIANS":"1TH","2 THESSALONIANS":"2TH","1 TIMOTHY":"1TI","2 TIMOTHY":"2TI","TITUS":"TIT","PHILEMON":"PHM","HEBREWS":"HEB","JAMES":"JAS","1 PETER":"1PE","2 PETER":"2PE","1 JOHN":"1JN","2 JOHN":"2JN","3 JOHN":"3JN","JUDE":"JUD","REVELATION":"REV" };

// --- NAVIGATION ---
window.setPage = (page) => {
    document.querySelectorAll('.page-view').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
    document.getElementById(`view-${page}`).style.display = 'block';
    document.getElementById(`nav-${page}`).classList.add('active');
    if (page === 'prayers') { localStorage.setItem('lastPrayerCheck', Date.now()); document.getElementById('prayer-dot').style.display = 'none'; }
};

// --- STUDY LOGIC (TIMEZONE HARDENED) ---
onValue(studiesRef, (snap) => {
    const data = snap.val();
    if (data) {
        allStudiesRawData = data;
        const sorted = Object.entries(data).sort((a,b) => new Date(b[1].date) - new Date(a[1].date));
        
        document.getElementById('study-date').innerHTML = sorted.map(([id, s]) => {
            const [y, m, d] = s.date.split('-');
            return `<option value="${s.date}">${new Date(y, m-1, d).toDateString()}</option>`;
        }).join('');

        const now = new Date();
        const dTarget = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diff = (3 - dTarget.getDay() + 7) % 7;
        dTarget.setDate(dTarget.getDate() + diff);
        
        const tY = dTarget.getFullYear();
        const tM = String(dTarget.getMonth() + 1).padStart(2, '0');
        const tD = String(dTarget.getDate()).padStart(2, '0');
        const targetWedStr = `${tY}-${tM}-${tD}`;

        const bestMatch = sorted.find(([id, s]) => s.date === targetWedStr) || sorted[0];
        const defaultDate = bestMatch[1].date;
        document.getElementById('study-date').value = defaultDate;
        renderStudy(defaultDate);
    }
});

onValue(mealsRef, (snap) => {
    allMealsData = snap.val() || {};
    renderMeals();
    const dateSelect = document.getElementById('study-date');
    if (dateSelect && dateSelect.value) renderStudy(dateSelect.value);
});

function renderStudy(date) {
    const entry = Object.entries(allStudiesRawData).find(([id, s]) => s.date === date);
    if (!entry) return;
    const [id, s] = entry; currentStudyId = id;
    const passages = (s.passage || "").split('\n').filter(p => p.trim() !== "");
    
    document.getElementById('passage-text').innerHTML = passages.map(p => {
        let cleanRef = p.toUpperCase().trim();
        for (let full in bibleMap) { if (cleanRef.startsWith(full)) { cleanRef = cleanRef.replace(full, bibleMap[full]); break; } }
        cleanRef = cleanRef.replace(/\s+/g, '.').replace(/:/g, '.');
        return `<div style="margin-bottom:15px;"><p class="scripture">${p}</p><a href="https://www.bible.com/bible/111/${cleanRef}" target="_blank" class="bible-link-btn">📖 Open in Bible App</a></div>`;
    }).join('');
    
    document.getElementById('activity-desc').innerText = s.activity || '';
    document.getElementById('lyrics-container').innerText = s.lyrics || '';
    document.getElementById('last-updated-text').innerText = s.lastModified ? `Updated: ${new Date(s.lastModified).toLocaleString()}` : '';

    const meal = allMealsData[date];
    const mealCard = document.getElementById('study-meal-card');
    const mealInfo = document.getElementById('study-meal-info');
    if (meal) {
        mealCard.style.display = 'block';
        mealInfo.innerHTML = `<p><strong>${meal.name}</strong> is bringing <strong>${meal.dish}</strong>! 🍲</p>`;
    } else {
        const dArr = date.split('-');
        const isWed = new Date(dArr[0], dArr[1]-1, dArr[2]).getDay() === 3;
        mealCard.style.display = isWed ? 'block' : 'none';
        if (isWed) mealInfo.innerHTML = `<p style="color: #e67e22;">No meal signed up yet for this week.</p>`;
    }
}

// --- MEAL LOGIC (LOCAL TIME) ---
function getNextWednesdays(count) {
    let dates = []; let now = new Date();
    let d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let diff = (3 - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + diff);
    for (let i = 0; i < count; i++) {
        const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${day}`); d.setDate(d.getDate() + 7);
    }
    return dates;
}

function renderMeals() {
    const list = document.getElementById('meal-list');
    const weds = getNextWednesdays(4);
    const isAdmin = document.body.classList.contains('show-admin');
    list.innerHTML = weds.map(date => {
        const claim = allMealsData[date];
        const [y, m, d] = date.split('-');
        const dateStr = new Date(y, m-1, d).toDateString();
        if (claim) {
            const canEdit = isAdmin || claim.ownerId === myId;
            return `<div class="meal-slot"><div><strong>${dateStr}</strong><br><span class="meal-status claimed">✅ ${claim.name}: ${claim.dish}</span></div>
            <div>${canEdit ? `<button class="ui-btn" onclick="window.promptClaim('${date}', true)">✏️</button>` : ''}
            ${canEdit ? `<button class="delete-btn" onclick="window.deleteMeal('${date}')">🗑️</button>` : ''}</div></div>`;
        }
        return `<div class="meal-slot"><strong>${dateStr}</strong><button class="claim-btn" onclick="window.promptClaim('${date}')">Sign Up</button></div>`;
    }).join('');
}

window.promptClaim = async (date, isEdit = false) => {
    const ex = allMealsData[date];
    const name = isEdit ? ex.name : prompt("Enter your name:"); if (!name) return;
    const dish = prompt("What are you bringing?", isEdit ? ex.dish : ""); if (!dish) return;
    await set(ref(db, `meals/${date}`), { name, dish, ownerId: isEdit ? ex.ownerId : myId });
};

window.deleteMeal = async (date) => { if (confirm("Cancel this meal?")) await set(ref(db, `meals/${date}`), null); };

// --- PRAYER LOGIC ---
onValue(prayersRef, (snap) => { allPrayersData = snap.val(); renderPrayers(allPrayersData); });
window.incrementPrayerTally = async (id) => { await set(ref(db, `prayers/${id}/tally`), (allPrayersData[id].tally || 0) + 1); };
function renderPrayers(data) {
    if (!data) { document.getElementById('prayer-list').innerHTML = "No prayers yet."; return; }
    const isAdmin = document.body.classList.contains('show-admin');
    const all = Object.entries(data).map(([id, val]) => ({ id, ...val }));
    const last = localStorage.getItem('lastPrayerCheck') || 0;
    if (Math.max(...all.map(p => p.timestamp)) > last && !document.getElementById('nav-prayers').classList.contains('active')) document.getElementById('prayer-dot').style.display = 'block';
    const cutoff = Date.now() - (daysToDisplay * 86400000);
    const visible = all.filter(p => p.timestamp > cutoff).sort((a,b) => b.timestamp - a.timestamp);
    document.getElementById('prayer-list').innerHTML = visible.map(p => `<div class="prayer-item">${(isAdmin || p.ownerId === myId) ? `<button class="delete-btn" onclick="window.deletePrayer('${p.id}')">Delete</button>` : ''}<strong>${p.name} <small>(${new Date(p.timestamp).toLocaleDateString()})</small></strong><p>${p.request}</p><div class="prayer-actions"><button class="prayed-btn" onclick="window.incrementPrayerTally('${p.id}')">I Prayed!</button>${p.tally ? `<span class="tally-count">🙏 ${p.tally}</span>` : ''}</div></div>`).join('');
    document.getElementById('loadMorePrayers').style.display = all.length > visible.length ? 'block' : 'none';
}
window.postPrayer = async () => {
    const text = document.getElementById('prayerText').value; if(!text.trim()) return alert("Enter request.");
    await set(push(prayersRef), { name: document.getElementById('anonToggle').checked ? "Anonymous" : (document.getElementById('prayerName').value || "Friend"), request: text, timestamp: Date.now(), ownerId: myId });
    document.getElementById('prayerText').value = "";
};
window.deletePrayer = async (id) => { if(confirm("Delete prayer?")) await set(ref(db, `prayers/${id}`), null); };
window.loadMorePrayers = () => { daysToDisplay += 14; renderPrayers(allPrayersData); };

// --- ADMIN ---
window.openAdmin = () => { if(prompt("Code:") === ADMIN_CODE) { document.body.classList.add('show-admin'); renderPrayers(allPrayersData); renderMeals(); } };
window.openNewStudyModal = () => { currentStudyId = null; document.getElementById('modalTitle').innerText = "New Study"; document.querySelectorAll('.modal-content input, .modal-content textarea').forEach(i => i.value = ""); document.getElementById('adminModal').style.display = 'block'; };
document.getElementById('editStudyBtn').onclick = () => { const s = allStudiesRawData[currentStudyId]; document.getElementById('newDate').value = s.date; document.getElementById('newPassage').value = s.passage; document.getElementById('newActivity').value = s.activity; document.getElementById('newLyrics').value = s.lyrics; document.getElementById('adminModal').style.display = 'block'; };
document.getElementById('saveStudyBtn').onclick = async () => { 
    const dateInput = document.getElementById('newDate').value;
    await set(currentStudyId ? ref(db, `studies/${currentStudyId}`) : push(studiesRef), { date: dateInput, passage: document.getElementById('newPassage').value, activity: document.getElementById('newActivity').value, lyrics: document.getElementById('newLyrics').value, lastModified: Date.now() });
    document.getElementById('adminModal').style.display = 'none';
};
document.getElementById('deleteStudyBtn').onclick = async () => { if(confirm("Delete week?")) await set(ref(db, `studies/${currentStudyId}`), null); };

// --- SHARE ---
window.shareStudy = function() {
    const sel = document.getElementById('study-date'); const txt = `📖 LSG Portal: ${sel.options[sel.selectedIndex]?.text || "Study"}\nLink:`;
    const url = window.location.origin + window.location.pathname;
    if (navigator.share) navigator.share({ title: 'LSG Portal', text: txt, url }).catch(() => {});
    else { navigator.clipboard.writeText(txt + " " + url); alert("Link copied!"); }
};

// --- INIT ---
document.getElementById('study-date').onchange = (e) => renderStudy(e.target.value);
document.getElementById('theme-toggle').onchange = (e) => document.documentElement.setAttribute('data-theme', e.target.checked ? 'dark' : 'light');
window.setPage('studies');