import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyApSCRd4undaYcm153QIROmhpDGSWiRIRA",
    authDomain: "lsg-app-5680f.firebaseapp.com",
    databaseURL: "https://lsg-app-5680f-default-rtdb.firebaseio.com",
    projectId: "lsg-app-5680f",
    storageBucket: "lsg-app-5680f.firebasestorage.app",
    messagingSenderId: "832031335726",
    appId: "1:832031335726:web:09e180dbfe10605c97c6bf",
    measurementId: "G-DEBFM292Z4"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const studiesRef = ref(db, 'studies');
const prayersRef = ref(db, 'prayers');
const mealsRef = ref(db, 'meals');
const learnsRef = ref(db, 'learnings');

const ADMIN_CODE = "Grace2026";
let allStudiesRawData = {}, allPrayersData = null, allMealsData = {}, allLearnsData = null;
let currentStudyId = null, myId = localStorage.getItem('lsg_user_id') || ('user_' + Math.random().toString(36).substr(2, 9));
localStorage.setItem('lsg_user_id', myId);

const bibleMap = { "GENESIS":"GEN","EXODUS":"EXO","LEVITICUS":"LEV","NUMBERS":"NUM","DEUTERONOMY":"DEU","JOSHUA":"JOS","JUDGES":"JDG","RUTH":"RUT","1 SAMUEL":"1SA","2 SAMUEL":"2SA","1 KINGS":"1KI","2 KINGS":"2KI","1 CHRONICLES":"1CH","2 CHRONICLES":"2CH","EZRA":"EZR","NEHEMIAH":"NEH","ESTHER":"EST","JOB":"JOB","PSALMS":"PSA","PSALM":"PSA","PROVERBS":"PRO","ECCLESIASTES":"ECC","SONG OF SOLOMON":"SNG","SONG OF SONGS":"SNG","ISAIAH":"ISA","JEREMIAH":"JER","LAMENTATIONS":"LAM","EZEKIEL":"EZK","DANIEL":"DAN","HOSEA":"HOS","JOEL":"JOL","AMOS":"AMO","OBADIAH":"OBA","JONAH":"JON","MICAH":"MIC","NAHUM":"NAM","HABAKKUK":"HAB","ZEPHANIAH":"ZEP","HAGGAI":"HAG","ZECHARIAH":"ZEC","MALACHI":"MAL","MATTHEW":"MAT","MARK":"MRK","LUKE":"LUK","JOHN":"JHN","ACTS":"ACT","ROMANS":"ROM","1 CORINTHIANS":"1CO","2 CORINTHIANS":"2CO","GALATIANS":"GAL","EPHESIANS":"EPH","PHILIPPIANS":"PHP","COLOSSIANS":"COL","1 THESSALONIANS":"1TH","2 THESSALONIANS":"2TH","1 TIMOTHY":"1TI","2 TIMOTHY":"2TI","TITUS":"TIT","PHILEMON":"PHM","HEBREWS":"HEB","JAMES":"JAS","1 PETER":"1PE","2 PETER":"2PE","1 JOHN":"1JN","2 JOHN":"2JN","3 JOHN":"3JN","JUDE":"JUD","REVELATION":"REV" };

// Translation Neutral Bible Link (Uses no specific translation code)
function getBibleLink(ref) {
    let clean = ref.toUpperCase().trim();
    for (let full in bibleMap) { if (clean.startsWith(full)) { clean = clean.replace(full, bibleMap[full]); break; } }
    clean = clean.replace(/\s+/g, '.').replace(/:/g, '.');
    return `https://www.bible.com/bible/search?q=${clean}`;
}

// --- NAV & UI ---
window.setPage = (page) => {
    document.querySelectorAll('.page-view').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
    document.getElementById(`view-${page}`).style.display = 'block';
    document.getElementById(`nav-${page}`).classList.add('active');
    if (page === 'prayers') { localStorage.setItem('lastPrayerCheck', Date.now()); document.getElementById('prayer-dot').style.display = 'none'; }
    if (page === 'learnings') { localStorage.setItem('lastLearnCheck', Date.now()); document.getElementById('learning-dot').style.display = 'none'; }
};

window.toggleExtra = (type) => {
    const field = document.getElementById(`learn${type}`);
    field.style.display = document.getElementById(`check${type}`).checked ? 'block' : 'none';
};

// --- LEARNINGS ---
onValue(learnsRef, (snap) => { allLearnsData = snap.val(); renderLearnings(); });
window.postLearning = async () => {
    const title = document.getElementById('learnTitle').value, notes = document.getElementById('learnNotes').value;
    if(!title || !notes) return alert("Title and Notes required.");
    const data = {
        name: document.getElementById('learnName').value || "Friend",
        title: title, notes: notes, timestamp: Date.now(), ownerId: myId,
        scrip: document.getElementById('checkScrip').checked ? document.getElementById('learnScrip').value : null,
        url: document.getElementById('checkUrl').checked ? document.getElementById('learnUrl').value : null
    };
    await set(push(learnsRef), data);
    ['learnTitle','learnNotes','learnScrip','learnUrl'].forEach(id => document.getElementById(id).value = "");
    ['checkScrip','checkUrl'].forEach(id => { document.getElementById(id).checked = false; window.toggleExtra(id.replace('check','')); });
};

