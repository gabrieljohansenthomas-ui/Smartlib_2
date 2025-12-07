# Sistem Perpustakaan Digital SMK Negeri 3 Manado

Aplikasi web modern untuk manajemen perpustakaan menggunakan Firebase.

## Setup dan Deployment

### 1. Persiapan Firebase
- Buat proyek di [Firebase Console](https://console.firebase.google.com/).
- Enable Authentication (Email/Password), Firestore, Functions, Hosting.
- Buat Firestore DB (mode production).
- Download `serviceAccountKey.json` untuk seed (Project Settings > Service accounts).
- Set rules di `firestore.rules` dan deploy.

### 2. Konfigurasi Environment
- Untuk email: `firebase functions:config:set smtp.host="your-smtp-host" smtp.user="your-email" smtp.pass="your-pass"` (atau SendGrid API key).
- Ganti placeholder di `firebase-config.js` dengan config dari Firebase Console.

### 3. Install Dependencies
- `npm install -g firebase-tools`
- Di `functions/`: `npm install`
- Di `seed/`: `npm install firebase-admin`

### 4. Seed Data
- Jalankan `node seed/seed.js` setelah setup Firebase.

### 5. Local Testing
- `firebase emulators:start --only auth,firestore,functions,hosting`
- Buka http://localhost:5000

### 6. Deploy
- `firebase deploy --only functions,firestore,hosting`

### 7. Scheduled Functions
- Functions otomatis deploy dengan pubsub.schedule().

### Catatan Keamanan
- Jangan commit keys; gunakan .env atau functions:config.
- CSRF mitigated by Firebase Auth; XSS by DOMPurify; Injection by prepared queries.

## Modifikasi
- TODO: Ubah warna di style.css, tambahkan fitur di JS.
- Initial admin: Set manual di Firebase Console atau via seed.