import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// REPLACE THIS WITH YOUR FIREBASE CONFIG FROM GOOGLE CONSOLE
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
let allStudiesRawData = {}; // Stores ID-mapped data for editing
let currentStudyId = null;

// --- INITIALIZE & SYNC ---

onValue(studiesRef, (snap) => {
    const data = snap.val();
    if (data) {
        allStudiesRawData = data;
        const select = document.getElementById('study-date');
        
        // Sort dates: Newest first
        const sortedDates = Object.values(data).sort((a,b) => new Date(b.date) - new Date(a.date));
        
        select.innerHTML = sortedDates.map(s => `<option value="${s.date}">${new Date(s.date).toDateString()}</option>`).join('');
        renderStudy(sortedDates[0].date);
    }
});

// --- RENDER STUDY (With Multiple Passages) ---

function renderStudy(date) {
    // Find the study entry by date to get its unique ID
    const entry = Object.entries(allStudiesRawData).find(([id, s]) => s.date === date);
    if (!entry) return;

    const [id, s] = entry;
    currentStudyId = id; // Update global ID for Edit/Delete

    // 1. Handle Multiple Passages
    const passageContainer = document.getElementById('passage-text');
    const passageArray = s.passage.split('\n').filter(p => p.trim() !== "");
    
    passageContainer.innerHTML = passageArray.map(p => `
        <div class="