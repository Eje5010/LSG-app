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

    // --- NUCLEAR NAVIGATION LOCK ---
    window.setPage = (page) => {
        document.querySelectorAll('.page-view').forEach(p => p.style.display = 'none');
        const active = document.getElementById(`view-${page}`);
        if (active) active.style.display = 'block';

        // Check Admin visibility context
        const isAdmin = document.body.classList.contains('show-admin');
        const adminCtrl = document.getElementById('admin-study-ctrl');
        const userCtrl = document.getElementById('user-study-selector');

        if (adminCtrl) {
            if (page === 'studies' && isAdmin) {
                adminCtrl.style.setProperty('display', 'block', 'important');
                if(userCtrl) userCtrl.style.display = 'none';
            } else {
                adminCtrl.style.setProperty('display', 'none', 'important');
                if(userCtrl) userCtrl.style.display = 'block';
            }
        }

        document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
        const btn = document.getElementById(`nav-${page}`);
        if (btn) btn.classList.add('active');
        window.scrollTo(0,0);
    };

    window.toggleExtra = (t) => {
        const el = document.getElementById(`${t.toLowerCase()}InputArea`);
        if (el) el.style.display = document.getElementById(`check${t}`).checked ? 'block' : 'none';
    };

    // --- DATA LISTENERS ---
    onValue(learnsRef, snap => { 
        allLearnsData = snap.val(); 
        const list = document.getElementById('learning-list');
        if(!allLearnsData) { list.innerHTML = "<p>No insights yet.</p>"; return; }
        const all = Object.entries(allLearnsData).map(([id, val]) => ({ id, ...val })).sort((a,b) => b.timestamp - a.timestamp);
        list.innerHTML = all.map(l => {
            const canEdit = document.body.classList.contains('show-admin') || l.ownerId === myId;
            return `<div class="feed-card">${canEdit ? `<button class="delete-btn" onclick="window.deleteItem('learnings','${l.id}')">Delete</button>` : ''}<strong>${l.name}</strong><h3 style="margin:5px 0;">${l.title}</h3><span class="timestamp">Shared: ${new Date(l.timestamp).toLocaleDateString()}</span>${l.scrip ? `<a href="${getBibleLink(l.scrip)}" target="_blank" class="item-link">📖 ${l.scrip}</a>` : ''}${l.url ? `<a href="${l.url}" target="_blank" class="item-link">🔗 Link</a>` : ''}<div class="editable-note">${l.notes}</div><div class="prayer-actions"><button class="celeb-btn" onclick="window.incrementTally('learnings','${l.id}','celebs')">✨</button> ${l.celebs || 0}</div></div>`;
        }).join('');
    });

    onValue(prayersRef, snap => {
        allPrayersData = snap.val();
        const list = document.getElementById('prayer-list');
        if(!allPrayersData) { list.innerHTML = "<p>No prayers yet.</p>"; return; }
        const sorted = Object.entries(allPrayersData).map(([id, val]) => ({ id, ...val })).sort((a,b) => {
            const order = { active: 1, praise: 2, archive: 3 };
            return (order[a.status] || 1) - (order[b.status] || 1) || b.timestamp - a.timestamp;
        });
        list.innerHTML = sorted.map(p => {
            const canEdit = document.body.classList.contains('show-admin') || p.ownerId === myId;
            const isPraise = p.status === 'praise';
            return `<div class="feed-card status-${p.status || 'active'}">
                ${canEdit ? `<div style="float:right; display:flex; gap:5px;">
                    <button onclick="window.updateStatus('${p.id}','active')">📍</button>
                    <button onclick="window.updateStatus('${p.id}','praise')">🙌</button>
                    <button onclick="window.updateStatus('${p.id}','archive')">📦</button>
                    <button class="delete-btn" onclick="window.deleteItem('prayers','${p.id}')">🗑️</button>
                </div>` : ''}
                <strong>${p.name}${isPraise ? ' — Praise! 🙌' : ''}</strong><p>${p.request}</p>
                ${p.status !== 'archive' ? `<div class="prayer-actions"><button class="prayed-btn" onclick="window.incrementTally('prayers','${p.id}','tally')">${isPraise ? 'Amen!' : 'I Prayed!'}</button> 🙏 ${p.tally || 0}</div>` : ''}
            </div>`;
        }).join('');
    });

    onValue(studiesRef, snap => {
        allStudiesRawData = snap.val() || {};
        const sorted = Object.entries(allStudiesRawData)
            .filter(([id, s]) => s && s.date)
            .sort((a,b) => new Date(b[1].date.replace(/-/g, '/')) - new Date(a[1].date.replace(/-/g, '/')));
        
        const adminSel = document.getElementById('study-date');
        const userSel = document.getElementById('user-study-date');
        
        const renderMenu = (sel) => {
            if (sel && sorted.length > 0) {
                sel.innerHTML = sorted.map(([id, s]) => `<option value="${s.date}">${new Date(s.date.replace(/-/g, '/')).toDateString()}</option>`).join('');
                const todayStr = new Date().toISOString().split('T')[0];
                const best = sorted.find(([id, s]) => s.date >= todayStr) || sorted[0];
                sel.value = best[1].date;
                renderStudy(sel.value);
            }
        };
        renderMenu(adminSel);
        renderMenu(userSel);
    });

    onValue(mealsRef, snap => { 
        allMealsData = snap.val() || {}; 
        renderMeals();
        const curDate = document.getElementById('user-study-date')?.value || document.getElementById('study-date')?.value;
        if(curDate) renderStudy(curDate);
    });

    window.handleStudyChange = (val) => {
        document.getElementById('study-date').value = val;
        document.getElementById('user-study-date').value = val;
        renderStudy(val);
    };

    function renderStudy(date) {
        const s = Object.values(allStudiesRawData).find(x => x.date === date);
        if(!s) return;
        document.getElementById('passage-text').innerHTML = (s.passage || "").split('\n').map(p => `<p class="scripture">${p}</p><a href="${getBibleLink(p)}" target="_blank" style="font-size:0.7rem; color:var(--btn);">Open Bible</a>`).join('');
        document.getElementById('activity-desc').innerText = s.activity || '';
        document.getElementById('lyrics-container').innerText = s.lyrics || '';
        const meal = allMealsData[date], mc = document.getElementById('study-meal-card'), mi = document.getElementById('study-meal-info');
        if(meal) { mc.style.display = 'block'; mi.innerHTML = `<p><strong>${meal.name}</strong> is bringing <strong>${meal.dish}</strong>!</p>`; }
        else { mc.style.display = 'none'; }
    }

    function renderMeals() {
        const list = document.getElementById('meal-list'); if (!list) return;
        let d = new Date(); d.setDate(d.getDate() + (3 - d.getDay() + 7) % 7);
        const weds = []; for(let i=0; i<4; i++) { weds.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`); d.setDate(d.getDate()+7); }
        list.innerHTML = weds.map(date => {
            const claim = allMealsData[date];
            const isAdmin = document.body.classList.contains('show-admin');
            if(claim) return `<div class="meal-slot"><strong>${date}</strong>: ${claim.name} (${claim.dish}) ${(isAdmin || claim.ownerId === myId) ? `<button class='delete-btn' onclick="window.deleteItem('meals','${date}')">🗑️</button>` : ''}</div>`;
            return `<div class="meal-slot"><strong>${date}</strong>: <button class="ui-btn" onclick="window.pClaim('${date}')">Sign Up</button></div>`;
        }).join('');
    }

    // --- ACTIONS ---
    window.postLearning = () => {
        const title = document.getElementById('learnTitle').value, notes = document.getElementById('learnNotes').value;
        if(!title || !notes) return;
        set(push(learnsRef), { name: document.getElementById('learnName').value || "Friend", title, notes, timestamp: Date.now(), ownerId: myId, scrip: document.getElementById('checkScrip').checked ? document.getElementById('learnScrip').value : null, url: document.getElementById('checkUrl').checked ? document.getElementById('learnUrl').value : null });
        ['learnTitle','learnNotes','learnScrip','learnUrl'].forEach(id => document.getElementById(id).value = "");
    };

    window.postPrayer = () => {
        const txt = document.getElementById('prayerText').value; if(!txt) return;
        set(push(prayersRef), { name: document.getElementById('prayerName').value || "Friend", request: txt, timestamp: Date.now(), ownerId: myId, status: "active" });
        document.getElementById('prayerText').value = "";
    };

    window.updateStatus = (id, s) => set(ref(db, `prayers/${id}/status`), s);
    window.deleteItem = (p, id) => { if(confirm("Delete?")) set(ref(db, p === 'meals' ? `meals/${id}` : `${p}/${id}`), null); };
    window.incrementTally = (p, id, f) => {
        const d = p === 'prayers' ? allPrayersData : allLearnsData;
        if(d && d[id]) set(ref(db, `${p}/${id}/${f}`), (d[id][f] || 0) + 1);
    };
    window.pClaim = (date) => {
        const name = prompt("Your Name:"); if(!name) return;
        const dish = prompt("What are you bringing?"); if(!dish) return;
        set(ref(db, `meals/${date}`), { name, dish, ownerId: myId });
    };

    window.signOutAdmin = () => {
        document.body.classList.remove('show-admin');
        document.getElementById('signOutBtn').style.display = 'none';
        document.getElementById('adminBtn').style.display = 'block';
        window.setPage('studies');
    };

    window.openAdmin = () => {
        if(prompt("Code:") === ADMIN_CODE) {
            document.body.classList.add('show-admin');
            document.getElementById('signOutBtn').style.display = 'block';
            document.getElementById('adminBtn').style.display = 'none';
            window.setPage('studies');
        }
    };

    window.openNewStudyModal = () => { document.getElementById('adminModal').style.display='block'; };
    
    document.getElementById('editStudyBtn').onclick = () => {
        const s = Object.values(allStudiesRawData).find(x => x.date === document.getElementById('study-date').value);
        if(s) {
            document.getElementById('newDate').value = s.date;
            document.getElementById('newPassage').value = s.passage;
            document.getElementById('newActivity').value = s.activity;
            document.getElementById('newLyrics').value = s.lyrics;
            document.getElementById('adminModal').style.display = 'block';
        }
    };

    document.getElementById('saveStudyBtn').onclick = () => {
        const date = document.getElementById('newDate').value;
        set(ref(db, `studies/${date.replace(/-/g, '')}`), { date, passage: document.getElementById('newPassage').value, activity: document.getElementById('newActivity').value, lyrics: document.getElementById('newLyrics').value });
        document.getElementById('adminModal').style.display='none';
    };

    document.getElementById('theme-toggle').onchange = (e) => document.documentElement.setAttribute('data-theme', e.target.checked ? 'dark' : 'light');
    window.setPage('studies');
});