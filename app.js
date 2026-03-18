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
const studiesRef = ref(db, 'studies'), prayersRef = ref(db, 'prayers'), mealsRef = ref(db, 'meals'), learnsRef = ref(db, 'learnings');

const ADMIN_CODE = "Grace2026";
let allStudiesRawData = {}, allPrayersData = null, allMealsData = {}, allLearnsData = null;
let currentStudyId = null, myId = localStorage.getItem('lsg_user_id') || ('user_' + Math.random().toString(36).substr(2, 9));
localStorage.setItem('lsg_user_id', myId);

function getBibleLink(ref) {
    return `https://www.bible.com/search/bible?q=${encodeURIComponent(ref.trim())}`;
}

window.setPage = (page) => {
    document.querySelectorAll('.page-view').forEach(p => { p.style.display = 'none'; });
    const activePage = document.getElementById(`view-${page}`);
    if (activePage) activePage.style.display = 'block';

    document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`nav-${page}`);
    if (activeBtn) activeBtn.classList.add('active');
    
    if (page === 'prayers') { localStorage.setItem('lastPrayerCheck', Date.now()); document.getElementById('prayer-dot').style.display = 'none'; }
    if (page === 'learnings') { localStorage.setItem('lastLearnCheck', Date.now()); document.getElementById('learning-dot').style.display = 'none'; }
    window.scrollTo(0,0);
};

window.toggleExtra = (t) => {
    const el = document.getElementById(`${t.toLowerCase()}InputArea`);
    if (el) el.style.display = document.getElementById(`check${t}`).checked ? 'block' : 'none';
};

// --- LEARNINGS ---
onValue(learnsRef, snap => { allLearnsData = snap.val(); renderLearnings(); });
window.postLearning = async () => {
    const title = document.getElementById('learnTitle').value, notes = document.getElementById('learnNotes').value;
    if(!title || !notes) return alert("Title and Notes are required.");
    await set(push(learnsRef), {
        name: document.getElementById('learnName').value || "Friend",
        title, notes, timestamp: Date.now(), ownerId: myId,
        scrip: document.getElementById('checkScrip').checked ? document.getElementById('learnScrip').value : null,
        url: document.getElementById('checkUrl').checked ? document.getElementById('learnUrl').value : null
    });
    ['learnTitle','learnNotes','learnScrip','learnUrl'].forEach(id => document.getElementById(id).value = "");
    ['checkScrip','checkUrl'].forEach(id => { document.getElementById(id).checked = false; window.toggleExtra(id.replace('check','')); });
};

function renderLearnings() {
    const list = document.getElementById('learning-list'); if(!allLearnsData) { list.innerHTML = "<p style='text-align:center; padding:20px;'>No insights shared yet.</p>"; return; }
    const all = Object.entries(allLearnsData).map(([id, val]) => ({ id, ...val })).sort((a,b) => b.timestamp - a.timestamp);
    const last = localStorage.getItem('lastLearnCheck') || 0;
    if (Math.max(...all.map(r => r.timestamp)) > last && !document.getElementById('nav-learnings').classList.contains('active')) document.getElementById('learning-dot').style.display = 'block';
    list.innerHTML = all.map(l => {
        const canEdit = document.body.classList.contains('show-admin') || l.ownerId === myId;
        return `<div class="feed-card">
            ${canEdit ? `<button class="delete-btn" onclick="window.deleteItem('learnings','${l.id}')">Delete</button>` : ''}
            <strong>${l.name}</strong><h3 style="margin:5px 0;">${l.title}</h3>
            <span class="timestamp">Shared: ${new Date(l.timestamp).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
            ${l.scrip ? `<a href="${getBibleLink(l.scrip)}" target="_blank" class="item-link">📖 ${l.scrip} (ESV)</a>` : ''}
            ${l.url ? `<a href="${l.url}" target="_blank" class="item-link">🔗 View Link</a>` : ''}
            <div class="${canEdit ? 'editable-note' : ''}" contenteditable="${canEdit}" onblur="window.updateNote('learnings','${l.id}',this.innerText)">${l.notes}</div>
            <div class="prayer-actions"><button class="celeb-btn" onclick="window.incrementTally('learnings','${l.id}','celebs')">✨</button> ${l.celebs ? `<span class="tally-count">${l.celebs}</span>` : ''}</div>
        </div>`;