/**
 * Firebase Configuration
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project (e.g., "error-highlighting-study")
 * 3. Go to Project Settings → General → Your apps → Web app
 * 4. Register a web app and copy the config object below
 * 5. Go to Firestore Database → Create database → Start in test mode
 * 6. Replace the placeholder values below with your actual config
 */


const firebaseConfig = {
  apiKey: "AIzaSyALFj4JDIXrBAL8MuNzImRdzsd7pw5qo0A",
  authDomain: "error-highlighting-study.firebaseapp.com",
  projectId: "error-highlighting-study",
  storageBucket: "error-highlighting-study.firebasestorage.app",
  messagingSenderId: "1075199296528",
  appId: "1:1075199296528:web:2d4e451b910a2fa3d5f695",
  measurementId: "G-DXE416DPB8"
};


// Initialize Firebase
let db = null;
let firebaseInitialized = false;

function initFirebase() {
  try {
    if (firebaseConfig.apiKey === "YOUR_API_KEY") {
      console.warn(
        "Firebase not configured. Data will be saved locally only. " +
        "See js/firebase-config.js for setup instructions."
      );
      return false;
    }
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    firebaseInitialized = true;
    console.log("Firebase initialized successfully.");
    return true;
  } catch (e) {
    console.error("Firebase initialization failed:", e);
    return false;
  }
}

/**
 * Save participant data to Firestore
 */
async function saveToFirebase(participantId, data) {
  if (!firebaseInitialized) {
    console.warn("Firebase not initialized. Saving locally.");
    saveLocally(participantId, data);
    return;
  }
  try {
    await db.collection("participants").doc(participantId).set(data, { merge: true });
    console.log("Data saved to Firebase for participant:", participantId);
  } catch (e) {
    console.error("Firebase save failed, falling back to local:", e);
    saveLocally(participantId, data);
  }
}

/**
 * Save data locally as a fallback
 */
function saveLocally(participantId, data) {
  const key = `study_data_${participantId}`;
  const existing = JSON.parse(localStorage.getItem(key) || "{}");
  const merged = { ...existing, ...data };
  localStorage.setItem(key, JSON.stringify(merged));
}

/**
 * Download all local data as JSON (for fallback recovery)
 */
function downloadLocalData() {
  const allData = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith("study_data_")) {
      allData[key] = JSON.parse(localStorage.getItem(key));
    }
  }
  const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `study_data_export_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
