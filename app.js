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

document.addEventListener('DOMContentLoaded', () => {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    const studiesRef = ref(db, 'studies'), prayersRef = ref(db, 'prayers'), mealsRef = ref(db, 'meals'), learnsRef = ref(db, 'learnings');

    const ADMIN_CODE = "Grace2026";
    let allStudiesRawData = {}, allPrayersData = null, allMealsData = {}, allLearnsData = null;
    let myId = localStorage.getItem('lsg_user_id') || ('user_' + Math.random().toString(36).substr(2, 9));
    localStorage.setItem('lsg_user_id', myId);

    function getBibleLink(ref) { return `https://www.bible.com/search/bible?q=${encodeURIComponent(ref.trim())}`; }

    // --- NAVIGATION ---
    window.setPage = (page) => {
        document.querySelectorAll('.page-view').forEach(p => p.style.display = 'none');
        const active = document.getElementById(`view-${page}`);
        if (active) active.style.display = 'block';

        document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
        const activeBtn = document.getElementById(`nav-${page}`);
        if (activeBtn) activeBtn.classList.add('active');
        
        window.scrollTo(0,0);
    };

    window.toggleExtra = (t) => {
        const el = document.getElementById(`${t.toLowerCase()}InputArea`);
        if (el) el.style.display = document.getElementById(`check${t}`).checked ? 'block' : 'none';
    };

    // --- ADMIN ACCESS ---
    window.openAdmin = () => {
        const code = prompt("Enter Code:");
        if (code === ADMIN_CODE) {
            document.body.classList.add('show-admin');
            renderPrayers(); renderLearnings(); renderMeals();
            alert("Admin Active");
        }
    };

    // --- DATA HANDLING ---
    onValue(learnsRef, snap => { allLearnsData = snap.val(); renderLearnings(); });
    function renderLearnings() {
        const list = document.getElementById('learning-list');
        if(!allLearnsData) { list.innerHTML = "<p>No insights shared yet.</p>"; return; }
        const all = Object.entries(allLearnsData).map(([id, val]) => ({ id, ...val })).sort((a,b) => b.timestamp - a.timestamp);
        list.innerHTML = all.map(l => {
            const canEdit = document.body.classList.contains('show-admin') || l.ownerId === myId;
            return `<div class="feed-card">
                ${canEdit ? `<button class="delete-btn" onclick="window.deleteItem('learnings','${l.id}')">Delete</button>` : ''}
                <strong>${l.name}</strong><h3 style="margin:5px 0;">${l.title}</h3>
                <span class="timestamp">Shared: ${new Date(l.timestamp).toLocaleString()}</span>
                ${l.scrip ? `<a href="${getBibleLink(l.scrip)}" target="_blank" class="item-link">📖 ${l.scrip}</a>` : ''}
                ${l.url ? `<a href="${l.url}" target="_blank" class="item-link">🔗 Link</a>` : ''}
                <div class="notes-content">${l.notes}</div>
                <div class="prayer-actions"><button class="celeb-btn" onclick="window.incrementTally('learnings','${l.id}','celebs')">✨</button> ${l.celebs || 0}</div>
            </div>`;
        }).join('');
    }

    onValue(prayersRef, snap => { allPrayersData = snap.val(); renderPrayers(); });
    function renderPrayers() {
        const list = document.getElementById('prayer-list');
        if(!allPrayersData) { list.innerHTML = "<p>No prayers yet.</p>"; return; }
        const isAdmin = document.body.classList.contains('show-admin');
        const sorted = Object.entries(allPrayersData).map(([id, val]) => ({ id, ...val })).sort((a,b) => b.timestamp - a.timestamp);
        list.innerHTML = sorted.map(p => {
            const canEdit = isAdmin || p.ownerId === myId;
            return `<div class="feed-card status-${p.status || 'active'}">
                ${canEdit ? `<div style="float:right;"><button onclick="window.updateStatus('${p.id}','praise')">🙌</button><button onclick="window.deleteItem('prayers','${p.id}')">🗑️</button></div>` : ''}
                <strong>${p.name}</strong><p>${p.request}</p>
                <div class="prayer-actions"><button class="prayed-btn" onclick="window.incrementTally('prayers','${p.id}','tally')">I Prayed!</button> 🙏 ${p.tally || 0}</div>
            </div>`;
        }).join('');
    }

    onValue(studiesRef, snap => {
        allStudiesRawData = snap.val() || {};
        const sorted = Object.entries(allStudiesRawData).sort((a,b) => new Date(b[1].date) - new Date(a[1].date));
        const sel = document.getElementById('study-date');
        if (sel && sorted.length > 0) {
            sel.innerHTML = sorted.map(([id, s]) => `<option value="${s.date}">${s.date}</option>`).join('');
            renderStudy(sel.value);
        }
    });

    function renderStudy(date) {
        const s = Object.values(allStudiesRawData).find(x => x.date === date);
        if(!s) return;
        document.getElementById('passage-text').innerHTML = (s.passage || "").split('\n').map(p => `<p class="scripture">${p}</p><a href="${getBibleLink(p)}" target="_blank" style="font-size:0.7rem;">Open Bible</a>`).join('');
        document.getElementById('activity-desc').innerText = s.activity || '';
        document.getElementById('lyrics-container').innerText = s.lyrics || '';
    }

    onValue(mealsRef, snap => { allMealsData = snap.val() || {}; renderMeals(); });
    function renderMeals() {
        const list = document.getElementById('meal-list'); if (!list) return;
        let d = new Date(); d.setDate(d.getDate() + (3 - d.getDay() + 7) % 7);
        const weds = []; for(let i=0; i<4; i++) { weds.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`); d.setDate(d.getDate()+7); }
        list.innerHTML = weds.map(date => {
            const claim = allMealsData[date];
            if(claim) return `<div class="meal-slot"><strong>${date}</strong>: ${claim.name} (${claim.dish})</div>`;
            return `<div class="meal-slot"><strong>${date}</strong>: <button class="ui-btn" onclick="window.pClaim('${date}')">Sign Up</button></div>`;
        }).join('');
    }

    // --- ACTIONS ---
    window.postLearning = async () => {
        const title = document.getElementById('learnTitle').value, notes = document.getElementById('learnNotes').value;
        if(!title || !notes) return;
        await set(push(learnsRef), { name: document.getElementById('learnName').value || "Friend", title, notes, timestamp: Date.now(), ownerId: myId, scrip: document.getElementById('checkScrip').checked ? document.getElementById('learnScrip').value : null, url: document.getElementById('checkUrl').checked ? document.getElementById('learnUrl').value : null });
    };

    window.postPrayer = async () => {
        const txt = document.getElementById('prayerText').value; if(!txt) return;
        await set(push(prayersRef), { name: document.getElementById('prayerName').value || "Friend", request: txt, timestamp: Date.now(), ownerId: myId, status: "active" });
    };

    window.updateStatus = async (id, s) => await set(ref(db, `prayers/${id}/status`), s);
    window.deleteItem = async (p, id) => { if(confirm("Delete?")) await set(ref(db, `${p}/${id}`), null); };
    window.incrementTally = async (p, id, f) => {
        const d = p === 'prayers' ? allPrayersData : allLearnsData;
        if(d && d[id]) await set(ref(db, `${p}/${id}/${f}`), (d[id][f] || 0) + 1);
    };

    window.openNewStudyModal = () => { document.getElementById('adminModal').style.display='block'; };
    
    const editBtn = document.getElementById('editStudyBtn');
    if(editBtn) {
        editBtn.onclick = () => {
            const selDate = document.getElementById('study-date').value;
            const s = Object.values(allStudiesRawData).find(x => x.date === selDate);
            if(s) {
                document.getElementById('newDate').value = s.date;
                document.getElementById('newPassage').value = s.passage;
                document.getElementById('newActivity').value = s.activity;
                document.getElementById('newLyrics').value = s.lyrics;
                document.getElementById('adminModal').style.display = 'block';
            }
        };
    }

    document.getElementById('saveStudyBtn').onclick = async () => {
        const date = document.getElementById('newDate').value;
        await set(ref(db, `studies/${date.replace(/-/g, '')}`), { date, passage: document.getElementById('newPassage').value, activity: document.getElementById('newActivity').value, lyrics: document.getElementById('newLyrics').value });
        document.getElementById('adminModal').style.display='none';
    };

    document.getElementById('study-date').onchange = (e) => renderStudy(e.target.value);
    document.getElementById('theme-toggle').onchange = (e) => document.documentElement.setAttribute('data-theme', e.target.checked ? 'dark' : 'light');

    window.setPage('studies');
});