function renderLearnings() {
    const list = document.getElementById('learning-list'); if(!allLearnsData) { list.innerHTML = "No insights shared yet."; return; }
    const isAdmin = document.body.classList.contains('show-admin');
    const all = Object.entries(allLearnsData).map(([id, val]) => ({ id, ...val })).sort((a,b) => b.timestamp - a.timestamp);
    const last = localStorage.getItem('lastLearnCheck') || 0;
    if (Math.max(...all.map(r => r.timestamp)) > last && !document.getElementById('nav-learnings').classList.contains('active')) document.getElementById('learning-dot').style.display = 'block';
    list.innerHTML = all.map(l => {
        const canEdit = isAdmin || l.ownerId === myId;
        return `<div class="feed-card">
            ${canEdit ? `<button class="delete-btn" onclick="window.deleteItem('learnings','${l.id}')">Delete</button>` : ''}
            <strong>${l.name} <small>(${new Date(l.timestamp).toLocaleDateString()})</small></strong>
            <h3 style="margin:5px 0;">${l.title}</h3>
            ${l.scrip ? `<a href="${getBibleLink(l.scrip)}" target="_blank" class="item-link">📖 ${l.scrip}</a>` : ''}
            ${l.url ? `<a href="${l.url}" target="_blank" class="item-link">🔗 View Link</a>` : ''}
            <div class="${canEdit ? 'editable-note' : ''}" contenteditable="${canEdit}" onblur="window.updateNote('learnings','${l.id}',this.innerText)">${l.notes}</div>
            <div class="prayer-actions"><button class="prayed-btn" onclick="window.incrementTally('learnings','${l.id}','celebs')">🙌</button> ${l.celebs ? `<span class="tally-count">${l.celebs}</span>` : ''}</div>
        </div>`;
    }).join('');
}

// --- PRAYERS ---
onValue(prayersRef, (snap) => { allPrayersData = snap.val(); renderPrayers(); });
window.postPrayer = async () => {
    const txt = document.getElementById('prayerText').value; if(!txt) return;
    await set(push(prayersRef), { name: document.getElementById('anonToggle').checked ? "Anonymous" : (document.getElementById('prayerName').value || "Friend"), request: txt, timestamp: Date.now(), ownerId: myId });
    document.getElementById('prayerText').value = "";
};
function renderPrayers() {
    const list = document.getElementById('prayer-list'); if(!allPrayersData) { list.innerHTML = "No prayers yet."; return; }
    const isAdmin = document.body.classList.contains('show-admin');
    const all = Object.entries(allPrayersData).map(([id, val]) => ({ id, ...val }));
    const last = localStorage.getItem('lastPrayerCheck') || 0;
    if (Math.max(...all.map(p => p.timestamp)) > last && !document.getElementById('nav-prayers').classList.contains('active')) document.getElementById('prayer-dot').style.display = 'block';
    const visible = all.filter(p => p.timestamp > (Date.now() - 1209600000)).sort((a,b) => b.timestamp - a.timestamp);
    list.innerHTML = visible.map(p => {
        const canEdit = isAdmin || p.ownerId === myId;
        return `<div class="feed-card">
            ${canEdit ? `<button class="delete-btn" onclick="window.deleteItem('prayers','${p.id}')">Delete</button>` : ''}
            <strong>${p.name} <small>(${new Date(p.timestamp).toLocaleDateString()})</small></strong>
            <div class="${canEdit ? 'editable-note' : ''}" contenteditable="${canEdit}" onblur="window.updateNote('prayers','${p.id}',this.innerText)">${p.request}</div>
            <div class="prayer-actions"><button class="prayed-btn" onclick="window.incrementTally('prayers','${p.id}','tally')">I Prayed!</button> ${p.tally ? `<span class="tally-count">🙏 ${p.tally}</span>` : ''}</div>
        </div>`;
    }).join('');
}

// --- UTILS ---
window.deleteItem = async (p, id) => { if(confirm("Delete?")) await set(ref(db, `${p}/${id}`), null); };
window.updateNote = async (p, id, txt) => { await set(ref(db, `${p}/${id}/${p==='prayers'?'request':'notes'}`), txt); };
window.incrementTally = async (p, id, f) => { const d = p==='prayers'?allPrayersData:allLearnsData; await set(ref(db, `${p}/${id}/${f}`), (d[id][f] || 0) + 1); };

