/**
 * Firebase Initialization File
 * ---------------------------------------
 * Ganti placeholder config di bawah ini
 * dengan Firebase Web App Credentials Anda.
 *
 * Jangan commit API key rahasia (server keys).
 * API Key Firebase frontend bersifat PUBLIC.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const firebaseConfig = {
    apiKey: "AIzaSyAF_-NLJRCn-pDrfwsKM1JL3oBvJ176iGU",
    authDomain: "smartlib-0710.firebaseapp.com",
    projectId: "smartlib-0710",
    storageBucket: "smartlib-0710.firebasestorage.app",
    messagingSenderId: "668732924028",
    appId: "1:668732924028:web:a6d0043a4a123d084729f9",
    measurementId: "G-L1QJMKC1YF"
  };


// Init
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
