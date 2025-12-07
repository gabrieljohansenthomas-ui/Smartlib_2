# Sistem Perpustakaan Digital SMK Negeri 3 Manado

Aplikasi web perpustakaan digital dengan frontend modern (HTML/CSS/JS + Tailwind) dan backend Firebase (Auth, Firestore, Functions).

## Fitur Utama
- Autentikasi role-based (admin/member).
- Katalog buku dengan pencarian, filter, dan detail.
- Manajemen buku/admin/anggota (admin-only).
- Peminjaman & pengembalian otomatis.
- Review & rating.
- Notifikasi email otomatis.
- Statistik dengan Chart.js.
- Backup terjadwal.

## Setup & Deploy

### 1. Persiapan
- Buat proyek Firebase di [Firebase Console](https://console.firebase.google.com/).
- Enable Authentication (Email/Password), Firestore, Functions, Hosting.
- Download service account key untuk seed (Project Settings > Service accounts).
- Buat akun SendGrid dan dapatkan API key.

### 2. Konfigurasi
- Ganti `FIREBASE_CONFIG_HERE` di `assets/js/firebase-config.js` dengan config dari Firebase Console.
- Set env untuk functions: `firebase functions:config:set sendgrid.key "YOUR_SENDGRID_KEY" smtp.user "your-email" smtp.pass "your-pass"`.
- Upload firestore.rules dan firebase.json.

### 3. Install & Run Lokal
- Install Firebase CLI: `npm install -g firebase-tools`.
- Login: `firebase login`.
- Init proyek: `firebase use --add` (pilih proyek).
- Install dependencies: `cd functions && npm install`.
- Import seed: `cd seed && node seed.js` (setelah ganti placeholder).
- Run emulators: `firebase emulators:start`.
- Akses di http://localhost:5000.

### 4. Deploy
- Deploy functions: `firebase deploy --only functions`.
- Deploy hosting: `firebase deploy --only hosting`.
- Deploy firestore: `firebase deploy --only firestore`.

### 5. Initial Admin
- Daftar sebagai member, lalu update role ke "admin" di Firestore Console.

### 6. Branding & Modifikasi
- Ubah warna di Tailwind classes (e.g., `bg-blue-600` ke custom).
- TODO: Tambah field subscribe di users untuk notifikasi buku baru.

## Keamanan
- Sanitasi XSS dengan DOMPurify.
- Firestore rules mencegah unauthorized access.
- Validasi client/server-side.
- CSRF mitigated by Firebase Auth + HTTPS.

## Perintah Shell untuk ZIP
zip -r perpus-smkn3manado.zip perpus-smkn3manado-frontend functions firebase.json firestore.rules

## Catatan
- Kode mudah dimodifikasi; lihat komentar TODO.
- Jika error, periksa logs: `firebase functions:log`.
- UI responsif, accessible dengan semantic HTML.
