import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 1. YOUR FIREBASE CONFIG
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

// Global state
const ADMIN_CODE = "Grace2026"; 
let allStudiesRawData = {}; 
let currentStudyId = null;

// --- 2. ADMIN & MODAL LOGIC ---

// Explicitly attach to window so HTML button can find it
window.openAdmin = () => {
    const code = prompt("Enter Admin Code:");
    if (code === ADMIN_CODE) {
        document.body.classList.add('show-admin');
        alert("Admin Mode Active.");
    } else if (code !== null) {
        alert("Incorrect code.");
    }
};

window.openNewStudyModal = () => {
    currentStudyId = null; 
    document.getElementById('modalTitle').innerText = "Add New Study";
    // Clear all inputs in the modal
    document.querySelectorAll('.modal-content input, .modal-content textarea').forEach(i => i.value = "");
    document.getElementById('adminModal').style.display = 'block';
};

document.getElementById('editStudyBtn').onclick = () => {
    if (!currentStudyId) return alert("No study selected to edit.");
    const s = allStudiesRawData[currentStudyId];
    document.getElementById('modalTitle').innerText = "Edit Study";
    document.getElementById('newDate').value = s.date;
    document.getElementById('newPassage').value = s.passage;
    document.getElementById('newVideoUrl').value = s.videoUrl || '';
    document.getElementById('newActivity').value = s.activity;
    document.getElementById('newLyrics').value = s.lyrics;
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

    if (!studyData.date) return alert("Date is required.");

    const targetRef = currentStudyId ? ref(db, `studies/${currentStudyId}`) : push(studiesRef);
    await set(targetRef, studyData);
    document.getElementById('adminModal').style.display = 'none';
};

document.getElementById('deleteStudyBtn').onclick = async () => {
    if(confirm("Delete this entire week's study?")) {
        await set(ref(db, `studies/${currentStudyId}`), null);
        document.getElementById('adminModal').style.display = 'none';
        location.reload(); 
    }
};

// --- 3. STUDY SYNC & RENDER ---

onValue(studiesRef, (snap) => {
    const data = snap.val();
    const select = document.getElementById('study-date');
    if (data) {
        allStudiesRawData = data;
        const sortedEntries = Object.entries(data).sort((a,b) => new Date