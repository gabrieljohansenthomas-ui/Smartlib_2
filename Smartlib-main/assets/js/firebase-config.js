/**
 * firebase-config.js (compat)
 * Initialize Firebase using compat SDK so the app can run without bundler.
 *
 * IMPORTANT:
 * - Replace the placeholder values below with your Firebase project settings.
 * - Do NOT commit real API keys to public repositories.
 *
 * How to get config:
 * - Firebase Console -> Project Settings -> SDK setup and configuration -> Firebase SDK snippet
 */

// TODO: replace values with your Firebase project's config
const firebaseConfig = {
    apiKey: "AIzaSyAF_-NLJRCn-pDrfwsKM1JL3oBvJ176iGU",
    authDomain: "smartlib-0710.firebaseapp.com",
    projectId: "smartlib-0710",
    storageBucket: "smartlib-0710.firebasestorage.app",
    messagingSenderId: "668732924028",
    appId: "1:668732924028:web:a6d0043a4a123d084729f9",
    measurementId: "G-L1QJMKC1YF"
  };

// Initialize Firebase app (compat)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Expose frequently-used services globally to other scripts
window.firebaseApp = firebase.app();
window.firebaseAuth = firebase.auth();
window.firebaseDb = firebase.firestore();
window.firebaseFunctions = firebase.functions();

// Note: for local emulator testing, run these commands in console (example):
// firebase.firestore().useEmulator("localhost", 8080);
// firebase.auth().useEmulator("http://localhost:9099/");
// firebase.functions().useEmulator("localhost", 5001);