// --- STUDY & MEALS ---
onValue(studiesRef, (snap) => {
    const data = snap.val(); if(!data) return;
    allStudiesRawData = data;
    const sorted = Object.entries(data).sort((a,b) => new Date(b[1].date) - new Date(a[1].date));
    document.getElementById('study-date').innerHTML = sorted.map(([id, s]) => `<option value="${s.date}">${new Date(s.date.split('-')[0], s.date.split('-')[1]-1, s.date.split('-')[2]).toDateString()}</option>`).join('');
    const now = new Date(); const dTarget = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    dTarget.setDate(dTarget.getDate() + (3 - dTarget.getDay() + 7) % 7);
    const tWed = `${dTarget.getFullYear()}-${String(dTarget.getMonth()+1).padStart(2,'0')}-${String(dTarget.getDate()).padStart(2,'0')}`;
    const best = sorted.find(([id, s]) => s.date === tWed) || sorted[0];
    document.getElementById('study-date').value = best[1].date; renderStudy(best[1].date);
});

onValue(mealsRef, (snap) => { allMealsData = snap.val() || {}; renderMeals(); const sd = document.getElementById('study-date'); if(sd?.value) renderStudy(sd.value); });

function renderStudy(date) {
    const s = Object.values(allStudiesRawData).find(x => x.date === date); if(!s) return;
    document.getElementById('passage-text').innerHTML = (s.passage || "").split('\n').filter(p => p.trim()).map(p => `<div style="margin-bottom:10px;"><p class="scripture">${p}</p><a href="${getBibleLink(p)}" target="_blank" style="color:var(--btn);font-size:0.8rem;">Open Bible</a></div>`).join('');
    document.getElementById('activity-desc').innerText = s.activity || '';
    document.getElementById('lyrics-container').innerText = s.lyrics || '';
    const meal = allMealsData[date], mc = document.getElementById('study-meal-card'), mi = document.getElementById('study-meal-info');
    if(meal) { mc.style.display = 'block'; mi.innerHTML = `<p><strong>${meal.name}</strong> is bringing <strong>${meal.dish}</strong>!</p>`; }
    else { const isW = new Date(date.split('-')[0], date.split('-')[1]-1, date.split('-')[2]).getDay() === 3; mc.style.display = isW ? 'block' : 'none'; mi.innerHTML = `<p style="color:#e67e22;">No meal yet.</p>`; }
}

function renderMeals() {
    let d = new Date(); d = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    d.setDate(d.getDate() + (3 - d.getDay() + 7) % 7);
    const weds = []; for(let i=0; i<4; i++) { weds.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`); d.setDate(d.getDate()+7); }
    const isAdmin = document.body.classList.contains('show-admin');
    document.getElementById('meal-list').innerHTML = weds.map(date => {
        const claim = allMealsData[date]; const dStr = new Date(date.split('-')[0], date.split('-')[1]-1, date.split('-')[2]).toDateString();
        if(claim) return `<div class="meal-slot"><div><strong>${dStr}</strong><br><span class="claimed">✅ ${claim.name}: ${claim.dish}</span></div><div>${(isAdmin || claim.ownerId === myId) ? `<button class="ui-btn" onclick="window.pClaim('${date}',true)">✏️</button> <button class="delete-btn" onclick="window.dMeal('${date}')">🗑️</button>` : ''}</div></div>`;
        return `<div class="meal-slot"><strong>${dStr}</strong><button class="claim-btn" onclick="window.pClaim('${date}')">Sign Up</button></div>`;
    }).join('');
}

window.pClaim = async (date, edit) => {
    const ex = allMealsData[date]; const name = edit ? ex.name : prompt("Name:"); if(!name) return;
    const dish = prompt("Dish?", edit ? ex.dish : ""); if(!dish) return;
    await set(ref(db, `meals/${date}`), { name, dish, ownerId: edit ? ex.ownerId : myId });
};
window.dMeal = async (date) => { if(confirm("Cancel?")) await set(ref(db, `meals/${date}`), null); };

window.openAdmin = () => { if(prompt("Code:") === ADMIN_CODE) { document.body.classList.add('show-admin'); renderPrayers(); renderMeals(); renderLearnings(); } };
window.openNewStudyModal = () => { currentStudyId = null; document.getElementById('adminModal').style.display='block'; };
document.getElementById('saveStudyBtn').onclick = async () => {
    await set(push(studiesRef), { date: document.getElementById('newDate').value, passage: document.getElementById('newPassage').value, activity: document.getElementById('newActivity').value, lyrics: document.getElementById('newLyrics').value });
    document.getElementById('adminModal').style.display='none';
};
window.shareStudy = () => { navigator.clipboard.writeText(window.location.href); alert("Link copied!"); };
document.getElementById('theme-toggle').onchange = (e) => document.documentElement.setAttribute('data-theme', e.target.checked ? 'dark' : 'light');
document.getElementById('study-date').onchange = (e) => renderStudy(e.target.value);
window.setPage('studies');