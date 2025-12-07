// Inisialisasi Firebase dengan placeholder config
// TODO: Ganti FIREBASE_CONFIG_HERE dengan config dari Firebase Console (Project Settings > General > Your apps > Web app config)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { getFunctions } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-functions.js';

const firebaseConfig = {
    apiKey: "AIzaSyAF_-NLJRCn-pDrfwsKM1JL3oBvJ176iGU",
    authDomain: "smartlib-0710.firebaseapp.com",
    projectId: "smartlib-0710",
    storageBucket: "smartlib-0710.firebasestorage.app",
    messagingSenderId: "668732924028",
    appId: "1:668732924028:web:a6d0043a4a123d084729f9",
    measurementId: "G-L1QJMKC1YF"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
