import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// REPLACE THIS WITH YOUR FIREBASE CONFIG
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

let studies = [];

// --- CORE APP LOGIC ---

onValue(studiesRef, (snap) => {
    const data = snap.val();
    if (data) {
        studies = Object.values(data).sort((a,b) => new Date(b.date) - new Date(a.date));
        const select = document.getElementById('study-date');
        select.innerHTML = studies.map(s => `<option value="${s.date}">${new Date(s.date).toDateString()}</option>`).join('');
        renderStudy(studies[0].date);
    }
});

function renderStudy(date) {
    const s = studies.find(item => item.date === date);
    if (!s) return;
    document.getElementById('passage-text').innerText = s.passage;
    document.getElementById('activity-desc').innerText = s.activity;
    document.getElementById('lyrics-container').innerText = s.lyrics;
    document.getElementById('video-wrapper').innerHTML = getYouTubeEmbed(s.videoUrl);
    document.getElementById('open-bible-app').href = `https://www.bible.com/search/bible?q=${encodeURIComponent(s.passage)}`;
}

function getYouTubeEmbed(url) {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    const id = (match && match[2].length == 11) ? match[2] : null;
    return id ? `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>` : '';
}

// --- ADMIN & PRAYER LOGIC ---

document.getElementById('adminBtn').onclick = () => {
    if(prompt("Enter Admin Code:") === ADMIN_CODE) {
        document.getElementById('adminModal').style.display='block';
        document.body.classList.add('show-admin');
    }
};

document.getElementById('saveStudyBtn').onclick = async () => {
    const study = {
        date: document.getElementById('newDate').value,
        passage: document.getElementById('newPassage').value,
        videoUrl: document.getElementById('newVideoUrl').value,
        activity: document.getElementById('newActivity').value,
        lyrics: document.getElementById('newLyrics').value
    };
    await set(push(studiesRef), study);
    document.getElementById('adminModal').style.display='none';
};

window.postPrayer = async () => {
    const name = document.getElementById('prayerName').value;
    const text = document.getElementById('prayerText').value;
    const isAnon = document.getElementById('anonToggle').checked;
    if(!text) return alert("Please enter a request.");
    await set(push(prayersRef), {
        name: isAnon ? "Anonymous" : (name || "Friend"),
        request: text,
        timestamp: Date.now()
    });
    document.getElementById('prayerText').value = "";
};

onValue(prayersRef, (snap) => {
    const data = snap.val();
    const list = document.getElementById('prayer-list');
    if (!data) { list.innerHTML = "No requests yet."; return; }
    const items = Object.entries(data).map(([id, val]) => ({ id, ...val }));
    list.innerHTML = items.reverse().map(p => `
        <div class="prayer-item">
            <button class="delete-btn" onclick="deletePrayer('${p.id}')">Delete</button>
            <strong>${p.name} <small>(${new Date(p.timestamp).toLocaleDateString()})</small></strong>
            <p>${p.request}</p>
        </div>
    `).join('');
});

window.deletePrayer = async (id) => {
    if(confirm("Delete this request?")) await set(ref(db, `prayers/${id}`), null);
};

// --- UTILITIES ---

window.shareStudy = async () => {
    const text = `📖 Bible Study\nPassage: ${document.getElementById('passage-text').innerText}\n\nView here: ${window.location.href}`;
    if (navigator.share) await navigator.share({ title: 'Bible Study', text: text, url: window.location.href });
    else { navigator.clipboard.writeText(text); alert("Link copied!"); }
};

document.getElementById('study-date').onchange = (e) => renderStudy(e.target.value);
document.getElementById('theme-toggle').onchange = (e) => {
    document.documentElement.setAttribute('data-theme', e.target.checked ? 'dark' : 'light');
};