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
let allPrayersData = null;
let currentStudyId = null;
let daysToDisplay = 14; 

let myId = localStorage.getItem('lsg_user_id') || ('user_' + Math.random().toString(36).substr(2, 9));
localStorage.setItem('lsg_user_id', myId);

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
    const [id, s] = entry; currentStudyId = id;
    const passages = (s.passage || "").split('\n').filter(p => p.trim() !== "");
    document.getElementById('passage-text').innerHTML = passages.map(p => `
        <div style="margin-bottom:15px;"><p class="scripture">${p}</p>
        <a href="https://www.bible.com/search/bible?q=${encodeURIComponent(p)}" target="_blank" class="bible-link-btn">📖 Open ${p}</a></div>
    `).join('');
    document.getElementById('activity-desc').innerText = s.activity || '';
    document.getElementById('lyrics-container').innerText = s.lyrics || '';
    document.getElementById('last-updated-text').innerText = s.lastModified ? `Updated: ${new Date(s.lastModified).toLocaleString()}` : '';
}

window.loadMorePrayers = () => { daysToDisplay += 14; renderPrayers(allPrayersData); };

onValue(prayersRef, (snap) => { allPrayersData = snap.val(); renderPrayers(allPrayersData); });

window.incrementPrayerTally = async (id) => {
    const currentTally = allPrayersData[id].tally || 0;
    await set(ref(db, `prayers/${id}/tally`), currentTally + 1);
};

function renderPrayers(data) {
    if (!data) { document.getElementById('prayer-list').innerHTML = "No prayers yet."; return; }
    const isAdmin = document.body.classList.contains('show-admin');
    const all = Object.entries(data).map(([id, val]) => ({ id, ...val }));
    const lastViewed = localStorage.getItem('lastPrayerCheck') || 0;
    if (Math.max(...all.map(p => p.timestamp)) > lastViewed && !document.getElementById('nav-prayers').classList.contains('active')) {
        document.getElementById('prayer-dot').style.display = 'block';
    }
    const cutoff = Date.now() - (daysToDisplay * 24 * 60 * 60 * 1000);
    const visible = all.filter(p => p.timestamp > cutoff).sort((a,b) => b.timestamp - a.timestamp);
    document.getElementById('prayer-list').innerHTML = visible.map(p => {
        const canDelete = isAdmin || (p.ownerId === myId);
        return `
            <div class="prayer-item">
                ${canDelete ? `<button class="delete-btn" onclick="window.deletePrayer('${p.id}')">Delete</button>` : ''}
                <strong>${p.name} <small>(${new Date(p.timestamp).toLocaleDateString()})</small></strong>
                <p>${p.request}</p>
                <div class="prayer-actions">
                    <button class="prayed-btn" onclick="window.incrementPrayerTally('${p.id}')">I Prayed!</button>
                    ${p.tally ? `<span class="tally-count">🙏 ${p.tally}</span>` : ''}
                </div>
            </div>`;
    }).join('');
    document.getElementById('loadMorePrayers').style.display = all.length > visible.length ? 'block' : 'none';
}

window.shareStudy = function() {
    // 1. Grab data instantly (No 'await')
    const dateSelect = document.getElementById('study-date');
    const selectedDate = (dateSelect && dateSelect.options.length > 0) 
        ? dateSelect.options[dateSelect.selectedIndex].text 
        : "Study";
    
    const shareData = {
        title: 'LSG Portal',
        text: `📖 LSG Portal: ${selectedDate}\nCheck out this week's study and prayer requests:`,
        url: window.location.origin + window.location.pathname
    };

    // 2. Immediate Execution
    if (navigator.share) {
        navigator.share(shareData)
            .then(() => console.log('Successful share'))
            .catch((error) => {
                // If it fails in Chrome, it's often because of the URL format
                // We fallback to clipboard immediately
                copyToClipboardFallback(shareData);
            });
    } else {
        copyToClipboardFallback(shareData);
    }
};

// Separate helper function to keep the main one clean
function copyToClipboardFallback(data) {
    const fullText = `${data.text}\n${data.url}`;
    navigator.clipboard.writeText(fullText);
    alert("Link copied to clipboard!");
}

window.postPrayer = async () => {
    const text = document.getElementById('prayerText').value;
    if(!text.trim()) return alert("Enter request.");
    await set(push(prayersRef), {
        name: document.getElementById('anonToggle').checked ? "Anonymous" : (document.getElementById('prayerName').value || "Friend"),
        request: text, timestamp: Date.now(), ownerId: myId
    });
    document.getElementById('prayerText').value = "";
};

window.deletePrayer = async (id) => { if(confirm("Delete prayer?")) await set(ref(db, `prayers/${id}`), null); };
window.openAdmin = () => { if(prompt("Code:") === ADMIN_CODE) { document.body.classList.add('show-admin'); renderPrayers(allPrayersData); } };
window.openNewStudyModal = () => {
    currentStudyId = null; document.getElementById('modalTitle').innerText = "New Study";
    document.querySelectorAll('.modal-content input, .modal-content textarea').forEach(i => i.value = "");
    document.getElementById('adminModal').style.display = 'block';
};
document.getElementById('editStudyBtn').onclick = () => {
    const s = allStudiesRawData[currentStudyId];
    document.getElementById('newDate').value = s.date; document.getElementById('newPassage').value = s.passage;
    document.getElementById('newActivity').value = s.activity; document.getElementById('newLyrics').value = s.lyrics;
    document.getElementById('adminModal').style.display = 'block';
};
document.getElementById('saveStudyBtn').onclick = async () => {
    const d = { date: document.getElementById('newDate').value, passage: document.getElementById('newPassage').value, 
                activity: document.getElementById('newActivity').value, lyrics: document.getElementById('newLyrics').value, lastModified: Date.now() };
    await set(currentStudyId ? ref(db, `studies/${currentStudyId}`) : push(studiesRef), d);
    document.getElementById('adminModal').style.display = 'none';
};
document.getElementById('deleteStudyBtn').onclick = async () => { if(confirm("Delete week?")) await set(ref(db, `studies/${currentStudyId}`), null); };
document.getElementById('study-date').onchange = (e) => renderStudy(e.target.value);
document.getElementById('theme-toggle').onchange = (e) => document.documentElement.setAttribute('data-theme', e.target.checked ? 'dark' : 'light');
window.setPage('studies');