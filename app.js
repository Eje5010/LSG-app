import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 1. YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const studiesRef = ref(db, 'studies');
const prayersRef = ref(db, 'prayers');

const ADMIN_CODE = "Grace2026";
let allStudiesRawData = {};
let currentStudyId = null;

// --- 2. ADMIN & MODAL LOGIC ---

window.openAdmin = () => {
    const code = prompt("Enter Admin Code:");
    if (code === ADMIN_CODE) {
        document.body.classList.add('show-admin');
        alert("Admin Mode Active. You can now Edit or Add new studies.");
    } else if (code !== null) {
        alert("Incorrect code.");
    }
};

window.openNewStudyModal = () => {
    currentStudyId = null;
    document.getElementById('modalTitle').innerText = "Add New Study";
    document.querySelectorAll('.modal-content input, .modal-content textarea').forEach(i => i.value = "");
    document.getElementById('adminModal').style.display = 'block';
};

document.getElementById('editStudyBtn').onclick = () => {
    if (!currentStudyId) return;
    const s = allStudiesRawData[currentStudyId];
    document.getElementById('modalTitle').innerText = "Edit Study";
    document.getElementById('newDate').value = s.date || '';
    document.getElementById('newPassage').value = s.passage || '';
    document.getElementById('newVideoUrl').value = s.videoUrl || '';
    document.getElementById('newActivity').value = s.activity || '';
    document.getElementById('newLyrics').value = s.lyrics || '';
    document.getElementById('adminModal').style.display = 'block';
};

document.getElementById('saveStudyBtn').onclick = async () => {
    const studyData = {
        date: document.getElementById('newDate').value,
        passage: document.getElementById('newPassage').value,
        videoUrl: document.getElementById('newVideoUrl').value,
        activity: document.getElementById('newActivity').value,
        lyrics: document.getElementById('newLyrics').value
    };
    if (!studyData.date) {
        alert("Please select a date.");
        return;
    }
    const targetRef = currentStudyId ? ref(db, `studies/${currentStudyId}`) : push(studiesRef);
    await set(targetRef, studyData);
    document.getElementById('adminModal').style.display = 'none';
};

document.getElementById('deleteStudyBtn').onclick = async () => {
    if(confirm("Delete this week's study?")) {
        await set(ref(db, `studies/${currentStudyId}`), null);
        document.getElementById('adminModal').style.display = 'none';
    }
};

// --- 3. SYNC & RENDER LOGIC ---

onValue(studiesRef, (snap) => {
    const data = snap.val();
    const select = document.getElementById('study-date');
    if (data) {
        allStudiesRawData = data;
        const sorted = Object.entries(data).sort((a,b) => new Date(b[1].date) - new Date(a[1].date));
        select.innerHTML = sorted.map(([id, s]) => `<option value="${s.date}">${new Date(s.date).toDateString()}</option>`).join('');
        renderStudy(sorted[0][1].date);
    } else {
        document.getElementById('passage-text').innerHTML = "No studies yet.";
    }
});

function renderStudy(date) {
    const entry = Object.entries(allStudiesRawData).find(([id, s]) => s.date === date);
    if (!entry) return;
    const [id, s] = entry;
    currentStudyId = id;

    const passageArray = (s.passage || "").split('\n').filter(p => p.trim() !== "");
    document.getElementById('passage-text').innerHTML = passageArray.map(p => `
        <div class="passage-group" style="margin-bottom:15px;">
            <p class="scripture">${p}</p>
            <a href="https://www.bible.com/search/bible?q=${encodeURIComponent(p)}" target="_blank" class="bible-link-btn">📖 Open ${p}</a>
        </div>
    `).join('');

    document.getElementById('activity-desc').innerText = s.activity || '';
    document.getElementById('lyrics-container').innerText = s.lyrics || '';
    document.getElementById('video-wrapper').innerHTML = getYouTubeEmbed(s.videoUrl);
}

function getYouTubeEmbed(url) {
    if (!url) return '';
    const reg = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(reg);
    if (match && match[2].length === 11) {
        return `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${match[2]}" frameborder="0" allowfullscreen></iframe>`;
    }
    return '';
}

// --- 4. PRAYER LOGIC ---

window.postPrayer = async () => {
    const name = document.getElementById('prayerName').value;
    const text = document.getElementById('prayerText').value;
    const isAnon = document.getElementById('anonToggle').checked;
    if(!text.trim()) {
        alert("Enter a request.");
        return;
    }
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
    if (!data) {
        list.innerHTML = "No requests yet.";
        return;
    }
    const items = Object.entries(data).map(([id, val]) => ({ id, ...val }));
    list.innerHTML = items.reverse().map(p => `
        <div class="prayer-item">
            <button class="delete-btn" onclick="window.deletePrayer('${p.id}')">Delete</button>
            <strong>${p.name} <small>(${new Date(p.timestamp).toLocaleDateString()})</small></strong>
            <p>${p.request}</p>
        </div>
    `).join('');
});

window.deletePrayer = async (id) => {
    if(confirm("Remove prayer?")) {
        await set(ref(db, `prayers/${id}`), null);
    }
};

// --- 5. UTILS ---

window.shareStudy = async () => {
    const dateSelect = document.getElementById('study-date');
    const date = dateSelect.selectedOptions[0] ? dateSelect.selectedOptions[0].text : "Study";
    const text = `Bible Study: ${date}\n${window.location.href}`;
    if (navigator.share) {
        await navigator.share({ title: 'Bible Study', text: text, url: window.location.href });
    } else {
        navigator.clipboard.writeText(text);
        alert("Link copied!");
    }
};

document.getElementById('study-date').onchange = (e) => renderStudy(e.target.value);

document.getElementById('theme-toggle').onchange = (e) => {
    document.documentElement.setAttribute('data-theme', e.target.checked ? 'dark' : 'light');
};