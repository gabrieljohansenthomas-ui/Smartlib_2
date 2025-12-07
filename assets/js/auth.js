import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Role-based routing dan guard
export async function checkAuthAndRole() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().active) {
                const role = userDoc.data().role;
                if (role === 'admin' && window.location.pathname.includes('admin')) {
                    // OK
                } else if (role === 'member' && !window.location.pathname.includes('admin')) {
                    // OK
                } else {
                    window.location.href = 'dashboard.html'; // Redirect
                }
            } else {
                signOut(auth); // Non-aktif
            }
        } else {
            window.location.href = 'login.html';
        }
    });
}

// Register: Default role member, validasi input
export async function registerUser(displayName, email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            displayName: displayName.trim(),
            email,
            role: 'member',
            active: true,
            joinedAt: new Date()
        });
        window.location.href = 'dashboard.html';
    } catch (error) {
        document.getElementById('errorMsg').textContent = error.message;
        document.getElementById('errorMsg').classList.remove('hidden');
    }
}

// Login
export async function loginUser(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = 'dashboard.html';
    } catch (error) {
        document.getElementById('errorMsg').textContent = error.message;
        document.getElementById('errorMsg').classList.remove('hidden');
    }
}

// Logout
export function logout() {
    signOut(auth).then(() => window.location.href = 'login.html');
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('registerForm')) {
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const displayName = document.getElementById('displayName').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            if (displayName.length > 50) return alert('Nama terlalu panjang');
            registerUser(displayName, email, password);
        });
    }
    if (document.getElementById('loginForm')) {
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            loginUser(email, password);
        });
    }
    if (document.getElementById('logoutBtn')) {
        document.getElementById('logoutBtn').addEventListener('click', logout);
    }
    checkAuthAndRole(); // Jalankan di setiap halaman
});