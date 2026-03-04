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

const ADMIN_CODE = "Grace2026";
let allStudiesRawData = {};
let currentStudyId = null;
let daysToDisplay = 14; 

// --- NAVIGATION & PAGES ---

window.setPage = (page) => {
    document.querySelectorAll('.page-view').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
    document.getElementById(`view-${page}`).style.display = 'block';
    document.getElementById(`nav-${page}`).classList.add('active');
    
    if (page === 'prayers') {
        localStorage.setItem('lastPrayerCheck', Date.now());
        document.getElementById('prayer-dot').style.display = 'none';
    }
};

// --- STUDY LOGIC ---

onValue(studiesRef, (snap) => {
    const data = snap.val();
    if (data) {
        allStudiesRawData = data;
        const sorted = Object.entries(data).sort((a,b) => new Date(b[1].date) - new Date(a[1].date));
        document.getElementById('study-date').innerHTML = sorted.map(([id, s]) => `<option value="${s.date}">${new Date(s.date).toDateString()}</option>`).join('');
        renderStudy(sorted[0][1].date);
    }
});

function renderStudy(date) {
    const entry = Object.entries(allStudiesRawData).find(([id, s]) => s.date === date);
    if (!entry) return;
    const [id, s] = entry; 
    currentStudyId = id;
    const passages = (s.passage || "").split('\n').filter(p => p.trim() !== "");
    document.getElementById('passage-text').innerHTML = passages.map(p => `
        <div style="margin-bottom:15px;"><p class="scripture">${p}</p>
        <a href="https://www.bible.com/search/bible?q=${encodeURIComponent(p)}" target="_blank" class="bible-link-btn">📖 Open ${p}</a></div>
    `).join('');
    document.getElementById('activity-desc').innerText = s.activity || '';
    document.getElementById('lyrics-container').innerText = s.lyrics || '';
}

// --- PRAYER LOGIC ---

window.loadMorePrayers = () => { daysToDisplay += 14; renderPrayers(allPrayersData); };

let allPrayersData = null;
onValue(prayersRef, (snap) => { 
    allPrayersData = snap.val();
    renderPrayers(allPrayersData); 
});

function renderPrayers(data) {
    if (!data) { document.getElementById('prayer-list').innerHTML = "No prayers yet."; return; }
    const all = Object.entries(data).map(([id, val]) => ({ id, ...val }));
    
    // Notification Check
    const lastViewed = localStorage.getItem('lastPrayerCheck') || 0;
    const newest = Math.max(...all.map(p => p.timestamp));
    if (newest > lastViewed && !document.getElementById('nav-prayers').classList.contains('active')) {
        document.getElementById('prayer-dot').style.display = 'block';
    }

    const cutoff = Date.now() - (daysToDisplay * 24 * 60 * 60 * 1000);
    const visible = all.filter(p => p.timestamp > cutoff).sort((a,b) => b.timestamp - a.timestamp);
    
    document.getElementById('prayer-list').innerHTML = visible.map(p => `
        <div class="prayer-item">
            <button class="delete-btn" onclick="window.deletePrayer('${p.id}')">Delete</button>
            <strong>${p.name} <small>(${new Date(p.timestamp).toLocaleDateString()})</small></strong>
            <p>${p.request}</p>
        </div>
    `).join('');
    document.getElementById('loadMorePrayers').style.display = all.length > visible.length ? 'block' : 'none';
}

window.postPrayer = async () => {
    const text = document.getElementById('prayerText').value;
    if(!text.trim()) return alert("Enter request.");
    await set(push(prayersRef), {
        name: document.getElementById('anonToggle').checked ? "Anonymous" : (document.getElementById('prayerName').value || "Friend"),
        request: text, timestamp: Date.now()
    });
    document.getElementById('prayerText').value = "";
};

window.deletePrayer = async (id) => { if(confirm("Delete prayer?")) await set(ref(db, `prayers/${id}`), null); };

// --- ADMIN ---

window.openAdmin = () => { if(prompt("Code:") === ADMIN_CODE) document.body.classList.add('show-admin'); };

window.openNewStudyModal = () => {
    currentStudyId = null; 
    document.getElementById('modalTitle').innerText = "New Study";
    document.querySelectorAll('.modal-content input, .modal-content textarea').forEach(i => i.value = "");
    document.getElementById('adminModal').style.display = 'block';
};

document.getElementById('editStudyBtn').onclick = () => {
    const s = allStudiesRawData[currentStudyId];
    document.getElementById('newDate').value = s.date;
    document.getElementById('newPassage').value = s.passage;
    document.getElementById('newActivity').value = s.activity;
    document.getElementById('newLyrics').value = s.lyrics;
    document.getElementById('adminModal').style.display = 'block';
};

document.getElementById('saveStudyBtn').onclick = async () => {
    const d = { 
        date: document.getElementById('newDate').value, 
        passage: document.getElementById('newPassage').value, 
        activity: document.getElementById('newActivity').value, 
        lyrics: document.getElementById('newLyrics').value 
    };
    await set(currentStudyId ? ref(db, `studies/${currentStudyId}`) : push(studiesRef), d);
    document.getElementById('adminModal').style.display = 'none';
};

document.getElementById('deleteStudyBtn').onclick = async () => { if(confirm("Delete week?")) await set(ref(db, `studies/${currentStudyId}`), null); };

// --- INIT ---

window.shareStudy = async () => {
    const dateSelect = document.getElementById('study-date');
    const dateText = dateSelect.options[dateSelect.selectedIndex]?.text || "Study";
    const shareText = `LSG Portal - Study for ${dateText}\n${window.location.href}`;
    if (navigator.share) {
        await navigator.share({ title: 'LSG Portal', text: shareText, url: window.location.href });
    } else {
        navigator.clipboard.writeText(shareText);
        alert("Link copied!");
    }
};

document.getElementById('study-date').onchange = (e) => renderStudy(e.target.value);
document.getElementById('theme-toggle').onchange = (e) => document.documentElement.setAttribute('data-theme', e.target.checked ? 'dark' : 'light');
window.setPage('studies');