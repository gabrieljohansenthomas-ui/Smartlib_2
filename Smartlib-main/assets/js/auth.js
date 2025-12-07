import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Register: Default role "member", buat dokumen di users collection
export async function registerUser(displayName, email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    await setDoc(doc(db, 'users', uid), {
      displayName,
      email,
      role: 'member', // Default
      active: true,
      joinedAt: new Date()
    });
    window.location.href = 'dashboard.html';
  } catch (error) {
    document.getElementById('errorMsg').textContent = error.message;
  }
}

// Login: Cek active status
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists() || !userDoc.data().active) {
      await signOut(auth);
      throw new Error('Akun tidak aktif.');
    }
    window.location.href = 'dashboard.html';
  } catch (error) {
    document.getElementById('errorMsg').textContent = error.message;
  }
}

// Logout
export function logout() {
  signOut(auth).then(() => window.location.href = 'login.html');
}

// Role-based guard
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const role = userDoc.data()?.role;
    if (window.location.pathname.includes('/admin/') && role !== 'admin') {
      window.location.href = 'dashboard.html';
    }
    // Tampilkan dashboard sesuai role
    if (role === 'admin') {
      document.getElementById('adminDashboard').classList.remove('hidden');
    } else {
      document.getElementById('memberDashboard').classList.remove('hidden');
    }
  } else if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html')) {
    window.location.href = 'login.html';
  }
});

// Event listeners untuk form
document.getElementById('registerForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const displayName = document.getElementById('displayName').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  registerUser(displayName, email, password);
});

document.getElementById('loginForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  loginUser(email, password);
});

document.getElementById('logoutBtn')?.addEventListener('click', logout);
